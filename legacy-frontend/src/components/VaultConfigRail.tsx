"use client";

import React from "react";

interface VaultConfigRailProps {
  checkInInterval: bigint;
  gracePeriod: bigint;
  contestableWindow: bigint;
  vaultAddress?: string;
  verifierAddress?: string;
  onEditParameters: () => void;
  onOpenAlerts?: () => void;
}

export function VaultConfigRail({
  checkInInterval,
  gracePeriod,
  contestableWindow,
  vaultAddress,
  onEditParameters,
  onOpenAlerts,
}: VaultConfigRailProps) {
  const intervalDays = Math.round(Number(checkInInterval) / 86400);
  const graceDays = Math.round(Number(gracePeriod) / 86400);
  const contestableHours = Math.round(Number(contestableWindow) / 3600);

  return (
    <aside
      className="vault-dashboard-rail"
      style={{
        backgroundColor: "#000000",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "24px 20px",
        gap: "24px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Rail Title */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Timelock Parameters
          </span>
          <button
            type="button"
            onClick={onEditParameters}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              fontSize: "0.75rem",
              color: "var(--accent-brass)",
              cursor: "pointer",
              fontFamily: "var(--font-data)",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            Edit →
          </button>
        </div>

        {/* Pinned Stats Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Cadence */}
          <div
            style={{
              padding: "12px 14px",
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <span style={{ fontSize: "0.6875rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>
              Check-In Cadence
            </span>
            <div className="font-data" style={{ fontSize: "1.125rem", fontWeight: 700, color: "#ffffff" }}>
              {intervalDays} Days
            </div>
            <span style={{ fontSize: "0.6875rem", color: "rgba(255, 255, 255, 0.4)" }}>
              Heartbeat renewal threshold
            </span>
          </div>

          {/* Grace Period */}
          <div
            style={{
              padding: "12px 14px",
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <span style={{ fontSize: "0.6875rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>
              Grace Buffer
            </span>
            <div className="font-data" style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--status-amber)" }}>
              {graceDays} Days
            </div>
            <span style={{ fontSize: "0.6875rem", color: "rgba(255, 255, 255, 0.4)" }}>
              Safety window before Red
            </span>
          </div>

          {/* Dispute Window */}
          <div
            style={{
              padding: "12px 14px",
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <span style={{ fontSize: "0.6875rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>
              Dispute Window
            </span>
            <div className="font-data" style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--accent-brass)" }}>
              {contestableHours} Hours
            </div>
            <span style={{ fontSize: "0.6875rem", color: "rgba(255, 255, 255, 0.4)" }}>
              Heir challenge veto window
            </span>
          </div>
        </div>

        {/* Vault Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingTop: "8px" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Network & Security
          </span>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              fontSize: "0.75rem",
              fontFamily: "var(--font-data)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Network:</span>
              <span style={{ color: "#ffffff" }}>World Chain Sepolia</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Custody:</span>
              <span style={{ color: "var(--status-green)" }}>Non-Custodial</span>
            </div>
          </div>
        </div>

        {/* Watchdog / Alerts section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingTop: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Watchdog Dispatch
            </span>
            {onOpenAlerts && (
              <button
                type="button"
                onClick={onOpenAlerts}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: "0.75rem",
                  color: "var(--accent-brass)",
                  cursor: "pointer",
                  fontFamily: "var(--font-data)",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
              >
                Configure →
              </button>
            )}
          </div>
          <div
            style={{
              padding: "10px 12px",
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "var(--status-green)",
                boxShadow: "0 0 6px var(--status-green)",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.75rem", color: "#ffffff", fontWeight: 600 }}>Heartbeat Monitoring</span>
              <span style={{ fontSize: "0.6875rem", color: "var(--text-secondary)" }}>Telegram & Push Alerts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Explorer link */}
      {vaultAddress && (
        <div>
          <a
            href={`https://sepolia.worldscan.org/address/${vaultAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "0.75rem",
              fontFamily: "var(--font-data)",
              color: "var(--text-secondary)",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            <span>View on Worldscan</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      )}
    </aside>
  );
}
