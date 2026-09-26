"use client";

import React, { useEffect, useState } from "react";

export type DeploymentStage =
  | "idle"
  | "requesting_signature"
  | "broadcasting"
  | "confirming"
  | "indexing"
  | "syncing"
  | "success"
  | "error";

interface VaultDeploymentModalProps {
  isOpen: boolean;
  stage: DeploymentStage;
  txHash: string | null;
  vaultAddress: string | null;
  errorMessage: string | null;
  onRetry?: () => void;
  onClose: () => void;
}

export function VaultDeploymentModal({
  isOpen,
  stage,
  txHash,
  vaultAddress,
  errorMessage,
  onRetry,
  onClose,
}: VaultDeploymentModalProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  // Timer while active
  useEffect(() => {
    if (!isOpen || stage === "idle" || stage === "success" || stage === "error") {
      return;
    }

    const start = Date.now();
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - start);
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, stage]);

  if (!isOpen) return null;

  const seconds = stage === "idle" ? "0.0" : (elapsedMs / 1000).toFixed(1);

  const steps = [
    {
      id: 1,
      name: "Wallet Confirmation",
      desc: "Confirm vault creation in your connected wallet",
      isComplete: ["broadcasting", "confirming", "indexing", "syncing", "success"].includes(stage),
      isActive: stage === "requesting_signature",
    },
    {
      id: 2,
      name: "Network Confirmation",
      desc: "Transaction confirming on World Chain (~1-2s)",
      isComplete: ["indexing", "syncing", "success"].includes(stage),
      isActive: ["broadcasting", "confirming"].includes(stage),
    },
    {
      id: 3,
      name: "Vault Setup",
      desc: "Deploying your self-sovereign vault contract",
      isComplete: ["syncing", "success"].includes(stage),
      isActive: stage === "indexing",
    },
    {
      id: 4,
      name: "Vault Activation",
      desc: "Configuring parameters and activating dashboard",
      isComplete: stage === "success",
      isActive: stage === "syncing",
    },
  ];

  return (
    <div
      className="deployment-overlay"
      onClick={(e) => {
        // Only allow clicking backdrop to close if in error or success
        if (e.target === e.currentTarget && (stage === "error" || stage === "success")) {
          onClose();
        }
      }}
    >
      <div className="deployment-modal animate-fade-up">
        {/* Header Strip */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            background: "rgba(255, 255, 255, 0.02)",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.6875rem",
                color: "var(--accent-brass)",
                fontFamily: "var(--font-data)",
                letterSpacing: "0.08em",
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              [ VAULT SETUP ]
            </div>
            <h2
              style={{
                fontFamily: "'Murs Gothic', var(--font-murs-gothic), sans-serif",
                fontSize: "1.25rem",
                color: "#ffffff",
                letterSpacing: "0.04em",
                marginTop: "4px",
              }}
            >
              {stage === "success"
                ? "VAULT DEPLOYED SUCCESSFULLY"
                : stage === "error"
                ? "DEPLOYMENT FAILED"
                : "INITIALIZING SUCCESSION VAULT"}
            </h2>
          </div>

          {(stage === "error" || stage === "success") && (
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ padding: "4px 10px", fontSize: "0.8125rem", borderRadius: 0 }}
              aria-label="Close modal"
            >
              ✕
            </button>
          )}
        </div>

        {/* Dynamic Center Visualizer */}
        <div
          style={{
            padding: "24px 24px 20px",
            display: "flex",
            alignItems: "center",
            gap: "20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(0, 0, 0, 0.3)",
          }}
        >
          {/* Animated Cryptographic Radar Ring */}
          <div
            style={{
              position: "relative",
              width: "68px",
              height: "68px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {stage === "success" ? (
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(76, 175, 109, 0.15)",
                  border: "2px solid var(--status-green)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--status-green)",
                  fontSize: "1.5rem",
                }}
              >
                ✓
              </div>
            ) : stage === "error" ? (
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(193, 80, 63, 0.15)",
                  border: "2px solid var(--status-red)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--status-red)",
                  fontSize: "1.375rem",
                }}
              >
                ✕
              </div>
            ) : (
              <>
                {/* Outer spinning ring */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    border: "2px dashed rgba(184, 137, 74, 0.5)",
                    animation: "spin-cw 8s linear infinite",
                  }}
                />
                {/* Middle counter-spinning ring */}
                <div
                  style={{
                    position: "absolute",
                    inset: "6px",
                    borderRadius: "50%",
                    border: "1px solid rgba(184, 137, 74, 0.2)",
                    borderTopColor: "var(--accent-brass)",
                    animation: "spin-ccw 2.5s linear infinite",
                  }}
                />
                {/* Core pulsing dot */}
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    backgroundColor: "var(--accent-brass)",
                    boxShadow: "0 0 16px var(--accent-brass)",
                    animation: "pulse-glow 1.5s infinite",
                  }}
                />
              </>
            )}
          </div>

          {/* Telemetry info */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="font-data" style={{ fontSize: "0.8125rem", color: "#EDEAE3", fontWeight: 600 }}>
                {stage === "requesting_signature"
                  ? "AWAITING WALLET SIGNATURE"
                  : stage === "broadcasting" || stage === "confirming"
                  ? "MINING ON WORLD CHAIN SEPOLIA"
                  : stage === "indexing"
                  ? "EXTRACTING MINIMAL PROXY"
                  : stage === "syncing"
                  ? "SYNCHRONIZING CONSOLE TELEMETRY"
                  : stage === "success"
                  ? "VAULT READY FOR CONFIGURATION"
                  : "DEPLOYMENT INTERRUPTED"}
              </span>
              <span className="font-data" style={{ fontSize: "0.75rem", color: "var(--accent-brass)" }}>
                {seconds}s
              </span>
            </div>

            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
              {stage === "requesting_signature" && "Please verify and approve the factory deployment transaction in your wallet."}
              {(stage === "broadcasting" || stage === "confirming") && "Transaction broadcast to World Chain Sepolia. Waiting for receipt."}
              {stage === "indexing" && "Receipt confirmed! Extracting cloned proxy contract address from receipt topics."}
              {stage === "syncing" && "Reading initial timelock intervals and World ID router verifier binding."}
              {stage === "success" && (
                <span style={{ color: "var(--status-green)" }}>
                  Succession clone active at {vaultAddress ? `${vaultAddress.slice(0, 10)}…${vaultAddress.slice(-8)}` : "selected address"}.
                </span>
              )}
              {stage === "error" && (
                <span style={{ color: "var(--status-red)" }}>
                  {errorMessage || "The transaction was rejected or encountered an RPC error."}
                </span>
              )}
            </div>

            {/* Live Tx Hash if available */}
            {txHash && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                <span className="font-data" style={{ fontSize: "0.6875rem", color: "var(--text-secondary)" }}>
                  TX: {txHash.slice(0, 12)}…{txHash.slice(-8)}
                </span>
                <a
                  href={`https://sepolia.worldscan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-data"
                  style={{
                    fontSize: "0.6875rem",
                    color: "var(--accent-brass)",
                    textDecoration: "underline",
                  }}
                >
                  View on Worldscan ↗
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Step-by-Step Progress List */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {steps.map((s) => {
            const stateClass = s.isComplete ? "completed" : s.isActive ? "active" : "";
            return (
              <div key={s.id} className={`deployment-step-item ${stateClass}`}>
                {/* Step indicator */}
                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.6875rem",
                    fontFamily: "var(--font-data)",
                    fontWeight: 700,
                    flexShrink: 0,
                    backgroundColor: s.isComplete
                      ? "rgba(76, 175, 109, 0.2)"
                      : s.isActive
                      ? "var(--accent-brass)"
                      : "rgba(255, 255, 255, 0.05)",
                    color: s.isComplete
                      ? "var(--status-green)"
                      : s.isActive
                      ? "#10151A"
                      : "var(--text-secondary)",
                    border: s.isComplete
                      ? "1px solid var(--status-green)"
                      : s.isActive
                      ? "none"
                      : "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  {s.isComplete ? "✓" : s.id}
                </div>

                {/* Step Content */}
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: "0.8125rem",
                        fontWeight: s.isActive || s.isComplete ? 600 : 400,
                        color: s.isComplete
                          ? "#EDEAE3"
                          : s.isActive
                          ? "#ffffff"
                          : "var(--text-secondary)",
                      }}
                    >
                      {s.name}
                    </span>
                    {s.isActive && (
                      <span
                        className="font-data"
                        style={{
                          fontSize: "0.6875rem",
                          color: "var(--accent-brass)",
                          letterSpacing: "0.04em",
                        }}
                      >
                        IN PROGRESS…
                      </span>
                    )}
                    {s.isComplete && (
                      <span
                        className="font-data"
                        style={{
                          fontSize: "0.6875rem",
                          color: "var(--status-green)",
                        }}
                      >
                        CONFIRMED
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                    {s.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(255, 255, 255, 0.015)",
          }}
        >
          <div className="font-data" style={{ fontSize: "0.6875rem", color: "rgba(255, 255, 255, 0.4)" }}>
            CHAIN 4801 · EIP-1167 MINIMAL PROXY
          </div>

          {stage === "error" ? (
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                style={{ padding: "8px 16px", fontSize: "0.8125rem", borderRadius: 0 }}
              >
                Dismiss
              </button>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="btn-brass"
                  style={{ padding: "8px 18px", fontSize: "0.8125rem", borderRadius: 0 }}
                >
                  Retry Deployment
                </button>
              )}
            </div>
          ) : stage === "success" ? (
            <button
              type="button"
              onClick={onClose}
              className="btn-brass"
              style={{ padding: "8px 24px", fontSize: "0.8125rem", borderRadius: 0 }}
            >
              Open Succession Console →
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "var(--accent-brass)",
                  animation: "pulse-glow 1.5s infinite",
                }}
              />
              <span className="font-data" style={{ fontSize: "0.75rem", color: "var(--accent-brass)" }}>
                DEPLOYING CLONE…
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
