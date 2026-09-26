import { createPublicClient, http } from "viem";
import { worldChainSepolia, VaultStatus } from "@/lib/constants";
import { LegacyVaultABI } from "@/lib/contracts/abis";

export function getServerPublicClient() {
  return createPublicClient({
    chain: worldChainSepolia,
    transport: http(
      process.env.NEXT_PUBLIC_WORLD_CHAIN_RPC_URL ||
        "https://worldchain-sepolia.gateway.tenderly.co"
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
