// Passkey liveness: browser WebAuthn ceremonies, and the encoding the vault's
// PasskeyVerifierAdapter expects.
//
// Setup binds a passkey's P-256 public key to a vault; every check-in is a
// fresh WebAuthn assertion over the vault's single-use `livenessChallenge()`.
// The contract verifies it fully on-chain (OpenZeppelin WebAuthn + Monad's
// P-256 precompile), so no server or third party is involved.
//
// Encodings (must match PasskeyVerifierAdapter):
//   registerLiveness: abi.encode(bytes32 qx, bytes32 qy, WebAuthnAuth auth)
//   checkIn:          abi.encode(WebAuthnAuth auth)

import { bytesToHex, encodeAbiParameters, hexToBytes, type Hex } from "viem";

// secp256r1 group order.
const P256_N = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;
const COSE_ALG_ES256 = -7;

/** Mirrors OpenZeppelin's `WebAuthn.WebAuthnAuth` struct, field for field. */
export interface WebAuthnAuth {
  r: Hex;
  s: Hex;
  challengeIndex: bigint;
  typeIndex: bigint;
  authenticatorData: Hex;
  clientDataJSON: string;
}

const webAuthnAuthParam = {
  type: "tuple",
  components: [
    { name: "r", type: "bytes32" },
    { name: "s", type: "bytes32" },
    { name: "challengeIndex", type: "uint256" },
    { name: "typeIndex", type: "uint256" },
    { name: "authenticatorData", type: "bytes" },
    { name: "clientDataJSON", type: "string" },
  ],
} as const;

export interface PasskeyPublicKey {
  qx: Hex;
  qy: Hex;
}

export interface CreatedPasskey extends PasskeyPublicKey {
  /** base64url credential id, used to ask for this exact passkey later. */
  credentialId: string;
}

// ---------------------------------------------------------------------------
// Encoding helpers (pure; unit-tested outside the browser)
// ---------------------------------------------------------------------------

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlDecode(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function toHex32(value: bigint): Hex {
  return `0x${value.toString(16).padStart(64, "0")}`;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  return bytes.length === 0 ? 0n : BigInt(bytesToHex(bytes));
}

/** Parses a DER-encoded ECDSA signature, as returned by WebAuthn, into r and s. */
export function parseDerSignature(der: Uint8Array): { r: bigint; s: bigint } {
  let offset = 0;
  const expect = (byte: number, what: string) => {
    if (der[offset++] !== byte) throw new Error(`Malformed passkey signature (${what})`);
  };
  const readLength = () => {
    const first = der[offset++];
    if (first < 0x80) return first;
    const count = first & 0x7f;
    let length = 0;
    for (let i = 0; i < count; i++) length = (length << 8) | der[offset++];
    return length;
  };
  const readInteger = () => {
    expect(0x02, "integer tag");
    const length = readLength();
    const value = der.slice(offset, offset + length);
    offset += length;
    return bytesToBigInt(value);
  };

  expect(0x30, "sequence tag");
  readLength();
  const r = readInteger();
  const s = readInteger();
  return { r, s };
}

/**
 * Every ECDSA signature has two valid forms, (r, s) and (r, n - s). The
 * contract only accepts the low-s form to rule out malleability, but browsers
 * return either, so this must always be applied.
 */
export function normalizeLowS(s: bigint): bigint {
  return s > P256_N / 2n ? P256_N - s : s;
}

/** Extracts the P-256 point from a SubjectPublicKeyInfo, as returned by `getPublicKey()`. */
export function publicKeyFromSpki(spki: Uint8Array): PasskeyPublicKey {
  // The uncompressed point 0x04 || x || y is the last 65 bytes of a P-256 SPKI.
  const point = spki.slice(spki.length - 65);
  if (point.length !== 65 || point[0] !== 0x04) throw new Error("Passkey public key is not an uncompressed P-256 point");
  return { qx: bytesToHex(point.slice(1, 33)), qy: bytesToHex(point.slice(33, 65)) };
}

// Minimal CBOR decoder: just enough for WebAuthn attestation objects and COSE keys.
type CborValue = number | bigint | Uint8Array | string | CborValue[] | Map<CborValue, CborValue> | boolean | null;

function decodeCbor(data: Uint8Array, start = 0): { value: CborValue; end: number } {
  let offset = start;
  const readUint = (info: number): number => {
    if (info < 24) return info;
    const size = info === 24 ? 1 : info === 25 ? 2 : info === 26 ? 4 : info === 27 ? 8 : -1;
    if (size < 0) throw new Error("Unsupported CBOR length");
    let value = 0;
    for (let i = 0; i < size; i++) value = value * 256 + data[offset++];
    return value;
  };
  const item = (): CborValue => {
    const initial = data[offset++];
    const major = initial >> 5;
    const info = initial & 0x1f;
    switch (major) {
      case 0:
        return readUint(info);
      case 1:
        return -1 - readUint(info);
      case 2: {
        const length = readUint(info);
        const bytes = data.slice(offset, offset + length);
        offset += length;
        return bytes;
      }
      case 3: {
        const length = readUint(info);
        const text = new TextDecoder().decode(data.slice(offset, offset + length));
        offset += length;
        return text;
      }
      case 4: {
        const length = readUint(info);
        const items: CborValue[] = [];
        for (let i = 0; i < length; i++) items.push(item());
        return items;
      }
      case 5: {
        const length = readUint(info);
        const map = new Map<CborValue, CborValue>();
        for (let i = 0; i < length; i++) {
          const key = item();
          map.set(key, item());
        }
        return map;
      }
      case 7:
        if (info === 20) return false;
        if (info === 21) return true;
        if (info === 22) return null;
        throw new Error("Unsupported CBOR simple value");
      default:
        throw new Error("Unsupported CBOR type");
    }
  };
  const value = item();
  return { value, end: offset };
}

/**
 * Reads the public key out of a WebAuthn attestation object. Used when
 * `getPublicKey()` is unavailable, e.g. some password-manager extensions.
 */
export function publicKeyFromAttestationObject(attestationObject: Uint8Array): PasskeyPublicKey {
  const { value } = decodeCbor(attestationObject);
  const authData = value instanceof Map ? value.get("authData") : undefined;
  if (!(authData instanceof Uint8Array)) throw new Error("Attestation object has no authenticator data");

  const flags = authData[32];
  if ((flags & 0x40) === 0) throw new Error("Attestation has no credential data");

  // rpIdHash(32) | flags(1) | signCount(4) | aaguid(16) | credIdLength(2) | credId | COSE key
  const credentialIdLength = (authData[53] << 8) | authData[54];
  const { value: coseKey } = decodeCbor(authData, 55 + credentialIdLength);
  if (!(coseKey instanceof Map)) throw new Error("Malformed passkey public key");

  const algorithm = coseKey.get(3);
  const x = coseKey.get(-2);
  const y = coseKey.get(-3);
  if (algorithm !== COSE_ALG_ES256 || !(x instanceof Uint8Array) || !(y instanceof Uint8Array)) {
    throw new Error("This passkey does not use P-256 (ES256), which the vault requires");
  }
  return { qx: bytesToHex(x), qy: bytesToHex(y) };
}

function indexOfBytes(haystack: Uint8Array, needle: Uint8Array): number {
  outer: for (let i = 0; i + needle.length <= haystack.length; i++) {
    for (let j = 0; j < needle.length; j++) if (haystack[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

/**
 * Turns a raw WebAuthn assertion into the struct the contract verifies.
 * Indices are byte offsets into clientDataJSON, which is how the contract
 * locates the challenge and type without parsing JSON.
 */
export function buildWebAuthnAuth(
  authenticatorData: Uint8Array,
  clientDataJSON: Uint8Array,
  derSignature: Uint8Array
): WebAuthnAuth {
  const encoder = new TextEncoder();
  const typeIndex = indexOfBytes(clientDataJSON, encoder.encode('"type":"webauthn.get"'));
  const challengeIndex = indexOfBytes(clientDataJSON, encoder.encode('"challenge":"'));
  if (typeIndex < 0 || challengeIndex < 0) throw new Error("Unexpected passkey response format");

  const { r, s } = parseDerSignature(derSignature);
  return {
    r: toHex32(r),
    s: toHex32(normalizeLowS(s)),
    challengeIndex: BigInt(challengeIndex),
    typeIndex: BigInt(typeIndex),
    authenticatorData: bytesToHex(authenticatorData),
    clientDataJSON: new TextDecoder().decode(clientDataJSON),
  };
}

export function encodeCheckInProof(auth: WebAuthnAuth): Hex {
  return encodeAbiParameters([webAuthnAuthParam], [auth]);
}

export function encodeRegistrationProof(key: PasskeyPublicKey, auth: WebAuthnAuth): Hex {
  return encodeAbiParameters([{ type: "bytes32" }, { type: "bytes32" }, webAuthnAuthParam], [key.qx, key.qy, auth]);
}

// ---------------------------------------------------------------------------
// Browser ceremonies
// ---------------------------------------------------------------------------

export function isPasskeySupported(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential !== "undefined" && window.isSecureContext;
}

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/** Friendlier messages for the errors WebAuthn actually throws. */
export function describePasskeyError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") return "The passkey prompt was cancelled or timed out. Try again when you're ready.";
    if (err.name === "InvalidStateError") return "This device already has a passkey for this vault.";
    if (err.name === "SecurityError") return "Passkeys need a secure (https) connection.";
    if (err.name === "NotSupportedError") return "This device can't create the kind of passkey Legacy needs (P-256).";
  }
  return err instanceof Error ? err.message : "Passkey request failed.";
}

/** Creates a new passkey. The user is asked for their biometric or device PIN. */
export async function createPasskey(label: string): Promise<CreatedPasskey> {
  const credential = (await navigator.credentials.create({
    publicKey: {
      rp: { name: "Legacy" },
      user: { id: randomBytes(16) as BufferSource, name: label, displayName: label },
      challenge: randomBytes(32) as BufferSource,
      pubKeyCredParams: [{ type: "public-key", alg: COSE_ALG_ES256 }],
      authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
      attestation: "none",
      timeout: 120_000,
    },
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("No passkey was created.");

  const response = credential.response as AuthenticatorAttestationResponse;
  let key: PasskeyPublicKey;
  const spki = typeof response.getPublicKey === "function" ? response.getPublicKey() : null;
  if (spki && response.getPublicKeyAlgorithm?.() === COSE_ALG_ES256) {
    key = publicKeyFromSpki(new Uint8Array(spki));
  } else {
    key = publicKeyFromAttestationObject(new Uint8Array(response.attestationObject));
  }

  return { ...key, credentialId: base64UrlEncode(new Uint8Array(credential.rawId)) };
}

/**
 * Signs a vault challenge with a passkey. With a credential id the browser asks
 * for that exact passkey; without one it lets the user pick.
 */
export async function signChallenge(challenge: Hex, credentialId?: string): Promise<WebAuthnAuth> {
  const credential = (await navigator.credentials.get({
    publicKey: {
      challenge: hexToBytes(challenge) as BufferSource,
      allowCredentials: credentialId
        ? [{ type: "public-key", id: base64UrlDecode(credentialId) as BufferSource }]
        : [],
      userVerification: "required",
      timeout: 120_000,
    },
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("No passkey response.");

  const response = credential.response as AuthenticatorAssertionResponse;
  return buildWebAuthnAuth(
    new Uint8Array(response.authenticatorData),
    new Uint8Array(response.clientDataJSON),
    new Uint8Array(response.signature)
  );
}

// Credential ids are not secret; remembering them lets the browser go
// straight to the right passkey on later check-ins.
const storageKey = (chainId: number, vault: string) => `legacy.passkey.${chainId}.${vault.toLowerCase()}`;

export function rememberCredential(chainId: number, vault: string, credentialId: string) {
  try {
    localStorage.setItem(storageKey(chainId, vault), credentialId);
  } catch {
    // Storage unavailable (private mode); the browser will offer a picker instead.
  }
}

export function recallCredential(chainId: number, vault: string): string | undefined {
  try {
    return localStorage.getItem(storageKey(chainId, vault)) ?? undefined;
  } catch {
    return undefined;
  }
}
