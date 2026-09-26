"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { VaultStatus, CONTRACT_ADDRESSES } from "@/lib/constants";
import { LegacyVaultABI } from "@/lib/contracts/abis";
import { StatusLamp } from "@/components/StatusLamp";
import { TransparencyLookupSkeleton } from "@/components/Skeleton";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button
      type="button"
      onClick={copy}
      title="Copy to clipboard"
      style={{
        background: "none",
        border: "none",
        padding: "4px 6px",
        cursor: "pointer",
        color: copied ? "var(--accent-brass)" : "var(--text-secondary)",
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      aria-label="Copy address"
    >
      {copied ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="1" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

export default function TransparencyLookup() {
  const [searchInput, setSearchInput] = useState<string>("");
  const [queriedAddress, setQueriedAddress] = useState<`0x${string}` | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed.startsWith("0x") || trimmed.length !== 42) return;
    setQueriedAddress(trimmed as `0x${string}`);
  };

  const handleQuickLoadSmoke = () => {
    setSearchInput(CONTRACT_ADDRESSES.smokeVault);
    setQueriedAddress(CONTRACT_ADDRESSES.smokeVault);
  };

  // ── Reads ─────────────────────────────────────────────────────────
  const { data: rawStatus, isLoading: isStatusLoading, isError: isStatusError } = useReadContract({
    address: queriedAddress ?? undefined,
    abi: LegacyVaultABI,
    functionName: "getStatus",
    query: { enabled: Boolean(queriedAddress) },
  });

  const { data: owner, isLoading: isOwnerLoading } = useReadContract({
    address: queriedAddress ?? undefined,
    abi: LegacyVaultABI,
    functionName: "owner",
    query: { enabled: Boolean(queriedAddress) },
  });

  const { data: heirCount } = useReadContract({
    address: queriedAddress ?? undefined,
    abi: LegacyVaultABI,
    functionName: "getHeirCount",
    query: { enabled: Boolean(queriedAddress) },
  });

  const { data: lastCheckInRaw, isLoading: isLastCheckInLoading } = useReadContract({
    address: queriedAddress ?? undefined,
    abi: LegacyVaultABI,
    functionName: "lastCheckIn",
    query: { enabled: Boolean(queriedAddress) },
  });

  const { data: intervalRaw } = useReadContract({
    address: queriedAddress ?? undefined,
    abi: LegacyVaultABI,
    functionName: "checkInInterval",
    query: { enabled: Boolean(queriedAddress) },
  });

  const { data: gracePeriodRaw } = useReadContract({
    address: queriedAddress ?? undefined,
    abi: LegacyVaultABI,
    functionName: "gracePeriod",
    query: { enabled: Boolean(queriedAddress) },
  });

  const { data: contestableWindowRaw } = useReadContract({
    address: queriedAddress ?? undefined,
    abi: LegacyVaultABI,
    functionName: "contestableWindow",
    query: { enabled: Boolean(queriedAddress) },
  });

  const { data: livenessRegistered } = useReadContract({
    address: queriedAddress ?? undefined,
    abi: LegacyVaultABI,
    functionName: "livenessRegistered",
    query: { enabled: Boolean(queriedAddress) },
  });

  // ── Derived ───────────────────────────────────────────────────────
  const vaultStatus = rawStatus !== undefined ? (Number(rawStatus) as VaultStatus) : null;

  const lastCheckIn = lastCheckInRaw !== undefined ? BigInt(lastCheckInRaw.toString()) : BigInt(0);
  const checkInInterval = intervalRaw !== undefined ? BigInt(intervalRaw.toString()) : BigInt(86400 * 30);
  const gracePeriod = gracePeriodRaw !== undefined ? BigInt(gracePeriodRaw.toString()) : BigInt(86400 * 7);

  const lastCheckInDate =
    lastCheckInRaw !== undefined && Number(lastCheckInRaw) > 0
      ? new Date(Number(lastCheckInRaw) * 1000).toUTCString()
      : null;

  const cadenceDays =
    intervalRaw !== undefined ? Math.round(Number(intervalRaw) / 86400) : null;

  const graceDays =
    gracePeriodRaw !== undefined ? Math.round(Number(gracePeriodRaw) / 86400) : null;

  const contestableHours =
    contestableWindowRaw !== undefined ? Math.round(Number(contestableWindowRaw) / 3600) : null;

  const isLoading = isStatusLoading || isOwnerLoading;

  return (
    <div className="landing-canvas" style={{ minHeight: "calc(100vh - var(--header-height, 64px))", padding: "40px 24px 96px" }}>
      <div className="app-container">
        {/* Navigation Breadcrumbs Bar */}
        <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link
              href="/"
              className="btn-secondary"
              style={{ padding: "6px 14px", fontSize: "0.8125rem", borderRadius: "0px", borderColor: "rgba(255, 255, 255, 0.2)" }}
            >
              <span>←</span> Home
            </Link>
            <span className="section-tag" style={{ margin: 0 }}>
              [ 03 // PUBLIC TRANSPARENCY & VERIFICATION ]
            </span>
          </div>

        </div>

        {/* ── Main Instrument Container ────────────────────────────── */}
        <div className="panel-instrument" style={{ background: "#000000", border: "1px solid rgba(255, 255, 255, 0.2)" }}>

          {/* Header */}
          <div style={{ padding: "36px 32px 28px", borderBottom: "1px solid rgba(255, 255, 255, 0.12)" }}>
            <h1
              className="section-title"
              style={{
                fontFamily: "'Murs Gothic', var(--font-murs-gothic), sans-serif",
                fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)",
                marginBottom: "12px",
              }}
            >
              PUBLIC TRANSPARENCY LOOKUP
            </h1>

            <p style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 640 }}>
              Public read-only inspection instrument. Verify the real-time cryptographic liveness status, World ID Orb verification binding, and timelock parameters of any succession vault on World Chain. Zero backend or centralized dependencies.
            </p>
          </div>

          {/* Search form */}
          <div style={{ padding: "28px 32px", borderBottom: "1px solid rgba(255, 255, 255, 0.12)", background: "rgba(255, 255, 255, 0.02)" }}>
            <form onSubmit={handleSearch} style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <input
                type="text"
                className="input-instrument font-data"
                placeholder="0x… (42-character clone vault address)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{
                  flex: "1 1 320px",
                  fontSize: "0.875rem",
                  backgroundColor: "#000000",
                  borderColor: "rgba(255, 255, 255, 0.2)",
                  padding: "12px 16px",
                }}
                autoComplete="off"
                spellCheck={false}
                id="vault-lookup-input"
              />
              <button
                type="submit"
                className="btn-brass"
                style={{ whiteSpace: "nowrap", padding: "12px 28px" }}
                id="vault-lookup-btn"
                disabled={!searchInput.trim().startsWith("0x") || searchInput.trim().length !== 42}
              >
                LOOKUP VAULT
              </button>
            </form>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Quick test:</span>
                <button
                  type="button"
                  onClick={handleQuickLoadSmoke}
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    padding: "4px 10px",
                    color: "var(--accent-brass)",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    fontFamily: "var(--font-data)",
                  }}
                  id="quick-load-smoke-vault-btn"
                >
                  Inspect Smoke Vault ({CONTRACT_ADDRESSES.smokeVault.slice(0, 6)}…{CONTRACT_ADDRESSES.smokeVault.slice(-4)})
                </button>
              </div>

              {searchInput.length > 2 && !searchInput.startsWith("0x") && (
                <span style={{ fontSize: "0.75rem", color: "var(--status-amber)" }}>
                  Address must start with 0x
                </span>
              )}
            </div>
          </div>

          {/* Empty state: No query yet */}
          {!queriedAddress && (
            <div style={{ padding: "48px 32px" }}>
              <div className="landing-section-header" style={{ marginBottom: "28px" }}>
                <span className="section-tag">[ ARCHITECTURE GUARANTEES ]</span>
                <h2 style={{ fontFamily: "'Murs Gothic', var(--font-murs-gothic), sans-serif", fontSize: "1.25rem", color: "#ffffff", textTransform: "uppercase" }}>
                  Verifiable Cryptographic Proofs
                </h2>
              </div>

              <div className="lifecycle-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
                <div className="lifecycle-card" style={{ padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <span style={{ color: "var(--accent-brass)", fontWeight: "bold", fontSize: "0.8125rem" }}>01 //</span>
                    <span style={{ fontFamily: "'Murs Gothic', sans-serif", fontSize: "0.9375rem", fontWeight: 800 }}>DIRECT RPC QUERY</span>
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                    Zero centralized servers or indexers. Every heartbeat timestamp, timer countdown, and heir mapping is queried straight from World Chain Sepolia node bytecode.
                  </p>
                </div>

                <div className="lifecycle-card" style={{ padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <span style={{ color: "var(--accent-brass)", fontWeight: "bold", fontSize: "0.8125rem" }}>02 //</span>
                    <span style={{ fontFamily: "'Murs Gothic', sans-serif", fontSize: "0.9375rem", fontWeight: 800 }}>WORLD ID ORB PROOF</span>
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                    Heartbeat liveness is anchored to World ID Semaphore zero-knowledge proofs. Liveness registration confirms Orb biometric verification without revealing user identity.
                  </p>
                </div>

                <div className="lifecycle-card" style={{ padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <span style={{ color: "var(--accent-brass)", fontWeight: "bold", fontSize: "0.8125rem" }}>03 //</span>
                    <span style={{ fontFamily: "'Murs Gothic', sans-serif", fontSize: "0.9375rem", fontWeight: 800 }}>TIMELOCK AUTOMATION</span>
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                    Status transitions (Green &rarr; Amber &rarr; Red) are determined strictly by immutable timestamps on World Chain block production, resistant to tampering.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Loading state */}
          {queriedAddress && isLoading && (
            <TransparencyLookupSkeleton queriedAddress={queriedAddress} />
          )}

          {/* Error / Non-existent vault state */}
          {queriedAddress && !isLoading && (isStatusError || vaultStatus === null) && (
            <div style={{ padding: "48px 32px" }}>
              <div style={{ background: "rgba(224, 90, 71, 0.1)", border: "1px solid var(--status-red)", padding: "24px" }}>
                <span className="label-overline" style={{ color: "var(--status-red)" }}>
                  LOOKUP REJECTED // INVALID VAULT ADDRESS
                </span>
                <p style={{ fontSize: "0.9375rem", color: "#ffffff", marginTop: "8px", lineHeight: 1.5 }}>
                  The address <span className="font-data" style={{ color: "var(--accent-brass)" }}>{queriedAddress}</span> does not appear to be a deployed Legacy Vault on World Chain Sepolia (Chain ID 4801).
                </p>
                <div style={{ marginTop: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={handleQuickLoadSmoke}
                    className="btn-brass"
                    style={{ fontSize: "0.75rem", padding: "6px 14px" }}
                  >
                    Load Verified Smoke Vault Instead
                  </button>
                  <a
                    href={`https://sepolia.worldscan.org/address/${queriedAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                    style={{ fontSize: "0.75rem", padding: "6px 14px" }}
                  >
                    Inspect on Worldscan ↗
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Queried Vault Result Display */}
          {queriedAddress && !isLoading && vaultStatus !== null && (
            <div style={{ padding: "32px" }}>
              {/* Status Lamp Interactive Instrument Header */}
              <div style={{ marginBottom: "32px", paddingBottom: "32px", borderBottom: "1px solid rgba(255, 255, 255, 0.12)" }}>
                <StatusLamp
                  status={vaultStatus}
                  lastCheckIn={lastCheckIn}
                  checkInInterval={checkInInterval}
                  gracePeriod={gracePeriod}
                  livenessRegistered={Boolean(livenessRegistered)}
                />
              </div>

              {/* 4-Stat Telemetry Strip — the big dial above already shows
                  the status prominently, so this strip covers what it doesn't */}
              <div className="hero-telemetry-strip" style={{ marginTop: 0, marginBottom: "32px" }}>
                <div className="telemetry-cell">
                  <span className="telemetry-label">WORLD ID ORB</span>
                  <span
                    className="telemetry-value"
                    style={{
                      fontSize: "0.875rem",
                      color: livenessRegistered ? "var(--status-green)" : "var(--status-amber)",
                    }}
                  >
                    {livenessRegistered ? "SEMAPHORE BOUND" : "NOT REGISTERED"}
                  </span>
                </div>

                <div className="telemetry-cell">
                  <span className="telemetry-label">CHECK-IN CADENCE</span>
                  <span className="telemetry-value" style={{ fontSize: "0.875rem" }}>
                    {cadenceDays ? `${cadenceDays} DAYS` : "—"}
                  </span>
                </div>

                <div className="telemetry-cell">
                  <span className="telemetry-label">BENEFICIARIES</span>
                  <span className="telemetry-value" style={{ fontSize: "0.875rem" }}>
                    {heirCount !== undefined ? `${heirCount.toString()} DESIGNATED` : "—"}
                  </span>
                </div>

                <div className="telemetry-cell">
                  <span className="telemetry-label">CONTESTABLE WINDOW</span>
                  <span className="telemetry-value" style={{ fontSize: "0.875rem" }}>
                    {contestableHours ? `${contestableHours} HOURS` : "—"}
                  </span>
                </div>
              </div>

              {/* Comprehensive Specifications Data Matrix */}
              <div style={{ border: "1px solid rgba(255, 255, 255, 0.12)", background: "#000000", padding: "0 24px" }}>
                {/* Vault address */}
                <div className="data-row">
                  <span style={{ color: "var(--text-secondary)", flexShrink: 0 }}>Clone Vault Contract</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span
                      className="font-data"
                      style={{ fontSize: "0.875rem", color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title={queriedAddress}
                    >
                      {queriedAddress}
                    </span>
                    <CopyButton value={queriedAddress} />
                    <a
                      href={`https://sepolia.worldscan.org/address/${queriedAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{ padding: "2px 8px", fontSize: "0.6875rem", borderRadius: "0px" }}
                      title="View contract on Worldscan"
                    >
                      Worldscan ↗
                    </a>
                  </div>
                </div>

                {/* Owner */}
                <div className="data-row">
                  <span style={{ color: "var(--text-secondary)", flexShrink: 0 }}>Vault Owner</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    {owner ? (
                      <>
                        <span
                          className="font-data"
                          style={{ fontSize: "0.875rem", color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          title={owner as string}
                        >
                          {owner as string}
                        </span>
                        <CopyButton value={owner as string} />
                        <a
                          href={`https://sepolia.worldscan.org/address/${owner as string}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary"
                          style={{ padding: "2px 8px", fontSize: "0.6875rem", borderRadius: "0px" }}
                          title="View owner on Worldscan"
                        >
                          Worldscan ↗
                        </a>
                      </>
                    ) : (
                      <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Unknown</span>
                    )}
                  </div>
                </div>

                {/* Last heartbeat */}
                <div className="data-row">
                  <span style={{ color: "var(--text-secondary)" }}>Last Verified Heartbeat</span>
                  {isLastCheckInLoading ? (
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>—</span>
                  ) : lastCheckInDate ? (
                    <span className="font-data" style={{ fontSize: "0.875rem", color: "#ffffff" }}>
                      {lastCheckInDate}
                    </span>
                  ) : (
                    <span style={{ color: "var(--status-amber)", fontSize: "0.875rem" }}>No check-in recorded</span>
                  )}
                </div>

                {/* Check-in cadence */}
                <div className="data-row">
                  <span style={{ color: "var(--text-secondary)" }}>Check-In Cadence</span>
                  <span className="font-data" style={{ fontSize: "0.875rem", color: "#ffffff" }}>
                    {intervalRaw !== undefined ? `${cadenceDays} days (${Number(intervalRaw).toLocaleString()} seconds)` : "—"}
                  </span>
                </div>

                {/* Grace period */}
                <div className="data-row">
                  <span style={{ color: "var(--text-secondary)" }}>Grace Period Window</span>
                  <span className="font-data" style={{ fontSize: "0.875rem", color: "#ffffff" }}>
                    {gracePeriodRaw !== undefined ? `${graceDays} days (${Number(gracePeriodRaw).toLocaleString()} seconds)` : "—"}
                  </span>
                </div>

                {/* Contestable window */}
                <div className="data-row">
                  <span style={{ color: "var(--text-secondary)" }}>Contestable Challenge Window</span>
                  <span className="font-data" style={{ fontSize: "0.875rem", color: "#ffffff" }}>
                    {contestableWindowRaw !== undefined ? `${contestableHours} hours (${Number(contestableWindowRaw).toLocaleString()} seconds)` : "—"}
                  </span>
                </div>

                {/* Authorized heirs */}
                <div className="data-row">
                  <span style={{ color: "var(--text-secondary)" }}>Authorized Beneficiary Count</span>
                  <span className="font-data" style={{ fontSize: "0.875rem", color: "#ffffff" }}>
                    {heirCount !== undefined ? heirCount.toString() : "—"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "12px", marginTop: "28px", flexWrap: "wrap" }}>
                <Link
                  href={`/claim?v=${queriedAddress}`}
                  className="btn-hero-action"
                  style={{ marginTop: 0, textDecoration: "none" }}
                >
                  <span>GO TO HEIR PORTAL</span>
                  <span className="arrow-icon" aria-hidden="true">→</span>
                </Link>

                <a
                  href={`https://sepolia.worldscan.org/address/${queriedAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ padding: "12px 24px", fontSize: "0.875rem", borderRadius: "0px", display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  <span>VIEW CONTRACT BYTECODE</span>
                  <span>↗</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setQueriedAddress(null);
                  }}
                  className="btn-secondary"
                  style={{ padding: "12px 24px", fontSize: "0.875rem", borderRadius: "0px" }}
                >
                  RESET SEARCH
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Attribution note */}
        <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 24, letterSpacing: "0.04em" }}>
          TELEMETRY INTERROGATED LIVE FROM WORLD CHAIN SEPOLIA (CHAIN ID 4801) · NO PROPRIETARY DATABASE INVOLVED
        </p>
      </div>
    </div>
  );
}
