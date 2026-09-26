"use client";

import React, { useState } from "react";
import { useReadContract, useWriteContract, usePublicClient, useChainId, useSwitchChain } from "wagmi";
import { worldChainSepolia } from "@/lib/constants";
import { LegacyVaultABI } from "@/lib/contracts/abis";

interface GuardianAttestationPanelProps {
  vaultAddress: `0x${string}`;
  viewerAddress?: `0x${string}`;
}

/**
 * Guardian-facing panel on the claim portal. A nominated guardian can attest
 * that the vault owner has died; once every guardian has attested, the vault's
 * timelocks collapse to 1% of nominal (a 99% cut to the time-to-inherit). Also
 * renders read-only progress for heirs watching the vote.
 */
export function GuardianAttestationPanel({ vaultAddress, viewerAddress }: GuardianAttestationPanelProps) {
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isWrongChain = chainId !== worldChainSepolia.id;
  const { writeContractAsync } = useWriteContract();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: guardiansRaw } = useReadContract({
    address: vaultAddress,
    abi: LegacyVaultABI,
    functionName: "getGuardians",
    query: { enabled: Boolean(vaultAddress), refetchInterval: 3000 },
  });

  const { data: attestationCountRaw, refetch: refetchCount } = useReadContract({
    address: vaultAddress,
    abi: LegacyVaultABI,
    functionName: "deathAttestationCount",
    query: { enabled: Boolean(vaultAddress), refetchInterval: 3000 },
  });

  const { data: deathConfirmedRaw, refetch: refetchConfirmed } = useReadContract({
    address: vaultAddress,
    abi: LegacyVaultABI,
    functionName: "deathConfirmed",
    query: { enabled: Boolean(vaultAddress), refetchInterval: 3000 },
  });

  const { data: isGuardianRaw } = useReadContract({
    address: vaultAddress,
    abi: LegacyVaultABI,
    functionName: "isGuardian",
    args: viewerAddress ? [viewerAddress] : undefined,
    query: { enabled: Boolean(vaultAddress) && Boolean(viewerAddress) },
  });

  const { data: hasAttestedRaw, refetch: refetchHasAttested } = useReadContract({
    address: vaultAddress,
    abi: LegacyVaultABI,
    functionName: "hasAttestedDeath",
    args: viewerAddress ? [viewerAddress] : undefined,
    query: { enabled: Boolean(vaultAddress) && Boolean(viewerAddress), refetchInterval: 3000 },
  });

  const guardians = (guardiansRaw as readonly `0x${string}`[]) || [];
  const totalGuardians = guardians.length;
  const attestationCount = attestationCountRaw !== undefined ? Number(attestationCountRaw) : 0;
  const deathConfirmed = Boolean(deathConfirmedRaw);
  const isGuardian = Boolean(isGuardianRaw);
  const hasAttested = Boolean(hasAttestedRaw);

  // Nothing to show on vaults that never nominated guardians.
  if (totalGuardians === 0) return null;

  const pct = totalGuardians > 0 ? Math.round((attestationCount / totalGuardians) * 100) : 0;

  const runTx = async (fn: "attestDeath" | "revokeAttestation") => {
    if (!publicClient) return;
    try {
      setIsSubmitting(true);
      setError(null);
      if (isWrongChain && switchChain) {
        await switchChain({ chainId: worldChainSepolia.id });
      }
      const hash = await writeContractAsync({
        chainId: worldChainSepolia.id,
        address: vaultAddress,
        abi: LegacyVaultABI,
        functionName: fn,
        gas: 200000n,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      refetchCount();
      refetchConfirmed();
      refetchHasAttested();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("NotGuardian")) {
        setError("Your connected wallet is not a guardian of this vault.");
      } else if (msg.includes("AlreadyAttestedDeath")) {
        setError("You have already cast your attestation.");
      } else if (msg.includes("DeathAlreadyConfirmed")) {
        setError("Death is already confirmed and can no longer be revoked — only an owner check-in can reset it.");
      } else if (msg.includes("rejected") || msg.includes("denied") || msg.includes("4001")) {
        setError("Transaction was rejected in your wallet.");
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const accent = deathConfirmed ? "var(--status-red)" : "var(--accent-brass)";

  return (
    <div
      style={{
        margin: "0 32px 32px",
        border: `1px solid ${deathConfirmed ? "var(--status-red)" : "rgba(255, 255, 255, 0.15)"}`,
        backgroundColor: deathConfirmed ? "rgba(193, 80, 63, 0.06)" : "rgba(255, 255, 255, 0.015)",
      }}
    >
      <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
        <span className="section-tag" style={{ margin: 0, color: accent }}>
          [ GUARDIAN DEATH ATTESTATION ]
        </span>
        <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.55, marginTop: 8, marginBottom: 0 }}>
          {deathConfirmed
            ? "All guardians have attested. Every timelock on this vault is reduced by 99% — heirs can inherit almost immediately. An owner check-in reverses this."
            : "Guardians nominated by the owner can collectively attest that the owner has died. A unanimous attestation cuts the time heirs must wait to inherit by 99%."}
        </p>
      </div>

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Progress */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span className="font-data" style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Attestations
            </span>
            <span className="font-data" style={{ fontSize: "0.9375rem", color: "#ffffff", fontWeight: 700 }}>
              {attestationCount} / {totalGuardians}
            </span>
          </div>
          <div style={{ height: 8, backgroundColor: "rgba(255, 255, 255, 0.08)", borderRadius: 0, overflow: "hidden" }}>
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                backgroundColor: accent,
                boxShadow: `0 0 8px ${accent}`,
                transition: "width 0.4s var(--ease-out-cubic, ease-out)",
              }}
            />
          </div>
        </div>

        {deathConfirmed ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              border: "1px solid var(--status-red)",
              backgroundColor: "rgba(193, 80, 63, 0.1)",
            }}
          >
            <span className="network-dot" style={{ backgroundColor: "var(--status-red)" }} />
            <span style={{ color: "#ffffff", fontSize: "0.875rem", fontWeight: 600 }}>
              DEATH CONFIRMED · ACCELERATED SUCCESSION ACTIVE
            </span>
          </div>
        ) : isGuardian ? (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {!hasAttested ? (
              <button
                type="button"
                onClick={() => runTx("attestDeath")}
                disabled={isSubmitting}
                className="btn-brass"
                style={{ padding: "10px 20px", fontSize: "0.8125rem", borderRadius: 0 }}
              >
                {isSubmitting ? "SUBMITTING…" : "Attest Owner Has Died"}
              </button>
            ) : (
              <>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--status-amber)", fontSize: "0.8125rem", fontFamily: "var(--font-data)" }}>
                  <span className="network-dot" style={{ backgroundColor: "var(--status-amber)" }} />
                  You have attested.
                </span>
                <button
                  type="button"
                  onClick={() => runTx("revokeAttestation")}
                  disabled={isSubmitting}
                  className="btn-secondary"
                  style={{ padding: "8px 16px", fontSize: "0.75rem", borderRadius: 0 }}
                >
                  {isSubmitting ? "…" : "Withdraw attestation"}
                </button>
              </>
            )}
          </div>
        ) : (
          <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontFamily: "var(--font-data)" }}>
            {viewerAddress
              ? "Your connected wallet is not a guardian of this vault — this is a read-only view of the vote."
              : "Connect a guardian wallet to cast an attestation."}
          </span>
        )}

        {error && (
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "rgba(193, 80, 63, 0.12)",
              border: "1px solid var(--status-red)",
              fontSize: "0.8125rem",
              color: "#ffffff",
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
