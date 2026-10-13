import { createPublicClient, http } from "viem";
import { activeChain, VaultStatus, ACTIVE_RPC_URL } from "@/lib/constants";
import { LegacyVaultABI } from "@/lib/contracts/abis";

export function getServerPublicClient() {
  return createPublicClient({
    chain: activeChain,
    transport: http(
      ACTIVE_RPC_URL
    ),
  });
}

export async function readVaultOwner(vault: `0x${string}`): Promise<`0x${string}`> {
  const client = getServerPublicClient();
  return (await client.readContract({
    address: vault,
    abi: LegacyVaultABI,
    functionName: "owner",
  })) as `0x${string}`;
}

export async function readIsHeir(vault: `0x${string}`, heir: `0x${string}`): Promise<boolean> {
  const client = getServerPublicClient();
  return Boolean(
    await client.readContract({
      address: vault,
      abi: LegacyVaultABI,
      functionName: "isHeir",
      args: [heir],
    })
  );
}

/** True once the vault has entered succession (Red). */
export async function readVaultIsInSuccession(vault: `0x${string}`): Promise<boolean> {
  const client = getServerPublicClient();
  const raw = await client.readContract({
    address: vault,
    abi: LegacyVaultABI,
    functionName: "getStatus",
  });
  return Number(raw) === VaultStatus.Red;
}
