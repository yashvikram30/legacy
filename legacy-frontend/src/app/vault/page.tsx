"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useAccount, useReadContract, useWriteContract, usePublicClient, useChainId, useSwitchChain } from "wagmi";
import { useWalletModal } from "@/components/WalletModal";
import {
  CONTRACT_ADDRESSES,
  VaultStatus,
  worldChainSepolia,
} from "@/lib/constants";
import { LegacyVaultFactoryABI, LegacyVaultABI } from "@/lib/contracts/abis";
import { VaultDashboardHub } from "@/components/VaultDashboardHub";
import { VaultConfigRail } from "@/components/VaultConfigRail";
import { LivenessPanel } from "@/components/LivenessPanel";
import { ActivityLog } from "@/components/ActivityLog";
import { CheckInModal } from "@/components/CheckInModal";
import { HeirList } from "@/components/HeirList";
import { AssetList, AssetRecord } from "@/components/AssetList";
import { VaultParameters } from "@/components/VaultParameters";
import { WatchdogAlertPanel } from "@/components/WatchdogAlertPanel";
import {
  VaultDashboardSkeleton,
  LivenessPanelSkeleton,
} from "@/components/Skeleton";
import {
  VaultDeploymentModal,
  DeploymentStage,
} from "@/components/VaultDeploymentModal";
import { useMounted } from "@/hooks/useMounted";

export default function VaultDashboardPage() {
  const mounted = useMounted();
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isWrongChain = isConnected && chainId !== worldChainSepolia.id;
  const { openConnectModal } = useWalletModal();
  const publicClient = usePublicClient();

  // No persisted "last vault" — landing on /vault always shows the dashboard
  // hub first; a specific vault is only opened by an explicit user action.
  const [selectedVaultState, setSelectedVaultState] = useState<`0x${string}` | null>(null);
  const [optimisticLiveness, setOptimisticLiveness] = useState<{ vault: `0x${string}`; value: boolean } | null>(null);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [orchestratedMessage, setOrchestratedMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"heirs" | "assets" | "parameters" | "activity" | "watchdog">("heirs");
  const [assetList, setAssetList] = useState<AssetRecord[]>([]);

  // Deployment state
  const [isCreatingVault, setIsCreatingVault] = useState(false);
  const [deployStage, setDeployStage] = useState<DeploymentStage>("idle");
  const [deployTxHash, setDeployTxHash] = useState<string | null>(null);
  const [deployedVaultAddr, setDeployedVaultAddr] = useState<string | null>(null);
  const [deployErrorMessage, setDeployErrorMessage] = useState<string | null>(null);

  const handleSelectVault = (vaultAddr: `0x${string}`) => {
    setSelectedVaultState(vaultAddr);
  };

  const handleBackToDashboard = () => {
    setSelectedVaultState(null);
  };

  // ── Contract reads ───────────────────────────────────────────────
  const { data: userVaults, isLoading: isVaultsLoading, refetch: refetchVaults } = useReadContract({
    address: CONTRACT_ADDRESSES.factory,
    abi: LegacyVaultFactoryABI,
    functionName: "getVaults",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const selectedVault =
    selectedVaultState && userVaults?.includes(selectedVaultState) ? selectedVaultState : null;

  const { data: rawStatus, isLoading: isStatusLoading, refetch: refetchStatus } = useReadContract({
    address: selectedVault ?? undefined,
    abi: LegacyVaultABI,
    functionName: "getStatus",
    query: { enabled: Boolean(selectedVault), refetchInterval: 3000 },
  });

  const { data: lastCheckInRaw, refetch: refetchLastCheckIn } = useReadContract({
    address: selectedVault ?? undefined,
    abi: LegacyVaultABI,
    functionName: "lastCheckIn",
    query: { enabled: Boolean(selectedVault), refetchInterval: 3000 },
  });

  const { data: checkInIntervalRaw, refetch: refetchInterval } = useReadContract({
    address: selectedVault ?? undefined,
    abi: LegacyVaultABI,
    functionName: "checkInInterval",
    query: { enabled: Boolean(selectedVault) },
  });

  const { data: gracePeriodRaw, refetch: refetchGrace } = useReadContract({
    address: selectedVault ?? undefined,
    abi: LegacyVaultABI,
    functionName: "gracePeriod",
    query: { enabled: Boolean(selectedVault) },
  });

  const { data: contestableWindowRaw, refetch: refetchContestable } = useReadContract({
    address: selectedVault ?? undefined,
    abi: LegacyVaultABI,
    functionName: "contestableWindow",
    query: { enabled: Boolean(selectedVault) },
  });

  const { data: livenessRegisteredRaw, refetch: refetchLiveness } = useReadContract({
    address: selectedVault ?? undefined,
    abi: LegacyVaultABI,
    functionName: "livenessRegistered",
    query: { enabled: Boolean(selectedVault) },
  });

  const { data: rawHeirs, refetch: refetchHeirs } = useReadContract({
    address: selectedVault ?? undefined,
    abi: LegacyVaultABI,
    functionName: "getHeirs",
    query: { enabled: Boolean(selectedVault) },
  });

  const { data: vaultOwner } = useReadContract({
    address: selectedVault ?? undefined,
    abi: LegacyVaultABI,
    functionName: "owner",
    query: { enabled: Boolean(selectedVault) },
  });

  const { data: vaultVerifier, refetch: refetchVerifier } = useReadContract({
    address: selectedVault ?? undefined,
    abi: LegacyVaultABI,
    functionName: "verifier",
    query: { enabled: Boolean(selectedVault) },
  });

  const { writeContractAsync } = useWriteContract();

  // ── Derived state ─────────────────────────────────────────────────
  const status = rawStatus !== undefined ? (Number(rawStatus) as VaultStatus) : VaultStatus.Green;
  const lastCheckIn = lastCheckInRaw !== undefined ? BigInt(lastCheckInRaw.toString()) : BigInt(0);
  const checkInInterval = checkInIntervalRaw !== undefined ? BigInt(checkInIntervalRaw.toString()) : BigInt(86400 * 30);
  const gracePeriod = gracePeriodRaw !== undefined ? BigInt(gracePeriodRaw.toString()) : BigInt(86400 * 7);
  const contestableWindow = contestableWindowRaw !== undefined ? BigInt(contestableWindowRaw.toString()) : BigInt(3600 * 48);
  const livenessRegistered =
    optimisticLiveness && selectedVault && optimisticLiveness.vault.toLowerCase() === selectedVault.toLowerCase()
      ? optimisticLiveness.value
      : Boolean(livenessRegisteredRaw);
  const heirs = (rawHeirs as readonly `0x${string}`[]) || [];

  const refetchAll = useCallback(() => {
    refetchStatus();
    refetchLastCheckIn();
    refetchInterval();
    refetchGrace();
    refetchContestable();
    refetchLiveness();
    refetchHeirs();
    refetchVerifier();
  }, [refetchStatus, refetchLastCheckIn, refetchInterval, refetchGrace, refetchContestable, refetchLiveness, refetchHeirs, refetchVerifier]);

  // ── Handlers ──────────────────────────────────────────────────────
  const handleCheckInSuccess = (message: string) => {
    setIsSettling(true);
    setOrchestratedMessage(message);
    refetchAll();
    setTimeout(() => setIsSettling(false), 700);
    setTimeout(() => setOrchestratedMessage(null), 9000);
  };

  const handlePerformCheckInTx = async (
    root: bigint,
    nullifierHash: bigint,
    proof: readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint]
  ) => {
    if (!publicClient || !selectedVault) throw new Error("Client or vault unavailable");
    try {
      console.log("👉 [Vault] Calling checkIn on contract:", {
        vault: selectedVault,
        root: root.toString(),
        nullifierHash: nullifierHash.toString(),
        proofLength: proof.length,
      });
      const hash = await writeContractAsync({
        chainId: worldChainSepolia.id,
        address: selectedVault,
        abi: LegacyVaultABI,
        functionName: "checkIn",
        args: [root, nullifierHash, proof],
        gas: 450000n,
      });
      console.log("⏳ [Vault] checkIn tx broadcast:", hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "reverted") {
        console.error("❌ [Vault] checkIn transaction reverted on-chain:", receipt);
        throw new Error("Check-in transaction reverted on-chain (NullifierMismatch): The submitted World ID nullifier does not match the identity originally registered for this vault.");
      }
      console.log("✅ [Vault] checkIn confirmed on-chain");
    } catch (err: unknown) {
      console.error("❌ [Vault] checkIn failed:", err);
      throw err;
    }
  };

  const handleRegisterLivenessTx = async (
    root: bigint,
    nullifierHash: bigint,
    proof: readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint]
  ) => {
    if (!publicClient || !selectedVault) throw new Error("Client or vault unavailable");
    try {
      console.log("👉 [Vault] Calling registerLiveness on contract:", {
        vault: selectedVault,
        root: root.toString(),
        nullifierHash: nullifierHash.toString(),
        proofLength: proof.length,
      });
      const hash = await writeContractAsync({
        chainId: worldChainSepolia.id,
        address: selectedVault,
        abi: LegacyVaultABI,
        functionName: "registerLiveness",
        args: [root, nullifierHash, proof],
        gas: 450000n,
      });
      console.log("⏳ [Vault] registerLiveness tx broadcast:", hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "reverted") {
        console.error("❌ [Vault] registerLiveness transaction reverted on-chain:", receipt);
        throw new Error("Liveness registration reverted on-chain: This vault may already have an enrolled identity.");
      }
      if (selectedVault) {
        setOptimisticLiveness({ vault: selectedVault, value: true });
      }

      // If vault is not Green (e.g. interval expired before initial enrollment), immediately check in to restore Green
      try {
        const currentStatus = await publicClient.readContract({
          address: selectedVault,
          abi: LegacyVaultABI,
          functionName: "getStatus",
        });
        if (Number(currentStatus) !== 0) {
          console.log("👉 [Vault] Vault is currently not Green, automatically checking in to restore Green...");
          const checkInHash = await writeContractAsync({
            chainId: worldChainSepolia.id,
            address: selectedVault,
            abi: LegacyVaultABI,
            functionName: "checkIn",
            args: [root, nullifierHash, proof],
            gas: 450000n,
          });
          await publicClient.waitForTransactionReceipt({ hash: checkInHash });
          console.log("✅ [Vault] Auto check-in confirmed, vault restored to Green");
        }
      } catch (autoErr) {
        console.warn("⚠️ [Vault] Auto check-in follow-up warning:", autoErr);
      }

      refetchAll();
    } catch (err: unknown) {
      console.error("❌ [Vault] registerLiveness failed:", err);
      throw err;
    }
  };

  const handleAddHeir = async (heir: `0x${string}`) => {
    if (!publicClient || !selectedVault) throw new Error("Client or vault unavailable");
    try {
      console.log("👉 [Vault] Calling addHeir:", { vault: selectedVault, heir });
      // Pre-flight check: ensure vault is Green before attempting transaction
      const currentStatus = await publicClient.readContract({
        address: selectedVault,
        abi: LegacyVaultABI,
        functionName: "getStatus",
      });
      if (Number(currentStatus) !== 0) {
        throw new Error(
          `Cannot add heir: Vault is currently in ${
            Number(currentStatus) === 1 ? "Amber" : "Red"
          } status. Heir modifications are locked while vault is not in Green status. Please perform a World ID check-in above to restore Green status first.`
        );
      }

      const hash = await writeContractAsync({
        chainId: worldChainSepolia.id,
        address: selectedVault,
        abi: LegacyVaultABI,
        functionName: "addHeir",
        args: [heir],
        gas: 250000n,
      });
      console.log("⏳ [Vault] addHeir tx broadcast:", hash);
      await publicClient.waitForTransactionReceipt({ hash });
      console.log("✅ [Vault] addHeir confirmed on-chain");
      refetchHeirs();
    } catch (err: unknown) {
      console.error("❌ [Vault] addHeir error details:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("HeirChangesLocked") ||
        msg.includes("6eefa6e8") ||
        msg.toLowerCase().includes("gas limit") ||
        msg.includes("0x12c1")
      ) {
        throw new Error("Cannot add heir: Vault is not Green. Heir modifications are locked while vault is Amber or Red. Perform a World ID check-in above to restore Green status first.");
      }
      throw err;
    }
  };

  const handleRemoveHeir = async (heir: `0x${string}`) => {
    if (!publicClient || !selectedVault) throw new Error("Client or vault unavailable");
    try {
      console.log("👉 [Vault] Calling removeHeir:", { vault: selectedVault, heir });
      const currentStatus = await publicClient.readContract({
        address: selectedVault,
        abi: LegacyVaultABI,
        functionName: "getStatus",
      });
      if (Number(currentStatus) !== 0) {
        throw new Error(
          `Cannot remove heir: Vault is currently in ${
            Number(currentStatus) === 1 ? "Amber" : "Red"
          } status. Heir modifications are locked while vault is not in Green status. Please perform a World ID check-in above to restore Green status first.`
        );
      }

      const hash = await writeContractAsync({
        chainId: worldChainSepolia.id,
        address: selectedVault,
        abi: LegacyVaultABI,
        functionName: "removeHeir",
        args: [heir],
        gas: 200000n,
      });
      console.log("⏳ [Vault] removeHeir tx broadcast:", hash);
      await publicClient.waitForTransactionReceipt({ hash });
      console.log("✅ [Vault] removeHeir confirmed on-chain");
      refetchHeirs();
    } catch (err: unknown) {
      console.error("❌ [Vault] removeHeir error details:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("HeirChangesLocked") ||
        msg.includes("6eefa6e8") ||
        msg.toLowerCase().includes("gas limit") ||
        msg.includes("0x12c1")
      ) {
        throw new Error("Cannot remove heir: Vault is not Green. Heir modifications are locked while vault is Amber or Red. Perform a World ID check-in above to restore Green status first.");
      }
      throw err;
    }
  };

  const handleAssignAsset = async (
    assetId: `0x${string}`,
    heir: `0x${string}`,
    executor: `0x${string}`,
    label: string
  ) => {
    if (!publicClient || !selectedVault) throw new Error("Client or vault unavailable");
    try {
      console.log("👉 [Vault] Calling assignAsset:", { vault: selectedVault, assetId, heir, executor, label });
      const currentStatus = await publicClient.readContract({
        address: selectedVault,
        abi: LegacyVaultABI,
        functionName: "getStatus",
      });
      if (Number(currentStatus) !== 0) {
        throw new Error(
          `Cannot assign asset: Vault is currently in ${
            Number(currentStatus) === 1 ? "Amber" : "Red"
          } status. Asset assignments are locked while vault is not in Green status. Please perform a World ID check-in above to restore Green status first.`
        );
      }

      const hash = await writeContractAsync({
        chainId: worldChainSepolia.id,
        address: selectedVault,
        abi: LegacyVaultABI,
        functionName: "assignAsset",
        args: [assetId, heir, executor],
        gas: 300000n,
      });
      console.log("⏳ [Vault] assignAsset tx broadcast:", hash);
      await publicClient.waitForTransactionReceipt({ hash });
      console.log("✅ [Vault] assignAsset confirmed on-chain");
      setAssetList((prev) => [...prev, { assetId, label, assetType: "ERC20", heir, executor, executed: false }]);
    } catch (err: unknown) {
      console.error("❌ [Vault] assignAsset error details:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("HeirChangesLocked") ||
        msg.includes("6eefa6e8") ||
        msg.toLowerCase().includes("gas limit") ||
        msg.includes("0x12c1")
      ) {
        throw new Error("Cannot assign asset: Vault is not Green. Asset assignments are locked while vault is Amber or Red. Perform a World ID check-in above to restore Green status first.");
      }
      throw err;
    }
  };

  const handleRemoveAsset = async (assetId: `0x${string}`) => {
    if (!publicClient || !selectedVault) throw new Error("Client or vault unavailable");
    try {
      console.log("👉 [Vault] Calling removeAsset:", { vault: selectedVault, assetId });
      const currentStatus = await publicClient.readContract({
        address: selectedVault,
        abi: LegacyVaultABI,
        functionName: "getStatus",
      });
      if (Number(currentStatus) !== 0) {
        throw new Error(
          `Cannot remove asset: Vault is currently in ${
            Number(currentStatus) === 1 ? "Amber" : "Red"
          } status. Asset modifications are locked while vault is not in Green status. Please perform a World ID check-in above to restore Green status first.`
        );
      }

      const hash = await writeContractAsync({
        chainId: worldChainSepolia.id,
        address: selectedVault,
        abi: LegacyVaultABI,
        functionName: "removeAsset",
        args: [assetId],
        gas: 200000n,
      });
      console.log("⏳ [Vault] removeAsset tx broadcast:", hash);
      await publicClient.waitForTransactionReceipt({ hash });
      console.log("✅ [Vault] removeAsset confirmed on-chain");
      setAssetList((prev) => prev.filter((a) => a.assetId !== assetId));
    } catch (err: unknown) {
      console.error("❌ [Vault] removeAsset error details:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("HeirChangesLocked") ||
        msg.includes("6eefa6e8") ||
        msg.toLowerCase().includes("gas limit") ||
        msg.includes("0x12c1")
      ) {
        throw new Error("Cannot remove asset: Vault is not Green. Asset modifications are locked while vault is Amber or Red. Perform a World ID check-in above to restore Green status first.");
      }
      throw err;
    }
  };

  const handleUpdateParameters = async (
    newInterval: bigint,
    newGrace: bigint,
    newContestable: bigint
  ) => {
    if (!publicClient || !selectedVault) throw new Error("Client or vault unavailable");
    try {
      console.log("👉 [Vault] Calling updateParameters:", { vault: selectedVault, newInterval, newGrace, newContestable });
      const currentStatus = await publicClient.readContract({
        address: selectedVault,
        abi: LegacyVaultABI,
        functionName: "getStatus",
      });
      if (Number(currentStatus) !== 0) {
        throw new Error(
          `Cannot update parameters: Vault is currently in ${
            Number(currentStatus) === 1 ? "Amber" : "Red"
          } status. Parameters are locked while vault is not in Green status. Please perform a World ID check-in above to restore Green status first.`
        );
      }

      const hash = await writeContractAsync({
        chainId: worldChainSepolia.id,
        address: selectedVault,
        abi: LegacyVaultABI,
        functionName: "updateParameters",
        args: [newInterval, newGrace, newContestable],
        gas: 200000n,
      });
      console.log("⏳ [Vault] updateParameters tx broadcast:", hash);
      await publicClient.waitForTransactionReceipt({ hash });
      console.log("✅ [Vault] updateParameters confirmed on-chain");
      refetchInterval();
      refetchGrace();
      refetchContestable();
    } catch (err: unknown) {
      console.error("❌ [Vault] updateParameters error details:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("ParametersLockedWhileNotGreen") ||
        msg.includes("6eefa6e8") ||
        msg.toLowerCase().includes("gas limit") ||
        msg.includes("0x12c1")
      ) {
        throw new Error("Cannot update parameters: Vault is not Green. Parameters are locked while vault is Amber or Red. Perform a World ID check-in above to restore Green status first.");
      }
      throw err;
    }
  };

  const handleCreateVault = async () => {
    if (!publicClient) throw new Error("Public client unavailable");
    try {
      setIsCreatingVault(true);
      setDeployErrorMessage(null);
      setDeployTxHash(null);
      setDeployedVaultAddr(null);
      setDeployStage("requesting_signature");

      if (isWrongChain && switchChain) {
        await switchChain({ chainId: worldChainSepolia.id });
      }
      console.log("👉 [Vault] Calling createVault on factory:", {
        factory: CONTRACT_ADDRESSES.factory,
        verifier: CONTRACT_ADDRESSES.verifier,
        checkInInterval: 45n,
        gracePeriod: 15n,
        contestableWindow: 45n,
      });
      const hash = await writeContractAsync({
        chainId: worldChainSepolia.id,
        address: CONTRACT_ADDRESSES.factory,
        abi: LegacyVaultFactoryABI,
        functionName: "createVault",
        args: [
          CONTRACT_ADDRESSES.verifier,
          45n, // 45s check-in interval
          15n, // 15s grace period
          45n, // 45s contestable window
        ],
      });
      setDeployTxHash(hash);
      setDeployStage("confirming");
      console.log("⏳ [Vault] createVault tx broadcast:", hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log("✅ [Vault] createVault confirmed on-chain");
      setDeployStage("indexing");
      const vaultCreatedLog = receipt.logs.find(
        (l) => l.topics[0]?.toLowerCase() === "0x5d9c31ffa0fecffd7cf379989a3c7af252f0335e0d2a1320b55245912c781f53"
      );
      let newVaultAddr: `0x${string}` | null = null;
      if (vaultCreatedLog?.topics[2]) {
        newVaultAddr = `0x${vaultCreatedLog.topics[2].slice(26)}` as `0x${string}`;
      }
      setDeployStage("syncing");
      const { data: updatedVaults } = await refetchVaults();
      if (newVaultAddr) {
        setDeployedVaultAddr(newVaultAddr);
        handleSelectVault(newVaultAddr);
      } else if (updatedVaults && updatedVaults.length > 0) {
        const fallbackVault = updatedVaults[updatedVaults.length - 1];
        setDeployedVaultAddr(fallbackVault);
        handleSelectVault(fallbackVault);
      }
      refetchAll();
      setDeployStage("success");
      setTimeout(() => {
        setIsCreatingVault(false);
        setDeployStage("idle");
      }, 1800);
    } catch (err: unknown) {
      console.error("❌ [Vault] createVault error details:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("rejected") || msg.includes("4001") || msg.includes("User denied") || msg.includes("denied")) {
        setDeployErrorMessage("Creation authorization was rejected in wallet.");
      } else {
        setDeployErrorMessage(msg);
      }
      setDeployStage("error");
    }
  };

  // ── Safe SSR & Mounting State ─────────────────────────────────────
  if (!mounted || isConnecting || isReconnecting) {
    return <VaultDashboardSkeleton message="CONNECTING WALLET" />;
  }

  // ── Not Connected State ───────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="landing-canvas" style={{ minHeight: "calc(100vh - var(--header-height, 64px))", padding: "40px 24px 96px" }}>
        <div className="app-container">
          {/* Navigation Breadcrumb Bar */}
          <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8125rem" }}>
              <Link
                href="/"
                style={{ color: "var(--text-secondary)", textDecoration: "none" }}
              >
                Home
              </Link>
              <span style={{ color: "rgba(255, 255, 255, 0.25)" }}>/</span>
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>Vault Console</span>
            </div>
          </div>

          {/* Primary Instrument Box */}
          <div className="panel-instrument" style={{ background: "#000000", border: "1px solid rgba(255, 255, 255, 0.15)" }}>
            <div style={{ padding: "36px 32px 28px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
              <h1
                className="section-title"
                style={{
                  fontFamily: "'Murs Gothic', var(--font-murs-gothic), sans-serif",
                  fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)",
                  marginBottom: "12px",
                }}
              >
                SUCCESSION VAULT INSTRUMENT
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.6, maxWidth: 640 }}>
                Connect your wallet to configure your non-custodial succession vault, conduct World ID Orb liveness check-ins, designate beneficiaries, and adjust timelock parameters.
              </p>
            </div>

            <div style={{ padding: "36px 32px", display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                {[
                  { tag: "01", label: "Autonomous Heartbeat", desc: "World ID Orb-verified zero-knowledge liveness check-ins." },
                  { tag: "02", label: "Self-Sovereign Vault", desc: "Independent smart contract vault owned exclusively by you." },
                  { tag: "03", label: "Beneficiary Control", desc: "Granular heir designation & asset allocation percentages." },
                  { tag: "04", label: "Challenge Window", desc: "48-hour dispute-resistant contestable challenge window." },
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
                  Connect an Ethereum / World Chain compatible wallet to access your vault.
                </div>
                <button
                  type="button"
                  onClick={openConnectModal}
                  className="btn-hero-action"
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

  // ── Loading state while reading factory vaults ─────────────────────
  if (isVaultsLoading || (userVaults === undefined && address)) {
    return <VaultDashboardSkeleton message="LOADING YOUR VAULTS" />;
  }

  // ── Connected State ───────────────────────────────────────────────
  return (
    <div className="landing-canvas" style={{ minHeight: "calc(100vh - var(--header-height, 64px))", padding: "32px 24px 96px" }}>
      <div style={{ maxWidth: "1600px", margin: "0 auto", width: "100%" }}>
        {isWrongChain && (
          <div
            style={{
              marginBottom: "20px",
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
                Your wallet is currently connected to Chain ID {chainId}. Please switch to World Chain Sepolia (Chain ID {worldChainSepolia.id}) to deploy and manage vaults.
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

        {/* ── Dashboard Hub (default) or 3-Column Vault Console ──────── */}
        {!selectedVault ? (
          <div className="panel-instrument" style={{ background: "#000000", border: "1px solid rgba(255, 255, 255, 0.15)" }}>
            <VaultDashboardHub
              ownedVaults={userVaults || []}
              isLoadingOwned={isVaultsLoading}
              onManageVault={handleSelectVault}
              onCreateVault={handleCreateVault}
              isCreatingVault={isCreatingVault}
              isWrongChain={Boolean(isWrongChain)}
              onSwitchChain={() => switchChain?.({ chainId: worldChainSepolia.id })}
            />
          </div>
        ) : (
        <div className="vault-dashboard-wrapper">
          {/* Main Content Area (flex: 1) */}
          <div className="vault-dashboard-main">
              <>
                {/* Slim context bar: replaces the old vault-switcher sidebar,
                    which was redundant now that the dashboard hub owns vault
                    switching/creation. Just orientation + a way back. */}
                <div
                  style={{
                    padding: "14px 32px",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    flexWrap: "wrap",
                    background: "rgba(255, 255, 255, 0.015)",
                  }}
                >
                  <button
                    type="button"
                    onClick={handleBackToDashboard}
                    className="btn-secondary"
                    style={{ padding: "6px 12px", fontSize: "0.75rem", borderRadius: 0, gap: "6px" }}
                  >
                    <span aria-hidden="true">←</span> All Vaults
                  </button>
                  <span className="font-data" style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    {selectedVault.slice(0, 10)}…{selectedVault.slice(-6)}
                  </span>
                </div>

                {/* Orchestrated message banner */}
                {orchestratedMessage && (
                  <div
                    className="animate-banner-enter"
                    role="status"
                    style={{
                      backgroundColor: "rgba(76, 175, 109, 0.12)",
                      borderBottom: "1px solid var(--status-green)",
                      padding: "14px 32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      color: "var(--status-green)",
                      fontFamily: "var(--font-display)",
                      fontSize: "0.9375rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span className="network-dot" style={{ backgroundColor: "var(--status-green)" }} />
                      <span>{orchestratedMessage}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOrchestratedMessage(null)}
                      aria-label="Dismiss"
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--status-green)",
                        cursor: "pointer",
                        fontSize: "1rem",
                        lineHeight: 1,
                        padding: "2px 4px",
                        opacity: 0.7,
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Legacy Verifier Banner */}
                {vaultVerifier && (vaultVerifier as string).toLowerCase() !== CONTRACT_ADDRESSES.verifier.toLowerCase() && (
                  <div
                    style={{
                      backgroundColor: "rgba(230, 162, 60, 0.08)",
                      borderBottom: "1px solid rgba(230, 162, 60, 0.3)",
                      padding: "12px 32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "16px",
                      fontSize: "0.8125rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "baseline", gap: "10px", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                      <span style={{ color: "var(--accent-brass)", fontWeight: 800, fontSize: "0.75rem", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                        [ VERIFIER MISMATCH ]
                      </span>
                      <span>
                        Vault <code className="font-data" style={{ color: "var(--text-primary)" }}>{selectedVault.slice(0, 8)}...</code> is bound to the production WorldIDRouter verifier. Deploy a testnet vault to test on World Chain Sepolia.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={isWrongChain ? () => switchChain?.({ chainId: worldChainSepolia.id }) : handleCreateVault}
                      disabled={isCreatingVault}
                      className="btn-brass"
                      style={{ fontSize: "0.75rem", padding: "6px 14px", borderRadius: 0, whiteSpace: "nowrap" }}
                    >
                      {isCreatingVault ? "Deploying…" : "+ Deploy Testnet Vault"}
                    </button>
                  </div>
                )}

                {/* Main Content Hero: the liveness status is the single most
                    important visual on this page — a big status dial, not a
                    card fighting for attention with a second card beside it. */}
                {isStatusLoading && rawStatus === undefined ? (
                  <div
                    style={{
                      padding: "32px",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                      display: "flex",
                      justifyContent: "center",
                      background: "rgba(255, 255, 255, 0.01)",
                    }}
                  >
                    <LivenessPanelSkeleton />
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "32px",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                      display: "flex",
                      justifyContent: "center",
                      background: "rgba(255, 255, 255, 0.01)",
                    }}
                  >
                    <LivenessPanel
                      status={status}
                      lastCheckIn={lastCheckIn}
                      checkInInterval={checkInInterval}
                      gracePeriod={gracePeriod}
                      livenessRegistered={livenessRegistered}
                      isSettling={isSettling}
                      onOpenCheckIn={() => setIsCheckInModalOpen(true)}
                    />
                  </div>
                )}

                {/* Main Focus Area: Underline Tabs */}
                <div
                  role="tablist"
                  aria-label="Vault management sections"
                  style={{
                    display: "flex",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                    background: "transparent",
                    padding: "0 32px",
                    overflowX: "auto",
                  }}
                >
                  {[
                    { id: "heirs", label: `Authorized Heirs (${heirs.length})` },
                    { id: "assets", label: `Allocated Assets (${assetList.length})` },
                    { id: "parameters", label: `Timelock Parameters` },
                    { id: "activity", label: `Activity Log` },
                    { id: "watchdog", label: `Watchdog & Alerts` },
                  ].map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        id={`tab-${tab.id}`}
                        aria-selected={isActive}
                        aria-controls={`tabpanel-${tab.id}`}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`dashboard-tab${isActive ? " dashboard-tab--active" : ""}`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Tab Content Panels (Full remaining width) */}
                <div
                  role="tabpanel"
                  id={`tabpanel-${activeTab}`}
                  aria-labelledby={`tab-${activeTab}`}
                  style={{ padding: "32px", flex: 1 }}
                >
                  {activeTab === "heirs" && (
                    <HeirList
                      heirs={heirs}
                      vaultStatus={status}
                      onAddHeir={handleAddHeir}
                      onRemoveHeir={handleRemoveHeir}
                      isLoading={isStatusLoading && rawStatus === undefined}
                    />
                  )}

                  {activeTab === "assets" && (
                    <AssetList
                      assets={assetList}
                      heirs={heirs}
                      vaultStatus={status}
                      onAssignAsset={handleAssignAsset}
                      onRemoveAsset={handleRemoveAsset}
                      vaultAddress={selectedVault}
                    />
                  )}

                  {activeTab === "parameters" && (
                    <VaultParameters
                      checkInInterval={checkInInterval}
                      gracePeriod={gracePeriod}
                      contestableWindow={contestableWindow}
                      vaultStatus={status}
                      onUpdateParameters={handleUpdateParameters}
                      isLoading={isStatusLoading && rawStatus === undefined}
                    />
                  )}

                  {activeTab === "activity" && (
                    <ActivityLog
                      vaultAddress={selectedVault}
                      lastCheckIn={lastCheckIn}
                      livenessRegistered={livenessRegistered}
                      vaultStatus={status}
                    />
                  )}

                  {activeTab === "watchdog" && selectedVault && (
                    <WatchdogAlertPanel
                      vaultAddress={selectedVault}
                      ownerAddress={address}
                    />
                  )}
                </div>
              </>
          </div>

          {/* Right Rail (~300px): Pinned Static Config */}
          <VaultConfigRail
            checkInInterval={checkInInterval}
            gracePeriod={gracePeriod}
            contestableWindow={contestableWindow}
            vaultAddress={selectedVault}
            verifierAddress={(vaultVerifier as string) || undefined}
            onEditParameters={() => setActiveTab("parameters")}
            onOpenAlerts={() => setActiveTab("watchdog")}
          />
        </div>
        )}
      </div>

      {/* World ID Check-In / Registration Modal */}
      {selectedVault && (
        <CheckInModal
          isOpen={isCheckInModalOpen}
          onClose={() => setIsCheckInModalOpen(false)}
          vaultAddress={selectedVault}
          ownerAddress={(vaultOwner as `0x${string}`) || address || "0x0"}
          livenessRegistered={livenessRegistered}
          verifierAddress={(vaultVerifier as `0x${string}`) || undefined}
          onPerformCheckInTx={handlePerformCheckInTx}
          onRegisterLivenessTx={handleRegisterLivenessTx}
          onCheckInSuccess={handleCheckInSuccess}
        />
      )}

      {/* Vault Deployment HUD Modal */}
      <VaultDeploymentModal
        isOpen={isCreatingVault}
        stage={deployStage}
        txHash={deployTxHash}
        vaultAddress={deployedVaultAddr}
        errorMessage={deployErrorMessage}
        onRetry={handleCreateVault}
        onClose={() => {
          setIsCreatingVault(false);
          setDeployStage("idle");
        }}
      />
    </div>
  );
}
