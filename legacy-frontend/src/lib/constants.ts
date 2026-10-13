import { type Chain } from "viem";
import { monad, monadTestnet } from "viem/chains";

// The network this deployment of the app talks to. Set NEXT_PUBLIC_CHAIN to
// "monad" for mainnet; anything else (or unset) means Monad testnet.
const IS_MAINNET = process.env.NEXT_PUBLIC_CHAIN === "monad";

const baseChain: Chain = IS_MAINNET
  ? monad
  : {
      ...monadTestnet,
      // Monadscan serves both networks, keeping explorer links consistent.
      blockExplorers: { default: { name: "Monadscan", url: "https://testnet.monadscan.com" } },
    };

const RPC_OVERRIDE = process.env.NEXT_PUBLIC_RPC_URL;

export const activeChain: Chain = RPC_OVERRIDE
  ? { ...baseChain, rpcUrls: { ...baseChain.rpcUrls, default: { http: [RPC_OVERRIDE] } } }
  : baseChain;

export const ACTIVE_RPC_URL = activeChain.rpcUrls.default.http[0];
export const CHAIN_NAME = activeChain.name;
export const EXPLORER_NAME = activeChain.blockExplorers?.default.name ?? "Explorer";
const EXPLORER_URL = activeChain.blockExplorers?.default.url ?? "";

export const explorerAddressUrl = (address: string) => `${EXPLORER_URL}/address/${address}`;
export const explorerTxUrl = (hash: string) => `${EXPLORER_URL}/tx/${hash}`;

// The canonical Legacy deployment on each network (see
// legacy-contract/deployments/), so the app works with no configuration.
const DEPLOYMENTS = {
  testnet: {
    factory: "0xEe99BE33c48C1362e66fb3db773018Db1cC1eacF",
    verifier: "0xe72de0e5279429b097d2Ca03AB95EC315D022314",
    implementation: "0xD7F49d01E73C889ab9fBcc209B79Ba84f632b514",
    policyEngine: "0xC94efC123dDE0E590882F261996B65c5F018eD06",
    smokeVault: "0x3F7C7483A6993Ffd2bb084549785BE64aEDD4F37",
  },
  mainnet: { factory: "", verifier: "", implementation: "", policyEngine: "", smokeVault: "" },
} as const;

const DEPLOYMENT = IS_MAINNET ? DEPLOYMENTS.mainnet : DEPLOYMENTS.testnet;

// Address overrides only apply once NEXT_PUBLIC_CHAIN is set, i.e. the
// environment has been configured for Monad. A hosting environment still
// carrying the old World Chain addresses would otherwise point this app at
// contracts that don't exist on Monad.
const CONFIGURED_FOR_MONAD = Boolean(process.env.NEXT_PUBLIC_CHAIN);
const address = (override: string | undefined, fallback: string) =>
  ((CONFIGURED_FOR_MONAD && override) || fallback) as `0x${string}`;

export const CONTRACT_ADDRESSES = {
  factory: address(process.env.NEXT_PUBLIC_FACTORY_ADDRESS, DEPLOYMENT.factory),
  /** PasskeyVerifierAdapter: every vault created by this app checks in with a passkey. */
  verifier: address(process.env.NEXT_PUBLIC_VERIFIER_ADDRESS, DEPLOYMENT.verifier),
  implementation: address(process.env.NEXT_PUBLIC_IMPLEMENTATION_ADDRESS, DEPLOYMENT.implementation),
  smokeVault: address(process.env.NEXT_PUBLIC_SMOKE_VAULT_ADDRESS, DEPLOYMENT.smokeVault),
  policyEngine: address(process.env.NEXT_PUBLIC_POLICY_ENGINE_ADDRESS, DEPLOYMENT.policyEngine),
};

/**
 * Timings every new vault starts with; owners can change them any time from
 * the Timing tab. Demo timings let a full inheritance play out in a few
 * minutes while leaving enough time to finish a multi-transaction setup step
 * (assigning an asset, committing a policy) between check-ins. They are the default on testnet, and real-world timings are the
 * default on mainnet. NEXT_PUBLIC_DEMO_TIMINGS ("true" / "false") overrides.
 */
const DEMO_TIMINGS =
  process.env.NEXT_PUBLIC_DEMO_TIMINGS !== undefined ? process.env.NEXT_PUBLIC_DEMO_TIMINGS === "true" : !IS_MAINNET;

const DAY = 86_400n;

export const DEFAULT_VAULT_TIMINGS = DEMO_TIMINGS
  ? { checkInInterval: 120n, gracePeriod: 30n, contestableWindow: 60n }
  : { checkInInterval: 30n * DAY, gracePeriod: 7n * DAY, contestableWindow: 3n * DAY };

export const PROTOCOL_FLOORS = {
  minCheckInIntervalSeconds: 5, // 5s floor for rapid testing
  minContestableWindowSeconds: 5, // 5s floor for rapid testing
};

export enum VaultStatus {
  Green = 0,
  Amber = 1,
  Red = 2,
}

/** Plain-language status copy, so users don't have to decode GREEN / AMBER / RED. */
export const VAULT_STATUS_COPY: Record<VaultStatus, { label: string; color: string }> = {
  [VaultStatus.Green]: { label: "Active", color: "var(--status-green)" },
  [VaultStatus.Amber]: { label: "Check-in overdue", color: "var(--status-amber)" },
  [VaultStatus.Red]: { label: "Claims open", color: "var(--status-red)" },
};

/** Short, human fallback for an unnamed address: 0x1234…abcd */
export function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const DURATION_UNITS: [number, string][] = [
  [86400, "day"],
  [3600, "hour"],
  [60, "minute"],
  [1, "second"],
];

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

/**
 * Largest unit plus the next one down when there's a remainder:
 * 45 → "45 seconds", 615 → "10 minutes 15 seconds", 2592000 → "30 days".
 */
export function humanDuration(seconds: number, maxUnits: 1 | 2 = 2): string {
  const s = Math.max(0, Math.floor(seconds));
  for (let i = 0; i < DURATION_UNITS.length; i++) {
    const [size, unit] = DURATION_UNITS[i];
    if (s >= size || size === 1) {
      const n = Math.floor(s / size);
      const next = DURATION_UNITS[i + 1];
      const rest = next && maxUnits > 1 ? Math.floor((s % size) / next[0]) : 0;
      return rest > 0 ? `${plural(n, unit)} ${plural(rest, next[1])}` : plural(n, unit);
    }
  }
  return "0 seconds";
}

/** "3 days ago" for a unix timestamp in seconds. */
export function timeAgo(unixSeconds: number): string {
  const elapsed = Date.now() / 1000 - unixSeconds;
  return elapsed < 5 ? "just now" : `${humanDuration(elapsed, 1)} ago`;
}

export enum ClaimStatus {
  NotInitiated = 0,
  Contestable = 1,
  Claimed = 2,
}

/**
 * Canonical tokens on the active network, verified on-chain (symbol, decimals,
 * and WETH9-style deposit() for WMON). Native MON cannot be approved, so it is
 * wrapped 1:1 into WMON before being allocated.
 */
export const CHAIN_TOKENS = IS_MAINNET
  ? {
      wrappedNative: "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A" as `0x${string}`,
      usdc: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603" as `0x${string}`,
    }
  : {
      wrappedNative: "0xFb8bf4c1CC7a94c73D209a149eA2AbEa852BC541" as `0x${string}`,
      usdc: "0x534b2f3A21130d7a60830c2Df862319e593943A3" as `0x${string}`,
    };
