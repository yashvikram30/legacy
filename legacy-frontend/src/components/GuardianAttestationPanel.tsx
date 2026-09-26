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

  const accent = deathConfirmed ? "var(--status-red)" : "var(--text-primary)";

  return (
    <section className={`console-card${deathConfirmed ? " console-alert--danger" : ""}`}>
      <div className="console-tabpanel panel-stack">
        <div>
          <h3 className="panel-title" style={{ fontSize: "1.0625rem" }}>
            Guardian attestation
          </h3>
          <p className="panel-lead">
            {deathConfirmed
              ? "All guardians confirmed. Waiting periods are cut by 99%; an owner check-in reverses this."
              : "People the owner trusts can confirm they've passed away, cutting the waiting period by 99%."}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
            <span>Attestations</span>
            <strong style={{ color: accent, fontWeight: 600 }}>
              {attestationCount} / {totalGuardians}
            </strong>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%`, backgroundColor: accent }} />
          </div>
        </div>

        {deathConfirmed ? (
          <span className="state-pill">
            <span className="network-dot" style={{ backgroundColor: "var(--status-red)" }} />
            Death confirmed · waiting periods reduced
          </span>
        ) : isGuardian ? (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {!hasAttested ? (
              <button type="button" onClick={() => runTx("attestDeath")} disabled={isSubmitting} className="flow-btn">
                {isSubmitting ? "Submitting…" : "Attest the owner has died"}
              </button>
            ) : (
              <>
                <span className="state-pill">
                  <span className="network-dot" style={{ backgroundColor: "var(--status-amber)" }} />
                  You&apos;ve attested
                </span>
                <button type="button" onClick={() => runTx("revokeAttestation")} disabled={isSubmitting} className="flow-btn flow-btn--ghost">
                  {isSubmitting ? "…" : "Withdraw"}
                </button>
              </>
            )}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
            {viewerAddress ? "Read-only — this wallet isn't a guardian." : "Connect a guardian wallet to attest."}
          </p>
        )}

        {error && <div className="panel-note panel-note--error">{error}</div>}
      </div>
    </section>
  );
}
