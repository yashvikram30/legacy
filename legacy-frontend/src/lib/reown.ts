import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { createAppKit } from "@reown/appkit/react";
import { worldchainSepolia } from "@reown/appkit/networks";
import { OptionsController } from "@reown/appkit-controllers";
import { http } from "wagmi";

// Explicitly disable Base Account and Coinbase telemetry/connectors
if (typeof window !== "undefined") {
  OptionsController.setEnableBaseAccount(false);
  OptionsController.setEnableCoinbase(false);

  // Stub ClientAnalytics so Coinbase Wallet SDK and Base Account do not inject telemetry scripts or call cca-lite.coinbase.com
  const win = window as unknown as { ClientAnalytics?: unknown };
  if (!win.ClientAnalytics) {
    win.ClientAnalytics = {
      init: () => {},
      identify: () => {},
      optOut: () => {},
      PlatformName: { web: "web" },
      automatedEvents: {},
      automatedMappingConfig: {},
    };
  }
}

export const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "89158bc2598a52d05fe83c04fc5f7b50";

export const networks = [worldchainSepolia] as [typeof worldchainSepolia, ...typeof worldchainSepolia[]];

const globalForAppKit = globalThis as unknown as {
  wagmiAdapter?: WagmiAdapter;
  appKit?: ReturnType<typeof createAppKit>;
};

export const wagmiAdapter =
  globalForAppKit.wagmiAdapter ||
  new WagmiAdapter({
    ssr: true,
    projectId,
    networks,
    transports: {
      [worldchainSepolia.id]: http(
        process.env.NEXT_PUBLIC_WORLD_CHAIN_RPC_URL ||
          "https://worldchain-sepolia.gateway.tenderly.co"
      ),
    },
  });

globalForAppKit.wagmiAdapter = wagmiAdapter;

export const config = wagmiAdapter.wagmiConfig;

const metadata = {
  name: "LEGACY",
  description: "Autonomous On-Chain Digital Succession Protocol",
  url: typeof window !== "undefined" ? window.location.origin : "https://legacyprotocol.xyz",
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

// Initialize Reown AppKit with singleton guard on globalThis, dark brutalist styling, and Murs Gothic font
export const appKit =
  globalForAppKit.appKit ||
  createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks,
    defaultNetwork: worldchainSepolia,
    metadata,
    themeMode: "dark",
    themeVariables: {
      "--w3m-accent": "#ffffff",
      "--w3m-color-mix": "#000000",
      "--w3m-color-mix-strength": 35,
      "--w3m-border-radius-master": "0px",
      "--w3m-font-family": "'Murs Gothic', -apple-system, BlinkMacSystemFont, sans-serif",
      "--w3m-z-index": 99999,
    },
    enableCoinbase: false,
    features: {
      analytics: false,
      email: false,
      socials: false,
    },
  });

globalForAppKit.appKit = appKit;


