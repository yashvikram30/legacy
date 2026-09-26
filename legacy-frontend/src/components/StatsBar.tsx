"use client";

import React from "react";

interface StatsBarProps {
  checkInInterval: bigint;
  gracePeriod: bigint;
  contestableWindow: bigint;
  heirsCount: number;
  assetsCount: number;
  onTabSelect: (tab: "heirs" | "assets" | "parameters" | "activity") => void;
}

export function StatsBar({
  checkInInterval,
  gracePeriod,
  contestableWindow,
  heirsCount,
  onTabSelect,
}: StatsBarProps) {
  const intervalDays = Math.round(Number(checkInInterval) / 86400);
  const graceDays = Math.round(Number(gracePeriod) / 86400);
  const contestableHours = Math.round(Number(contestableWindow) / 3600);

  return (
    <div
      style={{
        padding: "14px 32px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px 32px",
        fontSize: "0.8125rem",
        backgroundColor: "rgba(255, 255, 255, 0.01)",
      }}
      role="region"
      aria-label="Vault configuration summary"
    >
      {/* 01: Cadence */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
        <span style={{ color: "var(--text-secondary)" }}>Check-in cadence:</span>
        <span className="font-data" style={{ color: "#ffffff", fontWeight: 600 }}>
          {intervalDays} days
        </span>
      </div>

      <span style={{ color: "rgba(255, 255, 255, 0.15)", userSelect: "none" }}>·</span>

      {/* 02: Grace */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
        <span style={{ color: "var(--text-secondary)" }}>Grace buffer:</span>
        <span className="font-data" style={{ color: "var(--status-amber)", fontWeight: 600 }}>
          {graceDays} days
        </span>
      </div>

      <span style={{ color: "rgba(255, 255, 255, 0.15)", userSelect: "none" }}>·</span>

      {/* 03: Dispute Window */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
        <span style={{ color: "var(--text-secondary)" }}>Dispute window:</span>
        <span className="font-data" style={{ color: "var(--accent-brass)", fontWeight: 600 }}>
          {contestableHours} hours
        </span>
      </div>

      <span style={{ color: "rgba(255, 255, 255, 0.15)", userSelect: "none" }}>·</span>

      {/* 04: Heirs designated (Clickable shortcut to tab) */}
      <button
        type="button"
        onClick={() => onTabSelect("heirs")}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "0.8125rem",
          color: "var(--text-secondary)",
          transition: "color 0.15s ease",
        }}
        title="Jump to Authorized Heirs tab"
      >
        <span>Heirs designated:</span>
        <span className="font-data" style={{ color: "#ffffff", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: "3px" }}>
          {heirsCount}
        </span>
        <span style={{ color: "var(--accent-brass)", fontSize: "0.75rem" }} aria-hidden="true">→</span>
      </button>

      {/* Subtle edit link to timelock */}
      <div style={{ marginLeft: "auto" }}>
        <button
          type="button"
          onClick={() => onTabSelect("parameters")}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontFamily: "var(--font-data)",
            fontSize: "0.6875rem",
            color: "rgba(255, 255, 255, 0.4)",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            transition: "color 0.15s ease",
          }}
          title="Edit parameters in Timelock tab"
        >
          <span>Edit Parameters</span>
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </div>
  );
}
