// Isomorphic crypto for the "sealed inheritance message" feature.
//
// Model: the heir derives an X25519 keypair from a deterministic wallet
// signature (personal_sign is RFC-6979 deterministic, so re-signing the same
// message always yields the same key). Only the heir can produce that
// signature, so only the heir can derive the private key and decrypt.
//
// The owner encrypts to the heir's derived PUBLIC key using an ephemeral
// X25519 keypair + XChaCha20-Poly1305 (an anonymous sealed box). The owner
// can write the message but can never read it back.

import { xchacha20poly1305 } from "@noble/ciphers/chacha";
import { x25519 } from "@noble/curves/ed25519";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, hexToBytes, randomBytes, utf8ToBytes } from "@noble/hashes/utils";

export interface SealedBundle {
  /** ephemeral X25519 public key (hex) */
  ephPub: string;
  /** XChaCha20 nonce (hex) */
  nonce: string;
  /** ciphertext incl. Poly1305 tag (hex) */
  ct: string;
}

/**
 * The canonical message the heir signs to derive their key. Deterministic in
 * (vault, heir) so the heir re-derives the same key on every unseal.
 */
export function buildDeriveMessage(vault: string, heir: string): string {
  return [
    "Legacy Protocol — Sealed Inheritance Key",
    `Vault: ${vault.toLowerCase()}`,
    `Heir: ${heir.toLowerCase()}`,
    "",
    "Sign to derive your private decryption key for this vault.",
    "This request is gasless and only proves control of your wallet.",
    "Signing the same request again always yields the same key.",
  ].join("\n");
}

/**
 * The message the owner signs to authenticate a seal. Binds the owner's
 * signature to this exact ciphertext via its digest.
 */
export function buildSealMessage(vault: string, heir: string, digest: string): string {
  return [
    "Legacy Protocol — Seal inheritance message",
    `Vault: ${vault.toLowerCase()}`,
    `Heir: ${heir.toLowerCase()}`,
    `Digest: ${digest}`,
  ].join("\n");
}

function signatureToBytes(signature: string): Uint8Array {
  const h = signature.startsWith("0x") ? signature.slice(2) : signature;
  return hexToBytes(h);
}

/** Derive the 32-byte X25519 private key from a wallet signature. */
export function derivePrivateKey(signature: string): Uint8Array {
  return sha256(signatureToBytes(signature));
}

/** Derive the heir's X25519 public key (hex) from their signature. */
export function publicKeyFromSignature(signature: string): string {
  return bytesToHex(x25519.getPublicKey(derivePrivateKey(signature)));
}

/** Owner-side: encrypt plaintext to the heir's published public key. */
export function sealMessage(plaintext: string, heirPublicKeyHex: string): SealedBundle {
  const heirPub = hexToBytes(heirPublicKeyHex);
  const ephPriv = x25519.utils.randomPrivateKey();
  const ephPub = x25519.getPublicKey(ephPriv);
  const shared = x25519.getSharedSecret(ephPriv, heirPub);
  const key = sha256(shared);
  const nonce = randomBytes(24);
  const ct = xchacha20poly1305(key, nonce).encrypt(utf8ToBytes(plaintext));
  return { ephPub: bytesToHex(ephPub), nonce: bytesToHex(nonce), ct: bytesToHex(ct) };
}

/** Heir-side: decrypt a sealed bundle with the derived private key. */
export function unsealMessage(bundle: SealedBundle, privKey: Uint8Array): string {
  const shared = x25519.getSharedSecret(privKey, hexToBytes(bundle.ephPub));
  const key = sha256(shared);
  const pt = xchacha20poly1305(key, hexToBytes(bundle.nonce)).decrypt(hexToBytes(bundle.ct));
  return new TextDecoder().decode(pt);
}

/** Stable digest of a bundle, used to bind the owner's authenticating signature. */
export function digestBundle(bundle: SealedBundle): string {
  return bytesToHex(sha256(utf8ToBytes(`${bundle.ephPub}.${bundle.nonce}.${bundle.ct}`)));
}
