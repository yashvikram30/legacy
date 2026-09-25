import { type Chain } from "viem";

export const worldChainSepolia: Chain = {
  id: 4801,
  name: "World Chain Sepolia",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_WORLD_CHAIN_RPC_URL ||
          "https://worldchain-sepolia.gateway.tenderly.co",
      ],
    },
    public: {
      http: [
        "https://worldchain-sepolia.gateway.tenderly.co",
        "https://worldchain-sepolia.g.alchemy.com/public",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Worldscan",
      url: "https://sepolia.worldscan.org",
    },
  },
  testnet: true,
};

export const CONTRACT_ADDRESSES = {
  factory: (process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "") as `0x${string}`,
  verifier: (process.env.NEXT_PUBLIC_VERIFIER_ADDRESS || "") as `0x${string}`,
  implementation: (process.env.NEXT_PUBLIC_IMPLEMENTATION_ADDRESS || "") as `0x${string}`,
  smokeVault: (process.env.NEXT_PUBLIC_SMOKE_VAULT_ADDRESS || "") as `0x${string}`,
};

export const WORLD_ID_CONFIG = {
  appId: (process.env.NEXT_PUBLIC_WORLD_ID_APP_ID || "") as `app_${string}`,
  rpId: (process.env.NEXT_PUBLIC_WORLD_ID_RP_ID || "") as `rp_${string}`,
  action: process.env.NEXT_PUBLIC_WORLD_ID_ACTION || "heartbeat",
  groupId: Number(process.env.NEXT_PUBLIC_WORLD_ID_GROUP_ID || 1), // 1 = Orb-verified
};

export const PROTOCOL_FLOORS = {
  minCheckInIntervalSeconds: 5, // 5s floor for rapid testing
  minContestableWindowSeconds: 5, // 5s floor for rapid testing
};

export enum VaultStatus {
  Green = 0,
  Amber = 1,
  Red = 2,
}

export enum ClaimStatus {
  NotInitiated = 0,
  Contestable = 1,
  Claimed = 2,
}

export interface KnownToken {
  name: string;
  symbol: string;
  decimals: number;
  address?: `0x${string}`; // undefined for Native ETH
  isNative?: boolean;
}

export const KNOWN_TESTNET_TOKENS: KnownToken[] = [
  {
    name: "Native Ether",
    symbol: "ETH",
    decimals: 18,
    isNative: true,
  },
  {
    name: "USD Coin (Circle)",
    symbol: "USDC",
    decimals: 6,
    address: "0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88",
  },
];
