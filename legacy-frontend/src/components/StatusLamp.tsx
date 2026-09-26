"use client";

import React, { useEffect, useState } from "react";
import { VaultStatus, VAULT_STATUS_COPY } from "@/lib/constants";

interface StatusLampProps {
  status: VaultStatus;
  lastCheckIn: bigint;
  checkInInterval: bigint;
  gracePeriod: bigint;
  livenessRegistered?: boolean;
  isSettling?: boolean;
}

export function StatusLamp({
  status,
  lastCheckIn,
  checkInInterval,
  gracePeriod,
  livenessRegistered,
  isSettling,
}: StatusLampProps) {
  const [timeText, setTimeText] = useState<string>("Calculating...");
  const [timeLabel, setTimeLabel] = useState<string>("");

  useEffect(() => {
    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const lastSec = Number(lastCheckIn);
      const intervalSec = Number(checkInInterval);
      const graceSec = Number(gracePeriod);
      const elapsed = now - lastSec;

      const fmt = (totalSecs: number) => {
        const d = Math.floor(totalSecs / 86400);
        const h = Math.floor((totalSecs % 86400) / 3600);
        const m = Math.floor((totalSecs % 3600) / 60);
        const s = totalSecs % 60;
        if (d > 0) return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
        return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
      };

      if (status === VaultStatus.Green) {
        const remaining = Math.max(0, intervalSec - elapsed);
        setTimeLabel("Next check-in due in");
        setTimeText(fmt(remaining));
      } else if (status === VaultStatus.Amber) {
        const remaining = Math.max(0, intervalSec + graceSec - elapsed);
        setTimeLabel("Claims open in");
        setTimeText(fmt(remaining));
      } else {
        const timeInRed = Math.max(0, elapsed - (intervalSec + graceSec));
        setTimeLabel("Claims open for");
        setTimeText(fmt(timeInRed));
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [status, lastCheckIn, checkInInterval, gracePeriod]);

  const isRegistered = livenessRegistered ?? true;

  // "Pending registration" reads as a needs-action state, same visual
  // language as Amber, but with its own explicit label (never color alone).
  const lampClass = !isRegistered
    ? "amber"
    : status === VaultStatus.Green
    ? "green"
    : status === VaultStatus.Amber
    ? "amber"
    : "red";

  const statusColor =
    lampClass === "green" ? "var(--status-green)" : lampClass === "amber" ? "var(--status-amber)" : "var(--status-red)";

  const bigWord = !isRegistered ? "Not set up" : VAULT_STATUS_COPY[status].label;

  const statusDescription = !isRegistered
    ? "The owner hasn't set up World ID check-ins yet."
    : status === VaultStatus.Green
    ? "The owner is checking in. Nothing for heirs to do."
    : status === VaultStatus.Amber
    ? "The owner missed a check-in and is in their grace period."
    : "The owner stopped checking in. Heirs can start a claim.";

  return (
    <div className="status-lamp-wrap animate-fade-up" style={{ padding: "12px 0 8px" }}>
      <div className="lamp-bezel">
        <div className={`status-lamp lamp-${lampClass}${isSettling ? " lamp-settle-animation" : ""}`}>
          <div className="lamp-specular" />
        </div>
      </div>

      <div className="lamp-headline">
        <span
          style={{
            fontFamily: "'Murs Gothic', var(--font-murs-gothic), sans-serif",
            fontSize: "1.75rem",
            fontWeight: 900,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: statusColor,
          }}
        >
          {bigWord}
        </span>
        {isRegistered && (
          <>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {timeLabel}
            </span>
            <span className="font-data" style={{ fontSize: "1.375rem", fontWeight: 700, color: "#ffffff" }} aria-live="polite">
              {timeText}
            </span>
          </>
        )}
      </div>

      <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", textAlign: "center", maxWidth: 380, lineHeight: 1.5, margin: "4px auto 0" }}>
        {statusDescription}
      </p>
    </div>
  );
}
