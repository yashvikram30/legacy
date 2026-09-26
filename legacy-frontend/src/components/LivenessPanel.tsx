"use client";

import React, { useEffect, useState } from "react";
import { VaultStatus } from "@/lib/constants";
import { RadialChronometer } from "./RadialChronometer";

interface LivenessPanelProps {
  status: VaultStatus;
  lastCheckIn: bigint;
  checkInInterval: bigint;
  gracePeriod: bigint;
  livenessRegistered: boolean;
  isSettling?: boolean;
  onOpenCheckIn: () => void;
}

export function LivenessPanel({
  status,
  lastCheckIn,
  checkInInterval,
  gracePeriod,
  livenessRegistered,
  isSettling,
  onOpenCheckIn,
}: LivenessPanelProps) {
  const [timeText, setTimeText] = useState<string>("Calculating...");
  const [timeLabel, setTimeLabel] = useState<string>("");
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      const lastSec = Number(lastCheckIn);
      const intervalSec = Number(checkInInterval);
      const graceSec = Number(gracePeriod);
      const elapsedSec = now - lastSec;
      setElapsed(elapsedSec);

      const fmt = (totalSecs: number) => {
        const d = Math.floor(totalSecs / 86400);
        const h = Math.floor((totalSecs % 86400) / 3600);
        const m = Math.floor((totalSecs % 3600) / 60);
        const s = totalSecs % 60;
        if (d > 0) return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
        return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
      };

      if (status === VaultStatus.Green) {
        setTimeLabel("Next heartbeat due in");
        setTimeText(fmt(Math.max(0, intervalSec - elapsedSec)));
      } else if (status === VaultStatus.Amber) {
        setTimeLabel("Turning Red in");
        setTimeText(fmt(Math.max(0, intervalSec + graceSec - elapsedSec)));
      } else {
        setTimeLabel("Overdue by");
        setTimeText(fmt(Math.max(0, elapsedSec - (intervalSec + graceSec))));
      }
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [status, lastCheckIn, checkInInterval, gracePeriod]);

  const intervalSec = Number(checkInInterval);
  const graceSec = Number(gracePeriod);
  // Give the red zone a visible arc segment (defaults to the grace span, or the
  // interval when there is no grace period) so the danger threshold reads on the dial.
  const redSpan = graceSec > 0 ? graceSec : Math.max(intervalSec, 1);
  const thresholds = {
    green: intervalSec,
    amber: intervalSec + graceSec,
    max: intervalSec + graceSec + redSpan,
  };

  const isRegistered = livenessRegistered ?? true;
  const lampClass = !isRegistered
    ? "amber"
    : status === VaultStatus.Green
    ? "green"
    : status === VaultStatus.Amber
    ? "amber"
    : "red";
  const statusColor =
    lampClass === "green" ? "var(--status-green)" : lampClass === "amber" ? "var(--status-amber)" : "var(--status-red)";
  const bigWord = !isRegistered
    ? "PENDING"
    : status === VaultStatus.Green
    ? "GREEN"
    : status === VaultStatus.Amber
    ? "AMBER"
    : "RED";
  const statusDescription = !isRegistered
    ? "Vault deployed. Complete initial World ID Orb registration to activate automated heartbeat protection."
    : status === VaultStatus.Green
    ? "Autonomous zero-knowledge World ID Orb heartbeat active on World Chain."
    : status === VaultStatus.Amber
    ? "Check-in cadence exceeded. Grace period active before inheritance claims unlock."
    : "Liveness expired. Designated beneficiaries are authorized to execute succession.";

  // Before registration there is no meaningful elapsed clock — render an empty dial.
  const chronoValue = isRegistered ? elapsed : 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "20px",
        width: "100%",
      }}
    >
      <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <RadialChronometer
          value={chronoValue}
          thresholds={thresholds}
          size={240}
          strokeWidth={13}
          className={isSettling ? "lamp-settle-animation" : undefined}
        >
          <span
            style={{
              fontFamily: "'Murs Gothic', var(--font-murs-gothic), sans-serif",
              fontSize: "1.5rem",
              fontWeight: 900,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: statusColor,
              lineHeight: 1.1,
            }}
          >
            {bigWord}
          </span>
          <span
            className="font-data"
            style={{ fontSize: "1.0625rem", fontWeight: 700, color: "#ffffff", marginTop: 4 }}
            aria-live="polite"
          >
            {timeText}
          </span>
          <span
            style={{
              fontSize: "0.6875rem",
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginTop: 2,
              maxWidth: 130,
            }}
          >
            {timeLabel}
          </span>
        </RadialChronometer>

        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--text-secondary)",
            textAlign: "center",
            maxWidth: 380,
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {statusDescription}
        </p>
      </div>

      <button
        type="button"
        onClick={onOpenCheckIn}
        className="btn-hero-action"
        id="trigger-checkin-btn"
        style={{ marginTop: 0, padding: "13px 32px", justifyContent: "center", fontSize: "0.875rem" }}
      >
        <span>{livenessRegistered ? "Conduct World ID Check-in" : "Register with World ID"}</span>
        <span className="arrow-icon" aria-hidden="true">→</span>
      </button>
    </div>
  );
}
