import { createPublicClient, http } from "viem";

export const worldChainSepolia = {
  id: 4801,
  name: "World Chain Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_WORLD_CHAIN_RPC_URL ||
          "https://worldchain-sepolia.gateway.tenderly.co",
      ],
    },
  },
};

export const LegacyVaultABI = [
  {
    type: "function",
    name: "lastCheckIn",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "checkInInterval",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "gracePeriod",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "contestableWindow",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getStatus",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getHeirs",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "claimStatus",
    inputs: [{ name: "heir", type: "address" }],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "claimInitiatedAt",
    inputs: [{ name: "heir", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
];

export function getPublicClient() {
  return createPublicClient({
    chain: worldChainSepolia,
    transport: http(
      process.env.NEXT_PUBLIC_WORLD_CHAIN_RPC_URL ||
        "https://worldchain-sepolia.gateway.tenderly.co"
    ),
  });
}

export async function readVaultState(vaultAddress) {
  if (!vaultAddress || !vaultAddress.startsWith("0x") || vaultAddress.length !== 42) {
    console.log(`[Chain] Using mock state for test address: "${vaultAddress}"`);
    return {
      lastCheckIn: Math.floor(Date.now() / 1000),
      checkInInterval: 60,
      gracePeriod: 15,
      contestableWindow: 60,
      status: 0,
    };
  }

  const client = getPublicClient();
  const [lastCheckIn, checkInInterval, gracePeriod, contestableWindow, status] =
    await Promise.all([
      client.readContract({
        address: vaultAddress,
        abi: LegacyVaultABI,
        functionName: "lastCheckIn",
      }),
      client.readContract({
        address: vaultAddress,
        abi: LegacyVaultABI,
        functionName: "checkInInterval",
      }),
      client.readContract({
        address: vaultAddress,
        abi: LegacyVaultABI,
        functionName: "gracePeriod",
      }),
      client.readContract({
        address: vaultAddress,
        abi: LegacyVaultABI,
        functionName: "contestableWindow",
      }),
      client.readContract({
        address: vaultAddress,
        abi: LegacyVaultABI,
        functionName: "getStatus",
      }),
    ]);

  return {
    lastCheckIn: Number(lastCheckIn),
    checkInInterval: Number(checkInInterval),
    gracePeriod: Number(gracePeriod),
    contestableWindow: Number(contestableWindow),
    status: Number(status), // 0=Green, 1=Amber, 2=Red
  };
}

export async function readActiveClaims(vaultAddress) {
  if (!vaultAddress || !vaultAddress.startsWith("0x") || vaultAddress.length !== 42) {
    return [];
  }

  const client = getPublicClient();
  const heirs = await client.readContract({
    address: vaultAddress,
    abi: LegacyVaultABI,
    functionName: "getHeirs",
  });

  if (!heirs || heirs.length === 0) return [];

  const claims = [];
  for (const heir of heirs) {
    const [status, initiatedAt] = await Promise.all([
      client.readContract({
        address: vaultAddress,
        abi: LegacyVaultABI,
        functionName: "claimStatus",
        args: [heir],
      }),
      client.readContract({
        address: vaultAddress,
        abi: LegacyVaultABI,
        functionName: "claimInitiatedAt",
        args: [heir],
      }),
    ]);

    claims.push({
      heir,
      claimStatus: Number(status), // 1 = Contestable
      claimInitiatedAt: Number(initiatedAt),
    });
  }

  return claims;
}
