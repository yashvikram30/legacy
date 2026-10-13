"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PublicClient } from "viem";
import { useAccount, usePublicClient, useReadContracts } from "wagmi";
import { CONTRACT_ADDRESSES, VaultStatus, VAULT_STATUS_COPY, shortAddress } from "@/lib/constants";
import { LegacyVaultABI, LegacyVaultFactoryABI } from "@/lib/contracts/abis";
import { fetchVaultMeta, fetchVaultMetasByOwner } from "@/lib/vault-meta/client";

interface VaultDashboardHubProps {
  ownedVaults: readonly `0x${string}`[];
  isLoadingOwned: boolean;
  onManageVault: (vault: `0x${string}`) => void;
  onCreateVault: () => void;
  isCreatingVault: boolean;
  isWrongChain: boolean;
  onSwitchChain: () => void;
}

interface HeirVaultEntry {
  vault: `0x${string}`;
  status: VaultStatus;
  owner: `0x${string}`;
  vaultName?: string;
  ownerName?: string;
}

type Address = `0x${string}`;

const VAULT_PAGE_SIZE = 200n;

/**
 * Finds the vaults that currently list `account` as an heir or guardian, read
 * entirely from state: every vault the factory created, checked in one batch.
 * (Event logs can't be used: public Monad RPCs cap eth_getLogs at a 100-block
 * range.)
 */
async function findMemberships(client: PublicClient, account: Address) {
  const total = (await client.readContract({
    address: CONTRACT_ADDRESSES.factory,
    abi: LegacyVaultFactoryABI,
    functionName: "vaultCount",
  })) as bigint;

  const vaults: Address[] = [];
  for (let start = 0n; start < total; start += VAULT_PAGE_SIZE) {
    const page = (await client.readContract({
      address: CONTRACT_ADDRESSES.factory,
      abi: LegacyVaultFactoryABI,
      functionName: "getVaultsPage",
      args: [start, VAULT_PAGE_SIZE],
    })) as readonly Address[];
    vaults.push(...page);
  }
  if (vaults.length === 0) return { heirVaults: [], guardianVaults: [] };

  const flags = await client.multicall({
    allowFailure: true,
    contracts: vaults.flatMap((vault) => [
      { address: vault, abi: LegacyVaultABI, functionName: "isHeir", args: [account] } as const,
      { address: vault, abi: LegacyVaultABI, functionName: "isGuardian", args: [account] } as const,
    ]),
  });
  const listed = (offset: number) =>
    vaults.filter((_, i) => {
      const flag = flags[i * 2 + offset];
      return flag?.status === "success" && flag.result === true;
    });

  const describe = async (vault: Address): Promise<HeirVaultEntry> => {
    const [statusNow, ownerNow, meta] = await Promise.all([
      client.readContract({ address: vault, abi: LegacyVaultABI, functionName: "getStatus" }),
      client.readContract({ address: vault, abi: LegacyVaultABI, functionName: "owner" }),
      fetchVaultMeta(vault),
    ]);
    return {
      vault,
      status: Number(statusNow) as VaultStatus,
      owner: ownerNow as Address,
      vaultName: meta?.vaultName,
      ownerName: meta?.ownerName,
    };
  };

  const [heirVaults, guardianVaults] = await Promise.all([
    Promise.all(listed(0).map(describe)),
    Promise.all(listed(1).map(describe)),
  ]);
  return { heirVaults, guardianVaults };
}

function StatusDot({ status }: { status: VaultStatus | null }) {
  const copy = status !== null ? VAULT_STATUS_COPY[status] : null;
  const color = copy?.color ?? "var(--text-secondary)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: color,
          boxShadow: copy ? `0 0 6px ${color}` : "none",
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: "0.75rem", fontWeight: 600, color }}>{copy?.label ?? "Loading…"}</span>
    </span>
  );
}

// Stagger caps at 8 cards worth of delay so large lists don't drag out the entrance.
const MAX_STAGGER_INDEX = 8;
const STAGGER_STEP_MS = 40;

function cardStaggerStyle(index: number): React.CSSProperties {
  const delay = Math.min(index, MAX_STAGGER_INDEX) * STAGGER_STEP_MS;
  return { animationDelay: `${delay}ms` };
}

function VaultCard({
  vaultAddress,
  vaultName,
  status,
  detail,
  ctaLabel,
  onClick,
  urgent,
  style,
}: {
  vaultAddress: `0x${string}`;
  vaultName?: string;
  status: VaultStatus | null;
  /** One human line under the name, e.g. "From Maria Chen" or "2 heirs". */
  detail: string;
  ctaLabel: string;
  onClick: () => void;
  urgent?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="vault-card animate-fade-up"
      style={{
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "20px",
        backgroundColor: urgent ? "rgba(193, 80, 63, 0.06)" : "rgba(255, 255, 255, 0.02)",
        border: `1px solid ${urgent ? "var(--status-red)" : "rgba(255, 255, 255, 0.1)"}`,
        cursor: "pointer",
        width: "100%",
        borderRadius: 0,
        ...style,
      }}
    >
      <StatusDot status={status} />
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "'Murs Gothic', var(--font-murs-gothic), sans-serif",
            fontSize: "1.0625rem",
            color: vaultName ? "#ffffff" : "var(--text-secondary)",
            letterSpacing: "0.02em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={vaultAddress}
        >
          {vaultName ?? `Vault ${shortAddress(vaultAddress)}`}
        </div>
        <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{detail}</div>
      </div>
      <div style={{ fontSize: "0.75rem", color: "var(--accent-brass)", fontWeight: 600 }}>
        {ctaLabel} →
      </div>
    </button>
  );
}

/** "From Maria Chen", falling back to a short owner address when unnamed. */
function fromOwner(entry: HeirVaultEntry) {
  return `From ${entry.ownerName ?? shortAddress(entry.owner)}`;
}

function CardSkeleton() {
  return (
    <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: 10, padding: "18px 20px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
      <div className="skeleton-shimmer" style={{ width: 60, height: 12 }} />
      <div className="skeleton-shimmer" style={{ width: "70%", height: 16 }} />
      <div className="skeleton-shimmer" style={{ width: "40%", height: 12 }} />
    </div>
  );
}

export function VaultDashboardHub({
  ownedVaults,
  isLoadingOwned,
  onManageVault,
  onCreateVault,
  isCreatingVault,
  isWrongChain,
  onSwitchChain,
}: VaultDashboardHubProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const router = useRouter();

  // ── Owned vaults: live status + heir count via multicall ──────────
  const ownedContracts = ownedVaults.flatMap((v) => [
    { address: v, abi: LegacyVaultABI, functionName: "getStatus" as const },
    { address: v, abi: LegacyVaultABI, functionName: "getHeirCount" as const },
  ]);

  const { data: ownedResults } = useReadContracts({
    contracts: ownedContracts,
    query: { enabled: ownedVaults.length > 0, refetchInterval: 5000 },
  });

  // Off-chain vault names for owned vaults (best-effort; falls back to address)
  const [vaultNames, setVaultNames] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    fetchVaultMetasByOwner(address).then((metas) => {
      if (cancelled) return;
      const map: Record<string, string> = {};
      for (const m of metas) {
        if (m.vaultName) map[m.vaultAddress.toLowerCase()] = m.vaultName;
      }
      setVaultNames(map);
    });
    return () => {
      cancelled = true;
    };
  }, [address, ownedVaults.length]);

  const ownedCards = ownedVaults.map((v, i) => {
    const statusRes = ownedResults?.[i * 2];
    const heirCountRes = ownedResults?.[i * 2 + 1];
    return {
      vault: v,
      status: statusRes?.status === "success" ? (Number(statusRes.result) as VaultStatus) : null,
      heirCount: heirCountRes?.status === "success" ? Number(heirCountRes.result) : null,
      name: vaultNames[v.toLowerCase()],
    };
  });

  // ── Vaults that list this address as an heir or guardian ──
  const [membership, setMembership] = useState<{
    key: string;
    heirVaults: HeirVaultEntry[];
    guardianVaults: HeirVaultEntry[];
    error: string | null;
  } | null>(null);
  const membershipKey = address?.toLowerCase() ?? "";

  useEffect(() => {
    if (!publicClient || !address || !CONTRACT_ADDRESSES.factory) return;
    let cancelled = false;
    const key = address.toLowerCase();
    findMemberships(publicClient, address)
      .then((found) => {
        if (!cancelled) setMembership({ key, ...found, error: null });
      })
      .catch((err) => {
        console.error("❌ [Dashboard] Failed to find vaults that list you:", err);
        if (!cancelled) {
          setMembership({
            key,
            heirVaults: [],
            guardianVaults: [],
            error: "Could not check which vaults list you right now. Use manual lookup below instead.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [publicClient, address]);

  const currentMembership = membership?.key === membershipKey ? membership : null;
  const heirVaults = currentMembership?.heirVaults ?? [];
  const guardianVaults = currentMembership?.guardianVaults ?? [];
  const heirScanError = currentMembership?.error ?? null;
  const isLoadingHeirVaults = Boolean(address && CONTRACT_ADDRESSES.factory) && !currentMembership;
  const isLoadingGuardianVaults = isLoadingHeirVaults;

  const hasOwned = ownedVaults.length > 0;

  return (
    <div style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "40px" }}>
      {/* Header row: title + CTA, always visible, no scrolling required */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 className="section-title" style={{ fontSize: "1.625rem", marginBottom: "6px" }}>
            YOUR VAULTS
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", maxWidth: 520, lineHeight: 1.5 }}>
            What you&apos;re leaving behind, and what&apos;s been left to you.
          </p>
        </div>
        {/* With no vault yet, the empty state below carries the one create action */}
        {(hasOwned || isLoadingOwned || isWrongChain) && (
          <button
            type="button"
            onClick={isWrongChain ? onSwitchChain : onCreateVault}
            disabled={isCreatingVault}
            className={isWrongChain ? "btn-chain-wrong" : "btn-hero-action"}
            style={{ marginTop: 0, padding: "12px 24px", flexShrink: 0 }}
          >
            <span>
              {isCreatingVault ? "Deploying…" : isWrongChain ? "Switch Network" : "+ Create New Vault"}
            </span>
            {!isCreatingVault && !isWrongChain && <span className="arrow-icon" aria-hidden="true">→</span>}
          </button>
        )}
      </div>

      {/* ── Your Vaults ─────────────────────────────────────────── */}
      <section>
        <h2 style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: "16px" }}>
          You own {hasOwned ? `(${ownedVaults.length})` : ""}
        </h2>

        {isLoadingOwned ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "14px" }}>
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : !hasOwned ? (
          <div
            style={{
              padding: "28px 24px",
              border: "1px dashed rgba(255, 255, 255, 0.15)",
              backgroundColor: "rgba(255, 255, 255, 0.01)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0, lineHeight: 1.5, maxWidth: 420 }}>
              You don&apos;t have a vault yet. Create one, add your heirs, and check in now and then. That&apos;s it.
            </p>
            <button
              type="button"
              onClick={isWrongChain ? onSwitchChain : onCreateVault}
              disabled={isCreatingVault}
              className={isWrongChain ? "btn-chain-wrong" : "btn-hero-action"}
              style={{ marginTop: 0, padding: "12px 24px", flexShrink: 0 }}
            >
              {isCreatingVault ? "Deploying…" : isWrongChain ? "Switch Network" : "+ Create your first vault"}
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "14px" }}>
            {ownedCards.map((card, i) => (
              <VaultCard
                key={card.vault}
                vaultAddress={card.vault}
                vaultName={card.name}
                status={card.status}
                detail={
                  card.heirCount === null
                    ? "Loading heirs…"
                    : card.heirCount === 0
                      ? "No heirs yet"
                      : `${card.heirCount} heir${card.heirCount === 1 ? "" : "s"}`
                }
                ctaLabel="Open"
                onClick={() => onManageVault(card.vault)}
                style={cardStaggerStyle(i)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Vaults You're a Beneficiary Of ──────────────────────── */}
      <section>
        <h2 style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: "16px" }}>
          Left to you {heirVaults.length > 0 ? `(${heirVaults.length})` : ""}
        </h2>

        {isLoadingHeirVaults ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "14px" }}>
            <CardSkeleton />
          </div>
        ) : heirVaults.length === 0 ? (
          <div
            style={{
              padding: "24px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              backgroundColor: "rgba(255, 255, 255, 0.01)",
            }}
          >
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0, lineHeight: 1.5 }}>
              Nobody has named you as an heir yet.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "14px" }}>
            {heirVaults.map((entry, i) => (
              <VaultCard
                key={entry.vault}
                vaultAddress={entry.vault}
                vaultName={entry.vaultName}
                status={entry.status}
                detail={fromOwner(entry)}
                ctaLabel={entry.status === VaultStatus.Red ? "Start claim" : "View"}
                onClick={() => router.push(`/claim?v=${entry.vault}`)}
                urgent={entry.status === VaultStatus.Red}
                style={cardStaggerStyle(i)}
              />
            ))}
          </div>
        )}

        {heirScanError && (
          <p style={{ color: "var(--status-amber)", fontSize: "0.75rem", marginTop: "10px", lineHeight: 1.5 }}>
            {heirScanError}
          </p>
        )}

        <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "10px" }}>
          Missing a vault?{" "}
          <Link href="/claim" style={{ color: "var(--accent-brass)" }}>
            Look it up by address →
          </Link>
        </p>
      </section>

      {/* ── Vaults You Safeguard (guardian) ─────────────────────── */}
      {(isLoadingGuardianVaults || guardianVaults.length > 0) && (
        <section>
          <h2 style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: "16px" }}>
            You&apos;re a guardian for {guardianVaults.length > 0 ? `(${guardianVaults.length})` : ""}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.8125rem", marginTop: "-8px", marginBottom: "16px", lineHeight: 1.5, maxWidth: 560 }}>
            These owners trust you to confirm if they pass away. When every guardian confirms, their heirs can inherit almost immediately.
          </p>

          {isLoadingGuardianVaults ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "14px" }}>
              <CardSkeleton />
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "14px" }}>
              {guardianVaults.map((entry, i) => (
                <VaultCard
                  key={entry.vault}
                  vaultAddress={entry.vault}
                  vaultName={entry.vaultName}
                  status={entry.status}
                  detail={fromOwner(entry)}
                  ctaLabel="Review"
                  onClick={() => router.push(`/claim?v=${entry.vault}`)}
                  urgent={entry.status === VaultStatus.Red}
                  style={cardStaggerStyle(i)}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
