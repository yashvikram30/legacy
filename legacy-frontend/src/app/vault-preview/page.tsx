"use client";
// TEMPORARY visual harness (read-only mock wallet) — delete after review.
import React, { useEffect } from "react";
import { WagmiProvider, createConfig, http, useAccount, useConnect } from "wagmi";
import { mock } from "wagmi/connectors";
import { worldChainSepolia } from "@/lib/constants";
import VaultDashboardPage from "@/app/vault/page";

const OWNER = "0x4fB2C7dFB71B8cBdaaCD9b7e29C9A46FB5616b4e";
const cfg = createConfig({
  chains: [worldChainSepolia],
  connectors: [mock({ accounts: [OWNER] })],
  transports: { [worldChainSepolia.id]: http("https://worldchain-sepolia.gateway.tenderly.co") },
  ssr: true,
});

function AutoConnect({ children }: { children: React.ReactNode }) {
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();
  useEffect(() => {
    if (!isConnected) connect({ connector: connectors[0] });
  }, [isConnected, connect, connectors]);
  return isConnected ? <>{children}</> : null;
}

export default function Preview() {
  return (
    <WagmiProvider config={cfg} reconnectOnMount={false}>
      <AutoConnect>
        <VaultDashboardPage />
      </AutoConnect>
    </WagmiProvider>
  );
}
