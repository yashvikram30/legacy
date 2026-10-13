"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CONTRACT_ADDRESSES, explorerAddressUrl, CHAIN_NAME, activeChain } from "@/lib/constants";

export function Footer() {
  const pathname = usePathname();

  // Root landing page has its own integrated canvas footer
  if (pathname === "/") return null;

  return (
    <footer
      style={{
        width: "100%",
        backgroundColor: "#000000",
        borderTop: "1px solid rgba(255, 255, 255, 0.12)",
        padding: "32px 32px",
        marginTop: "auto",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px",
          fontFamily: "var(--font-data)",
          fontSize: "0.75rem",
          color: "var(--text-secondary)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Image src="/brand/logo-glyph-on-dark.svg" alt="" width={18} height={18} unoptimized style={{ verticalAlign: "middle" }} />
          <span style={{ fontWeight: 800, color: "#ffffff", letterSpacing: "0.06em" }}>LEGACY PROTOCOL</span>
          <span>·</span>
          <span>{CHAIN_NAME.toUpperCase()} (CHAIN ID {activeChain.id})</span>
        </div>

        <div style={{ display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/vault" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
            Vault
          </Link>
          <Link href="/claim" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
            Heir Portal
          </Link>
          <Link href="/lookup" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
            Lookup
          </Link>
          <a
            href={explorerAddressUrl(CONTRACT_ADDRESSES.factory)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--text-secondary)", textDecoration: "none" }}
          >
            Factory: {CONTRACT_ADDRESSES.factory.slice(0, 6)}…{CONTRACT_ADDRESSES.factory.slice(-4)} ↗
          </a>
          <a
            href={explorerAddressUrl(CONTRACT_ADDRESSES.verifier)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--text-secondary)", textDecoration: "none" }}
          >
            Verifier: {CONTRACT_ADDRESSES.verifier.slice(0, 6)}…{CONTRACT_ADDRESSES.verifier.slice(-4)} ↗
          </a>
        </div>
      </div>
    </footer>
  );
}
