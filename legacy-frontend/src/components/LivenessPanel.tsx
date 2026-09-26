"use client";

import React from "react";
import { VaultStatus } from "@/lib/constants";
import { StatusLamp } from "./StatusLamp";

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
      <StatusLamp
        status={status}
        lastCheckIn={lastCheckIn}
        checkInInterval={checkInInterval}
        gracePeriod={gracePeriod}
        livenessRegistered={livenessRegistered}
        isSettling={isSettling}
      />

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
