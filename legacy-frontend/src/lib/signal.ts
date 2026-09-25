import { encodePacked, keccak256 } from "viem";

/**
 * Computes the signal hash as defined in WorldIDVerifierAdapter.sol:
 * uint256(keccak256(abi.encodePacked(vault, signalAddress))) >> 8;
 */
export function computeSignalHash(vaultAddress: `0x${string}`, signalAddress: `0x${string}`): bigint {
  const packed = encodePacked(["address", "address"], [vaultAddress, signalAddress]);
  const hash = keccak256(packed);
  const hashBigInt = BigInt(hash);
  return hashBigInt >> BigInt(8);
}

/**
 * Returns hex representation of the signal hash (padded to 32 bytes)
 */
export function computeSignalHashHex(vaultAddress: `0x${string}`, signalAddress: `0x${string}`): `0x${string}` {
  const signalBigInt = computeSignalHash(vaultAddress, signalAddress);
  const hex = signalBigInt.toString(16).padStart(64, "0");
  return `0x${hex}`;
}
