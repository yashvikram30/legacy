"use client";

import React, { useState } from "react";
import { usePublicClient } from "wagmi";
import type { Hex } from "viem";
import { useDialogBehavior } from "@/hooks/useDialogBehavior";
import { activeChain, CHAIN_NAME, shortAddress } from "@/lib/constants";
import { LegacyVaultABI } from "@/lib/contracts/abis";
import {
  createPasskey,
  describePasskeyError,
  encodeCheckInProof,
  encodeRegistrationProof,
  isPasskeySupported,
  recallCredential,
  rememberCredential,
  signChallenge,
  type CreatedPasskey,
} from "@/lib/passkey";

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultAddress: `0x${string}`;
  livenessRegistered: boolean;
  onCheckInSuccess: (message: string) => void;
  /** Submits `checkIn(proof)`; resolves once confirmed on-chain. */
  onPerformCheckInTx: (proof: Hex) => Promise<void>;
  /** Submits `registerLiveness(proof)`; resolves once confirmed on-chain. */
  onRegisterLivenessTx: (proof: Hex) => Promise<void>;
}

type Stage = "idle" | "creating" | "signing" | "submitting";

const STAGE_LABEL: Record<Stage, string> = {
  idle: "",
  creating: "CREATE YOUR PASSKEY ON YOUR DEVICE…",
  signing: "CONFIRM WITH YOUR PASSKEY…",
  submitting: `CONFIRMING ON ${CHAIN_NAME.toUpperCase()}…`,
};

export function CheckInModal({
  isOpen,
  onClose,
  vaultAddress,
  livenessRegistered,
  onCheckInSuccess,
  onPerformCheckInTx,
  onRegisterLivenessTx,
}: CheckInModalProps) {
  const publicClient = usePublicClient({ chainId: activeChain.id });
  const [stage, setStage] = useState<Stage>("idle");
  const [errorText, setErrorText] = useState<string | null>(null);
  // A passkey created during setup but not yet linked (e.g. the second prompt
  // was cancelled). Reused on retry so the user doesn't end up with duplicates.
  const [pendingPasskey, setPendingPasskey] = useState<CreatedPasskey | null>(null);

  const isProcessing = stage !== "idle";
  const dialogRef = useDialogBehavior<HTMLDivElement>(isOpen, isProcessing ? undefined : onClose);

  if (!isOpen) return null;

  const rememberedCredential = recallCredential(activeChain.id, vaultAddress);

  const readChallenge = async (): Promise<Hex> => {
    if (!publicClient) throw new Error("Network unavailable. Check your connection and try again.");
    return (await publicClient.readContract({
      address: vaultAddress,
      abi: LegacyVaultABI,
      functionName: "livenessChallenge",
    })) as Hex;
  };

  const handleContinue = async () => {
    setErrorText(null);
    if (!isPasskeySupported()) {
      setErrorText("This browser can't use passkeys. Use an up-to-date browser over https.");
      return;
    }

    try {
      if (!livenessRegistered) {
        let passkey = pendingPasskey;
        if (!passkey) {
          setStage("creating");
          passkey = await createPasskey(`Legacy vault ${shortAddress(vaultAddress)}`);
          rememberCredential(activeChain.id, vaultAddress, passkey.credentialId);
          setPendingPasskey(passkey);
        }

        setStage("signing");
        const auth = await signChallenge(await readChallenge(), passkey.credentialId);

        setStage("submitting");
        await onRegisterLivenessTx(encodeRegistrationProof(passkey, auth));
        setPendingPasskey(null);
        onCheckInSuccess("Passkey linked. Your vault is active and your timer has restarted.");
      } else {
        setStage("signing");
        const auth = await signChallenge(await readChallenge(), rememberedCredential);

        setStage("submitting");
        await onPerformCheckInTx(encodeCheckInProof(auth));
        onCheckInSuccess("Checked in. Your timer has restarted and any open claim is cancelled.");
      }
      onClose();
    } catch (err) {
      console.error("[CheckIn] Passkey check-in failed:", err);
      setErrorText(describePasskeyError(err));
    } finally {
      setStage("idle");
    }
  };

  const title = livenessRegistered ? "Check in" : "Set up your passkey";
  const lead = livenessRegistered
    ? "Prove you're still here with your fingerprint, face or device PIN. This restarts your timer and cancels any open claim."
    : "Create a passkey on this device. It never leaves your device: the vault stores only its public key and verifies every check-in on-chain.";
  const actionLabel = livenessRegistered
    ? "CHECK IN WITH PASSKEY"
    : pendingPasskey
      ? "LINK PASSKEY TO VAULT"
      : "CREATE PASSKEY";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-modal-title"
      className="modal-backdrop-animate"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(10, 13, 16, 0.88)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="panel-elevated modal-surface-animate"
        style={{
          width: "100%",
          maxWidth: "520px",
          padding: "32px",
          backgroundColor: "#0A0D10",
          border: "1px solid rgba(255, 255, 255, 0.16)",
          borderRadius: 0,
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          position: "relative",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
          <div>
            <span className="section-tag" style={{ margin: "0 0 6px", fontSize: "0.6875rem" }}>
              {livenessRegistered ? "[ CHECK-IN ]" : "[ ONE-TIME SETUP ]"}
            </span>
            <h2
              id="checkin-modal-title"
              style={{
                fontFamily: "'Murs Gothic', var(--font-murs-gothic), sans-serif",
                fontSize: "1.375rem",
                fontWeight: 900,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#ffffff",
                lineHeight: 1.15,
                margin: 0,
              }}
            >
              {title}
            </h2>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "6px", lineHeight: 1.5 }}>
              {lead}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="btn-secondary"
            style={{
              padding: "6px 12px",
              fontFamily: "var(--font-data)",
              fontSize: "0.75rem",
              letterSpacing: "0.06em",
              borderRadius: 0,
              borderColor: "rgba(255, 255, 255, 0.2)",
              color: "var(--text-secondary)",
              flexShrink: 0,
            }}
            aria-label="Close dialog"
          >
            Close ✕
          </button>
        </div>

        {/* Details */}
        <div
          style={{
            padding: "16px",
            backgroundColor: "#000000",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: 0,
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <span className="section-tag" style={{ margin: 0, fontSize: "0.625rem" }}>
            [ DETAILS ]
          </span>
          <DetailRow label="Vault">
            <span className="font-data" style={{ color: "#ffffff", fontSize: "0.8125rem" }}>
              {vaultAddress.slice(0, 10)}...{vaultAddress.slice(-8)}
            </span>
          </DetailRow>
          <DetailRow label="Verification">
            <span style={{ color: "var(--accent-brass)", fontFamily: "var(--font-data)", fontSize: "0.75rem", fontWeight: 600 }}>
              Passkey · verified on-chain
            </span>
          </DetailRow>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {livenessRegistered
              ? rememberedCredential
                ? "Your device will ask for the passkey you set up for this vault."
                : "Pick the passkey you created for this vault when your device asks."
              : pendingPasskey
                ? "Passkey created. Confirm it once more to link it to this vault."
                : "Your device asks twice: once to create the passkey, once to link it to this vault."}
          </p>
        </div>

        {/* Error Banner */}
        {errorText && (
          <div
            role="alert"
            style={{
              padding: "12px 16px",
              backgroundColor: "rgba(193, 80, 63, 0.12)",
              border: "1px solid var(--status-red)",
              borderRadius: 0,
              fontSize: "0.8125rem",
              color: "#ffffff",
              lineHeight: 1.5,
            }}
          >
            <div
              style={{
                color: "var(--status-red)",
                fontFamily: "var(--font-data)",
                fontSize: "0.6875rem",
                letterSpacing: "0.08em",
                marginBottom: "4px",
              }}
            >
              [ COULDN&apos;T VERIFY ]
            </div>
            {errorText}
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={isProcessing}
          className="btn-hero-action"
          style={{
            width: "100%",
            justifyContent: "center",
            marginTop: "4px",
            borderRadius: 0,
            padding: "14px 28px",
            fontSize: "0.875rem",
          }}
        >
          <span aria-live="polite">{isProcessing ? STAGE_LABEL[stage] : actionLabel}</span>
          <span className="arrow-icon" aria-hidden="true">
            →
          </span>
        </button>

        <p
          style={{
            fontSize: "0.6875rem",
            fontFamily: "var(--font-data)",
            letterSpacing: "0.04em",
            color: "var(--text-secondary)",
            textAlign: "center",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          No seed phrase · Non-custodial · Verified on {CHAIN_NAME}
        </p>
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </span>
      {children}
    </div>
  );
}
