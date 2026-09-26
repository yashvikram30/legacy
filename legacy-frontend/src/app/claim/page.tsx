"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getAbiItem, isAddress } from "viem";
import { useAccount, useReadContract, useWriteContract, usePublicClient, useChainId, useSwitchChain } from "wagmi";
import { useWalletModal } from "@/components/WalletModal";
import { VaultStatus, ClaimStatus, CONTRACT_ADDRESSES, worldChainSepolia } from "@/lib/constants";
import { LegacyVaultABI } from "@/lib/contracts/abis";
import { ClaimPortalSkeleton } from "@/components/Skeleton";
import { useMounted } from "@/hooks/useMounted";
import { StatusLamp } from "@/components/StatusLamp";
import { PipelineVisualizer, type PipelineStage } from "@/components/PipelineVisualizer";
import { SealedMessageHeirPanel } from "@/components/SealedMessageHeirPanel";
import { GuardianAttestationPanel } from "@/components/GuardianAttestationPanel";

const SUCCESSION_STAGES: PipelineStage[] = [
  { key: "liveness", label: "Active Liveness", hint: "Owner checking in", color: "var(--status-green)" },
  { key: "grace", label: "Grace Period", hint: "Cadence missed", color: "var(--status-amber)" },
  { key: "contestation", label: "Heir Contestation", hint: "Claim window", color: "var(--status-red)" },
  { key: "distribution", label: "Asset Distribution", hint: "Transfers unlocked", color: "var(--status-green)" },
];

function successionStageIndex(vaultStatus: VaultStatus | null, claimStatus: ClaimStatus): number {
  if (claimStatus === ClaimStatus.Claimed) return 3;
  if (claimStatus === ClaimStatus.Contestable) return 2;
  if (vaultStatus === VaultStatus.Red) return 2;
  if (vaultStatus === VaultStatus.Amber) return 1;
  return 0;
}

interface HeirAllocation {
  assetId: `0x${string}`;
  executor: `0x${string}`;
  executed: boolean;
}

const assetAssignedEvent = getAbiItem({ abi: LegacyVaultABI, name: "AssetAssigned" });

export default function HeirClaimPortal() {
  const mounted = useMounted();
  const { isConnected, isConnecting, isReconnecting, address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isWrongChain = isConnected && chainId !== worldChainSepolia.id;
  const { openConnectModal } = useWalletModal();
  const publicClient = usePublicClient();
  const searchParams = useSearchParams();

  const [vaultInput, setVaultInput] = useState<string>("");
  const [vaultAddress, setVaultAddress] = useState<`0x${string}` | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isEditingVault, setIsEditingVault] = useState(false);

  // Deep link from the vault dashboard (?v=0x...) — skip the manual paste step
  useEffect(() => {
    const v = searchParams.get("v");
    if (v && isAddress(v)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- prefilling from URL on mount, not a derived-state loop
      setVaultInput(v);
      setVaultAddress(v as `0x${string}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = vaultInput.trim();
    if (!trimmed.startsWith("0x") || trimmed.length !== 42) {
      setFeedbackMessage({ text: "Enter a valid 42-character vault address starting with 0x.", isError: true });
      return;
    }
    setFeedbackMessage(null);
    setVaultAddress(trimmed as `0x${string}`);
    setIsEditingVault(false);
  };

  const handleQuickFillSmokeVault = () => {
    setVaultInput(CONTRACT_ADDRESSES.smokeVault);
    setVaultAddress(CONTRACT_ADDRESSES.smokeVault);
    setFeedbackMessage(null);
    setIsEditingVault(false);
  };

  // ── Reads (only when vaultAddress is set) ─────────────────────────
  const { data: rawVaultStatus, isLoading: isStatusLoading, refetch: refetchStatus } = useReadContract({
    address: vaultAddress ?? undefined,
    abi: LegacyVaultABI,
    functionName: "getStatus",
    query: { enabled: Boolean(vaultAddress), refetchInterval: 2000 },
  });

  const { data: isHeirRaw } = useReadContract({
    address: vaultAddress ?? undefined,
    abi: LegacyVaultABI,
    functionName: "isHeir",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(vaultAddress) && Boolean(address) },
  });

  const { data: claimStatusRaw, refetch: refetchClaimStatus } = useReadContract({
    address: vaultAddress ?? undefined,
    abi: LegacyVaultABI,
    functionName: "claimStatus",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(vaultAddress) && Boolean(address), refetchInterval: 2000 },
  });

  const { data: claimInitiatedAtRaw, refetch: refetchInitiatedAt } = useReadContract({
    address: vaultAddress ?? undefined,
    abi: LegacyVaultABI,
    functionName: "claimInitiatedAt",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(vaultAddress) && Boolean(address), refetchInterval: 2000 },
  });

  const { data: contestableWindowRaw } = useReadContract({
    address: vaultAddress ?? undefined,
    abi: LegacyVaultABI,
    functionName: "contestableWindow",
    query: { enabled: Boolean(vaultAddress) },
  });

  const { data: checkInIntervalRaw } = useReadContract({
    address: vaultAddress ?? undefined,
    abi: LegacyVaultABI,
    functionName: "checkInInterval",
    query: { enabled: Boolean(vaultAddress) },
  });

  const { data: gracePeriodRaw } = useReadContract({
    address: vaultAddress ?? undefined,
    abi: LegacyVaultABI,
    functionName: "gracePeriod",
    query: { enabled: Boolean(vaultAddress) },
  });

  const { data: lastCheckInRaw } = useReadContract({
    address: vaultAddress ?? undefined,
    abi: LegacyVaultABI,
    functionName: "lastCheckIn",
    query: { enabled: Boolean(vaultAddress) },
  });

  const { data: vaultOwnerRaw } = useReadContract({
    address: vaultAddress ?? undefined,
    abi: LegacyVaultABI,
    functionName: "owner",
    query: { enabled: Boolean(vaultAddress) },
  });

  const { writeContractAsync } = useWriteContract();

  // ── Heir's real on-chain allocations (assetId is a keccak256 hash,
  // never guessable — discovered via AssetAssigned logs, not hardcoded) ──
  const [heirAllocations, setHeirAllocations] = useState<HeirAllocation[]>([]);
  const [isLoadingAllocations, setIsLoadingAllocations] = useState(false);

  const refetchAllocations = useCallback(async () => {
    if (!publicClient || !vaultAddress || !address || !assetAssignedEvent) return;
    try {
      setIsLoadingAllocations(true);
      const logs = await publicClient.getLogs({
        address: vaultAddress,
        event: assetAssignedEvent,
        args: { heir: address },
        fromBlock: 0n,
        toBlock: "latest",
      });

      const assetIds = Array.from(
        new Set(logs.map((log) => log.args.assetId).filter((id): id is `0x${string}` => Boolean(id)))
      );

      const results = await Promise.all(
        assetIds.map(async (assetId) => {
          const alloc = await publicClient.readContract({
            address: vaultAddress,
            abi: LegacyVaultABI,
            functionName: "allocations",
            args: [assetId],
          });
          // allocations() returns [heir, executor, assetId, exists, executed]
          const [, executor, , exists, executed] = alloc as unknown as [
            `0x${string}`,
            `0x${string}`,
            `0x${string}`,
            boolean,
            boolean
          ];
          return exists ? { assetId, executor, executed } : null;
        })
      );

      setHeirAllocations(results.filter((r): r is HeirAllocation => r !== null));
    } catch (err) {
      console.error("❌ [Claim] Failed to load heir allocations:", err);
    } finally {
      setIsLoadingAllocations(false);
    }
  }, [publicClient, vaultAddress, address]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch of on-chain logs, not a sync setState
    refetchAllocations();
  }, [refetchAllocations]);

  // ── Derived state ─────────────────────────────────────────────────
  const vaultStatus =
    rawVaultStatus !== undefined ? (Number(rawVaultStatus) as VaultStatus) : null;
  const isHeir = Boolean(isHeirRaw);
  const claimStatus =
    claimStatusRaw !== undefined ? (Number(claimStatusRaw) as ClaimStatus) : ClaimStatus.NotInitiated;
  const claimInitiatedAt =
    claimInitiatedAtRaw !== undefined ? BigInt(claimInitiatedAtRaw.toString()) : BigInt(0);
  const contestableWindow =
    contestableWindowRaw !== undefined ? BigInt(contestableWindowRaw.toString()) : BigInt(3600 * 48);
  const checkInInterval =
    checkInIntervalRaw !== undefined ? BigInt(checkInIntervalRaw.toString()) : BigInt(86400 * 30);
  const gracePeriod =
    gracePeriodRaw !== undefined ? BigInt(gracePeriodRaw.toString()) : BigInt(86400 * 7);
  const lastCheckIn =
    lastCheckInRaw !== undefined ? BigInt(lastCheckInRaw.toString()) : BigInt(0);

  const [windowRemaining, setWindowRemaining] = useState<string>("");
  const [canFinalize, setCanFinalize] = useState(false);

  useEffect(() => {
    const update = () => {
      if (claimStatus !== ClaimStatus.Contestable || claimInitiatedAt === BigInt(0)) {
        setWindowRemaining("");
        setCanFinalize(false);
        return;
      }
      const now = Math.floor(Date.now() / 1000);
      const initSec = Number(claimInitiatedAt);
      const windowSec = Number(contestableWindow);
      const endsAt = initSec + windowSec;

      if (Number(lastCheckIn) >= initSec) {
        setWindowRemaining("Invalidated by Owner Check-In");
        setCanFinalize(false);
        return;
      }
      const diff = endsAt - now;
      if (diff <= 0) {
        setWindowRemaining("Window elapsed");
        setCanFinalize(true);
      } else {
        const d = Math.floor(diff / 86400);
        const h = Math.floor((diff % 86400) / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        setWindowRemaining(
          `${d > 0 ? `${d}d ` : ""}${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`
        );
        setCanFinalize(false);
      }
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [claimStatus, claimInitiatedAt, contestableWindow, lastCheckIn]);

  // ── Write handlers ─────────────────────────────────────────────────
  const handleInitiateClaim = async () => {
    if (!publicClient || !vaultAddress) return;
    try {
      setIsProcessing(true);
      setFeedbackMessage(null);
      if (isWrongChain && switchChain) {
        await switchChain({ chainId: worldChainSepolia.id });
      }
      console.log("👉 [Claim] Calling initiateClaim on vault:", vaultAddress);
      const hash = await writeContractAsync({
        chainId: worldChainSepolia.id,
        address: vaultAddress,
        abi: LegacyVaultABI,
        functionName: "initiateClaim",
        gas: 250000n,
      });
      console.log("⏳ [Claim] initiateClaim tx broadcast:", hash);
      await publicClient.waitForTransactionReceipt({ hash });
      console.log("✅ [Claim] initiateClaim confirmed on-chain");

      // Notify the owner immediately via the automated notification network
      fetch("/api/notifications/claim-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultAddress,
          heirAddress: address,
          txHash: hash,
        }),
      }).catch((notifyErr) => {
        console.warn("[Notification] Error triggering claim alert:", notifyErr);
      });

      setFeedbackMessage({ text: "Succession claim initiated. The contestable challenge window is now active on World Chain.", isError: false });
      refetchClaimStatus();
      refetchInitiatedAt();
      refetchStatus();
    } catch (err: unknown) {
      console.error("❌ [Claim] initiateClaim error details:", err);
      const msg = err instanceof Error ? err.message : String(err);
      let translated = msg;
      if (msg.includes("VaultNotRed")) {
        translated = "Cannot initiate claim: Vault is not in Red status. Claims can only be initiated when the owner's check-in interval and grace period have expired.";
      } else if (msg.includes("HeirNotRegistered")) {
        translated = "Cannot initiate claim: Your connected wallet is not a registered heir of this vault.";
      } else if (msg.includes("ClaimAlreadyInitiated")) {
        translated = "A claim is already active for this address.";
      } else if (msg.includes("gas limit") || msg.includes("0x12c1")) {
        translated = "Transaction rejected by node: check failed. Ensure the vault is Red and your address is an authorized heir.";
      }
      setFeedbackMessage({ text: translated, isError: true });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalizeClaim = async () => {
    if (!publicClient || !vaultAddress) return;
    try {
      setIsProcessing(true);
      setFeedbackMessage(null);
      if (isWrongChain && switchChain) {
        await switchChain({ chainId: worldChainSepolia.id });
      }
      console.log("👉 [Claim] Calling finalizeClaim on vault:", vaultAddress);
      const hash = await writeContractAsync({
        chainId: worldChainSepolia.id,
        address: vaultAddress,
        abi: LegacyVaultABI,
        functionName: "finalizeClaim",
        gas: 250000n,
      });
      console.log("⏳ [Claim] finalizeClaim tx broadcast:", hash);
      await publicClient.waitForTransactionReceipt({ hash });
      console.log("✅ [Claim] finalizeClaim confirmed on-chain");
      setFeedbackMessage({ text: "Claim finalized. Succession authorization is now permanent.", isError: false });
      refetchClaimStatus();
      refetchStatus();
    } catch (err: unknown) {
      console.error("❌ [Claim] finalizeClaim error details:", err);
      const msg = err instanceof Error ? err.message : String(err);
      let translated = msg;
      if (msg.includes("ContestableWindowNotElapsed")) {
        translated = "Cannot finalize claim: The contestable challenge window has not yet elapsed.";
      } else if (msg.includes("ClaimNotContestable")) {
        translated = "Cannot finalize claim: Claim is not currently in a contestable state or was invalidated by an owner check-in.";
      } else if (msg.includes("VaultNotRed")) {
        translated = "Cannot finalize claim: Vault is not in Red status.";
      } else if (msg.includes("HeirNotRegistered")) {
        translated = "Cannot finalize claim: Your connected wallet is not an authorized heir.";
      } else if (msg.includes("gas limit") || msg.includes("0x12c1")) {
        translated = "Transaction rejected: Verification failed. The contestable window must elapse before finalization.";
      }
      setFeedbackMessage({ text: translated, isError: true });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteAsset = async (assetId: `0x${string}`) => {
    if (!publicClient || !vaultAddress) return;
    try {
      setIsProcessing(true);
      setFeedbackMessage(null);
      if (isWrongChain && switchChain) {
        await switchChain({ chainId: worldChainSepolia.id });
      }
      console.log("👉 [Claim] Calling executeClaim for asset:", assetId);
      const hash = await writeContractAsync({
        chainId: worldChainSepolia.id,
        address: vaultAddress,
        abi: LegacyVaultABI,
        functionName: "executeClaim",
        args: [assetId],
        gas: 450000n,
      });
      console.log("⏳ [Claim] executeClaim tx broadcast:", hash);
      await publicClient.waitForTransactionReceipt({ hash });
      console.log("✅ [Claim] executeClaim confirmed on-chain");
      setFeedbackMessage({ text: "Asset control transferred successfully via adapter.", isError: false });
      refetchAllocations();
    } catch (err: unknown) {
      console.error("❌ [Claim] executeClaim error details:", err);
      const msg = err instanceof Error ? err.message : "Failed to execute claim";
      let translated = msg;
      if (msg.includes("AssetNotAssigned")) {
        translated = "This asset allocation no longer exists on the vault.";
      } else if (msg.includes("AssetAlreadyClaimed")) {
        translated = "This asset has already been transferred.";
      } else if (msg.includes("ClaimNotFinalized")) {
        translated = "Your succession claim must be finalized before executing asset transfers.";
      } else if (msg.includes("NotAssignedHeir")) {
        translated = "This asset is not allocated to your connected address.";
      }
      setFeedbackMessage({ text: translated, isError: true });
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Safe SSR & Mounting State ─────────────────────────────────────
  if (!mounted || isConnecting || isReconnecting) {
    return <ClaimPortalSkeleton />;
  }

  // ── Not Connected State ───────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="landing-canvas" style={{ minHeight: "calc(100vh - var(--header-height, 64px))", padding: "40px 24px 96px" }}>
        <div className="app-container">
          {/* Navigation Breadcrumb */}
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
                [ 02 // HEIR SUCCESSION PORTAL ]
              </span>
            </div>
          </div>

          {/* Main Instrument Container */}
          <div className="panel-instrument" style={{ background: "#000000", border: "1px solid rgba(255, 255, 255, 0.2)" }}>
            <div style={{ padding: "36px 32px 28px", borderBottom: "1px solid rgba(255, 255, 255, 0.12)" }}>
              <h1
                className="section-title"
                style={{
                  fontFamily: "'Murs Gothic', var(--font-murs-gothic), sans-serif",
                  fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)",
                  marginBottom: "12px",
                }}
              >
                HEIR CLAIM PORTAL
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.6, maxWidth: 640 }}>
                Connect your designated heir wallet to verify beneficiary authorization, inspect on-chain vault health, and initiate or execute succession claims.
              </p>
            </div>

            <div style={{ padding: "36px 32px", display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                {[
                  { tag: "01 //", label: "Direct Vault Entry", desc: "Load a vault by its contract address, or find every vault you're a beneficiary of automatically from your Dashboard." },
                  { tag: "02 //", label: "Contestable Window", desc: "48-hour safety period allows the vault owner to veto unverified succession claims with an Orb proof." },
                  { tag: "03 //", label: "Direct Asset Execution", desc: "Once the challenge period elapses, transfer designated ERC-20 and native tokens directly to your wallet." },
                ].map((feature, i) => (
                  <div key={i} style={{ padding: "16px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <span style={{ color: "var(--accent-brass)", fontSize: "0.75rem", fontWeight: "bold", fontFamily: "var(--font-data)" }}>{feature.tag}</span>
                    <div style={{ fontWeight: 600, fontSize: "0.9375rem", color: "#EDEAE3", margin: "6px 0 4px" }}>{feature.label}</div>
                    <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{feature.desc}</div>
                  </div>
                ))}
              </div>

              <div style={{ paddingTop: "12px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
                <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  Connect your beneficiary wallet to search for and claim succession allocations.
                </div>
                <button
                  type="button"
                  onClick={openConnectModal}
                  className="btn-hero-action"
                  id="heir-connect-btn"
                  style={{ marginTop: 0, padding: "12px 28px" }}
                >
                  <span>CONNECT WALLET</span>
                  <span className="arrow-icon" aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Connected State ───────────────────────────────────────────────
  return (
    <div className="landing-canvas" style={{ minHeight: "calc(100vh - var(--header-height, 64px))", padding: "40px 24px 96px" }}>
      <div className="app-container">
        {/* Navigation Breadcrumb */}
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
              [ 02 // HEIR SUCCESSION PORTAL ]
            </span>
          </div>
        </div>

        {isWrongChain && (
          <div
            style={{
              marginBottom: "24px",
              padding: "16px 20px",
              backgroundColor: "rgba(193, 80, 63, 0.15)",
              border: "1px solid var(--status-red)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ color: "var(--status-red)", fontWeight: 800, fontSize: "0.8125rem", letterSpacing: "0.04em" }}>
                [ WRONG NETWORK ]
              </span>
              <span style={{ color: "#EDEAE3", fontSize: "0.875rem" }}>
                Your wallet is currently connected to Chain ID {chainId}. Please switch to World Chain Sepolia (Chain ID {worldChainSepolia.id}) to verify and execute claims.
              </span>
            </div>
            <button
              type="button"
              onClick={() => switchChain?.({ chainId: worldChainSepolia.id })}
              className="btn-brass"
              style={{ padding: "8px 18px", fontSize: "0.75rem", whiteSpace: "nowrap" }}
            >
              SWITCH TO WORLD CHAIN SEPOLIA
            </button>
          </div>
        )}

        {/* ── Main Panel ───────────────────────────────────────── */}
        <div className="panel-instrument" style={{ background: "#000000", border: "1px solid rgba(255, 255, 255, 0.2)" }}>
          {/* Header */}
          <div style={{ padding: "32px", borderBottom: "1px solid rgba(255, 255, 255, 0.12)" }}>
            <span className="section-tag">[ BENEFICIARY SETTLEMENT & CONTESTATION ]</span>
            <h1 className="section-title" style={{ fontSize: "2rem", marginBottom: "8px" }}>
              HEIR CLAIM PORTAL
            </h1>
            <p style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", maxWidth: 640, lineHeight: 1.6 }}>
              Verify vault liveness expiration, initiate succession claims upon Red status transition, monitor the contestable challenge window, and finalize asset transfers.
            </p>
          </div>

          {/* Vault address search / load form — collapses to a compact bar
              once a vault is loaded, so it stops competing with the result. */}
          {!vaultAddress || isEditingVault ? (
            <div style={{ padding: "28px 32px", borderBottom: "1px solid rgba(255, 255, 255, 0.12)", background: "rgba(255, 255, 255, 0.02)" }}>
              <form onSubmit={handleSearch} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label htmlFor="vault-address-input" className="section-tag" style={{ margin: 0 }}>
                    TARGET VAULT CONTRACT ADDRESS
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {vaultAddress && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingVault(false);
                          setFeedbackMessage(null);
                        }}
                        className="btn-secondary"
                        style={{ fontSize: "0.6875rem", padding: "3px 8px", borderRadius: 0 }}
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleQuickFillSmokeVault}
                      className="btn-secondary"
                      style={{ fontSize: "0.6875rem", padding: "3px 8px", borderRadius: 0 }}
                    >
                      Quick-Fill Smoke Vault
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <input
                    id="vault-address-input"
                    type="text"
                    className="input-instrument font-data"
                    placeholder="0x… (42-character vault address on World Chain)"
                    value={vaultInput}
                    onChange={(e) => setVaultInput(e.target.value)}
                    style={{ flex: 1, minWidth: 280, fontSize: "0.875rem", borderRadius: 0, padding: "12px 16px" }}
                    autoComplete="off"
                    spellCheck={false}
                    autoFocus={isEditingVault}
                  />
                  <button
                    type="submit"
                    className="btn-hero-action"
                    id="lookup-vault-btn"
                    style={{ marginTop: 0, padding: "12px 24px" }}
                  >
                    <span>LOAD VAULT</span>
                    <span className="arrow-icon" aria-hidden="true">→</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div
              style={{
                padding: "14px 32px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
                background: "rgba(255, 255, 255, 0.015)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span className="font-data" style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                Vault: <span style={{ color: "#ffffff" }}>{vaultAddress.slice(0, 10)}…{vaultAddress.slice(-6)}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setVaultInput(vaultAddress);
                  setIsEditingVault(true);
                }}
                className="btn-secondary"
                style={{ fontSize: "0.75rem", padding: "5px 12px", borderRadius: 0 }}
              >
                Change Vault
              </button>
            </div>
          )}

          {/* Prompt if no vault loaded */}
          {!vaultAddress && !feedbackMessage && (
            <div style={{ padding: "64px 32px", textAlign: "center" }}>
              <span className="section-tag">[ AWAITING INPUT ]</span>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", maxWidth: 440, margin: "12px auto 0" }}>
                Enter the vault address above or click Quick-Fill to verify heir credentials and evaluate succession status.
              </p>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.8125rem", margin: "16px auto 0" }}>
                Looking for vaults you&apos;re already a beneficiary of?{" "}
                <Link href="/vault" style={{ color: "var(--accent-brass)" }}>
                  Check your dashboard →
                </Link>
              </p>
            </div>
          )}

          {/* Loading Skeleton State */}
          {vaultAddress && (isStatusLoading || vaultStatus === null) && (
            <div className="animate-fade-up" style={{ padding: "40px 32px" }}>
              <div
                style={{
                  padding: "12px 18px",
                  backgroundColor: "rgba(184, 137, 74, 0.06)",
                  border: "1px solid rgba(184, 137, 74, 0.3)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontFamily: "var(--font-data)",
                  fontSize: "0.8125rem",
                  marginBottom: "24px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: "var(--accent-brass)",
                      boxShadow: "0 0 8px var(--accent-brass)",
                      animation: "pulse-glow 1.5s infinite",
                    }}
                  />
                  <span style={{ color: "var(--accent-brass)" }}>
                    EVALUATING ON-CHAIN SUCCESSION STATUS · {vaultAddress.slice(0, 10)}…{vaultAddress.slice(-8)}
                  </span>
                </div>
                <span style={{ color: "rgba(255, 255, 255, 0.4)" }}>INTERROGATING WORLD CHAIN SEPOLIA</span>
              </div>

              <div
                style={{
                  padding: "28px",
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "18px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className="skeleton-shimmer-brass" style={{ width: "220px", height: "22px" }} />
                  <div className="skeleton-shimmer" style={{ width: "120px", height: "24px" }} />
                </div>
                <div className="skeleton-shimmer" style={{ width: "100%", height: "14px" }} />
                <div className="skeleton-shimmer" style={{ width: "75%", height: "14px" }} />
                <div className="skeleton-shimmer-brass" style={{ width: "240px", height: "44px", marginTop: "12px" }} />
              </div>
            </div>
          )}

          {/* Loaded Vault Information */}
          {vaultAddress && !isStatusLoading && vaultStatus !== null && (
            <>
              {/* Vault status is the single most important thing on this
                  page — the same big dial the owner sees, not a text cell. */}
              <div
                style={{
                  padding: "24px 32px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  justifyContent: "center",
                  background: "rgba(255, 255, 255, 0.01)",
                }}
              >
                <StatusLamp
                  status={vaultStatus}
                  lastCheckIn={lastCheckIn}
                  checkInInterval={checkInInterval}
                  gracePeriod={gracePeriod}
                  livenessRegistered={true}
                />
              </div>

              {/* Succession lifecycle pipeline — where this vault sits in the
                  Active Liveness → Grace → Contestation → Distribution flow. */}
              <div
                style={{
                  padding: "24px 32px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                  background: "rgba(255, 255, 255, 0.01)",
                }}
              >
                <span className="section-tag" style={{ margin: "0 0 16px", display: "block" }}>
                  [ SUCCESSION LIFECYCLE ]
                </span>
                <PipelineVisualizer
                  stages={SUCCESSION_STAGES}
                  currentIndex={successionStageIndex(vaultStatus, claimStatus)}
                />
              </div>

              {/* Telemetry Matrix Strip */}
              <div className="hero-telemetry-strip" style={{ marginTop: 0, borderTop: "none", borderLeft: "none", borderRight: "none" }}>
                <div className="telemetry-cell">
                  <span className="telemetry-label">01 // YOUR BENEFICIARY STATUS</span>
                  <span
                    className="telemetry-value"
                    style={{ color: isHeir ? "var(--accent-brass)" : "var(--text-secondary)" }}
                  >
                    {isHeir ? "AUTHORIZED HEIR" : "NOT DESIGNATED"}
                  </span>
                </div>

                <div className="telemetry-cell" style={{ gridColumn: "span 3" }}>
                  <span className="telemetry-label">02 // OWNER ADDRESS</span>
                  <span className="font-data" style={{ fontSize: "0.875rem", color: "#ffffff" }}>
                    {vaultOwnerRaw ? String(vaultOwnerRaw) : "Unknown"}
                  </span>
                </div>
              </div>

              {/* Status Section & Action Area */}
              <div style={{ padding: "40px 32px" }}>
                {claimStatus === ClaimStatus.Contestable ? (
                  /* ── Contestable Window Active ── */
                  <div
                    className="lifecycle-card lifecycle-card--amber"
                    style={{ padding: "40px 32px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}
                  >
                    <div className="lifecycle-card-top" style={{ width: "100%", justifyContent: "center" }}>
                      <span className="lifecycle-badge" style={{ color: "var(--status-amber)" }}>
                        <span className="network-dot" style={{ backgroundColor: "var(--status-amber)" }} />
                        CONTESTABLE CHALLENGE WINDOW ACTIVE
                      </span>
                    </div>

                    <div>
                      <span className="telemetry-label" style={{ display: "block", marginBottom: 8 }}>
                        WINDOW CLOSES IN
                      </span>
                      <div className="font-data" style={{ fontSize: "2.8rem", fontWeight: 800, color: "#ffffff", letterSpacing: "0.04em" }}>
                        {windowRemaining || "CALCULATING..."}
                      </div>
                    </div>

                    <div
                      style={{
                        border: "1px solid var(--status-amber)",
                        backgroundColor: "rgba(217, 154, 61, 0.08)",
                        padding: "16px 20px",
                        maxWidth: 520,
                        textAlign: "left",
                      }}
                    >
                      <p style={{ fontSize: "0.875rem", color: "#ffffff", fontWeight: 600, marginBottom: 4 }}>
                        LIVING OWNER VETO SAFEGUARD ACTIVE
                      </p>
                      <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        The living owner can invalidate this succession attempt at any point during this contestable window by executing a single World ID proof. If no check-in is submitted before the timer reaches zero, the claim becomes permanently finalizable.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleFinalizeClaim}
                      disabled={!canFinalize || isProcessing}
                      className="btn-hero-action"
                      style={{ marginTop: 8 }}
                      id="finalize-claim-btn"
                    >
                      <span>{isProcessing ? "FINALIZING ON WORLD CHAIN…" : canFinalize ? "FINALIZE SUCCESSION CLAIM" : "WINDOW MUST ELAPSE TO FINALIZE"}</span>
                      <span className="arrow-icon" aria-hidden="true">→</span>
                    </button>
                  </div>
                ) : claimStatus === ClaimStatus.Claimed ? (
                  /* ── Claim Settled & Finalized ── */
                  <div
                    className="lifecycle-card lifecycle-card--green"
                    style={{ padding: "40px 32px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}
                  >
                    <span className="lifecycle-badge" style={{ color: "var(--status-green)" }}>
                      <span className="network-dot" style={{ backgroundColor: "var(--status-green)" }} />
                      SUCCESSION SETTLED & PERMANENT
                    </span>

                    <h2 className="section-title" style={{ fontSize: "1.85rem", marginBottom: 4 }}>
                      CLAIM FINALIZED
                    </h2>
                    <p style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", maxWidth: 500, lineHeight: 1.6 }}>
                      The contestable window elapsed without an owner check-in. Control transfer authorization is permanently granted for your allocated assets.
                    </p>

                    {isLoadingAllocations ? (
                      <div className="font-data" style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                        SCANNING VAULT FOR ALLOCATED ASSETS…
                      </div>
                    ) : heirAllocations.length === 0 ? (
                      <div style={{ border: "1px solid rgba(255, 255, 255, 0.12)", backgroundColor: "rgba(255, 255, 255, 0.03)", padding: "16px 20px", fontSize: "0.875rem", color: "var(--text-secondary)", maxWidth: 480 }}>
                        No assets are currently allocated to your address on this vault.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 480 }}>
                        {heirAllocations.map((alloc) => (
                          <div
                            key={alloc.assetId}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 12,
                              padding: "12px 16px",
                              border: "1px solid rgba(255, 255, 255, 0.12)",
                              backgroundColor: "rgba(255, 255, 255, 0.02)",
                              textAlign: "left",
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div className="font-data" style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                {alloc.assetId.slice(0, 10)}…{alloc.assetId.slice(-8)}
                              </div>
                              <div className="font-data" style={{ fontSize: "0.75rem", color: alloc.executed ? "var(--status-green)" : "#ffffff" }}>
                                Executor: {alloc.executor.slice(0, 8)}…{alloc.executor.slice(-6)} {alloc.executed ? "· CLAIMED" : ""}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleExecuteAsset(alloc.assetId)}
                              disabled={isProcessing || alloc.executed}
                              className="btn-hero-action"
                              style={{ marginTop: 0, padding: "8px 16px", fontSize: "0.75rem", flexShrink: 0 }}
                            >
                              <span>{alloc.executed ? "ALREADY CLAIMED" : isProcessing ? "EXECUTING…" : "EXECUTE TRANSFER"}</span>
                              {!alloc.executed && <span className="arrow-icon" aria-hidden="true">→</span>}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Not Initiated State ── */
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center", padding: "16px 0" }}>
                    <span className="section-tag">[ SUCCESSION STATUS ]</span>
                    <h2 className="section-title" style={{ fontSize: "1.75rem", marginBottom: 0 }}>
                      {vaultStatus === VaultStatus.Red ? "READY FOR SUCCESSION INITIATION" : "SUCCESSION CURRENTLY INELIGIBLE"}
                    </h2>

                    <p style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", maxWidth: 520, lineHeight: 1.6 }}>
                      {vaultStatus !== VaultStatus.Red
                        ? "This vault is in healthy (Green) or grace period (Amber) state. Claims can only be initiated once the vault transitions to Status Red following check-in timeout and grace expiry."
                        : "The vault has transitioned to Status Red. As an authorized heir, you can initiate the contestable challenge window."}
                    </p>

                    {vaultStatus === VaultStatus.Red && isHeir && (
                      <button
                        type="button"
                        onClick={handleInitiateClaim}
                        disabled={isProcessing}
                        className="btn-hero-action"
                        id="initiate-claim-btn"
                        style={{ marginTop: 8 }}
                      >
                        <span>{isProcessing ? "INITIATING ON WORLD CHAIN…" : "INITIATE SUCCESSION CLAIM"}</span>
                        <span className="arrow-icon" aria-hidden="true">→</span>
                      </button>
                    )}

                    {vaultStatus === VaultStatus.Red && !isHeir && (
                      <div style={{ padding: "12px 20px", border: "1px solid var(--status-amber)", backgroundColor: "rgba(217, 154, 61, 0.08)" }}>
                        <span style={{ color: "var(--status-amber)", fontWeight: 600, fontSize: "0.875rem" }}>
                          Connected address ({address?.slice(0, 6)}…{address?.slice(-4)}) is not on the authorized heirs list.
                        </span>
                      </div>
                    )}

                    {vaultStatus !== VaultStatus.Red && (
                      <div
                        style={{
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          backgroundColor: "rgba(255, 255, 255, 0.03)",
                          padding: "16px 20px",
                          fontSize: "0.8125rem",
                          color: "var(--text-secondary)",
                          textAlign: "left",
                          maxWidth: 480,
                        }}
                      >
                        <div style={{ color: "#ffffff", fontWeight: 600, marginBottom: 4 }}>
                          PROTECTION RULES ENFORCED
                        </div>
                        Claims are cryptographically locked until the owner misses their periodic World ID check-in and the entire grace period window elapses.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Guardian death-attestation vote (accelerates inheritance). */}
              <GuardianAttestationPanel vaultAddress={vaultAddress} viewerAddress={address} />

              {/* Encrypted message the owner sealed to this heir. */}
              {address && (
                <SealedMessageHeirPanel
                  vaultAddress={vaultAddress}
                  heirAddress={address}
                  isHeir={isHeir}
                />
              )}
            </>
          )}

          {/* Feedback message banner */}
          {feedbackMessage && (
            <div className="animate-banner-enter" style={{ padding: "0 32px 32px" }}>
              <div
                style={{
                  padding: "14px 20px",
                  backgroundColor: feedbackMessage.isError ? "rgba(193, 80, 63, 0.12)" : "rgba(76, 175, 109, 0.12)",
                  border: `1px solid ${feedbackMessage.isError ? "var(--status-red)" : "var(--status-green)"}`,
                  fontSize: "0.875rem",
                  color: "#ffffff",
                  fontFamily: "var(--font-data)",
                }}
              >
                {feedbackMessage.text}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
