"use client";

import React, { useState } from "react";
import { VaultStatus, PROTOCOL_FLOORS } from "@/lib/constants";

interface VaultParametersProps {
  checkInInterval: bigint;
  gracePeriod: bigint;
  contestableWindow: bigint;
  vaultStatus: VaultStatus;
  onUpdateParameters: (
    newInterval: bigint,
    newGrace: bigint,
    newContestable: bigint
  ) => Promise<void>;
  isLoading?: boolean;
}

export function VaultParameters({
  checkInInterval,
  gracePeriod,
  contestableWindow,
  vaultStatus,
  onUpdateParameters,
  isLoading = false,
}: VaultParametersProps) {
  const [intervalSec, setIntervalSec] = useState(Number(checkInInterval).toString());
  const [graceSec, setGraceSec] = useState(Number(gracePeriod).toString());
  const [contestableSec, setContestableSec] = useState(Number(contestableWindow).toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Re-sync form fields whenever the on-chain values change (initial async
  // load resolving after mount, or a refetch after a successful update) —
  // otherwise the form is permanently stuck on whatever it first rendered
  // with. Adjusted during render (React's recommended pattern for this),
  // not in an effect, so it lands in the same paint instead of an extra one.
  const [synced, setSynced] = useState({ checkInInterval, gracePeriod, contestableWindow });
  if (
    !isSubmitting &&
    (synced.checkInInterval !== checkInInterval ||
      synced.gracePeriod !== gracePeriod ||
      synced.contestableWindow !== contestableWindow)
  ) {
    setSynced({ checkInInterval, gracePeriod, contestableWindow });
    setIntervalSec(Number(checkInInterval).toString());
    setGraceSec(Number(gracePeriod).toString());
    setContestableSec(Number(contestableWindow).toString());
  }

  const isGreen = vaultStatus === VaultStatus.Green;

  const handleApplyRapidDemo = () => {
    setIntervalSec("45");
    setGraceSec("15");
    setContestableSec("45");
    setMessage({ text: "Applied 45-second testing preset (45s check-in / 15s grace / 45s contestable).", isError: false });
  };

  const handleApplyProductionPreset = () => {
    setIntervalSec((86400 * 30).toString());
    setGraceSec((86400 * 7).toString());
    setContestableSec((3600 * 48).toString());
    setMessage({ text: "Applied production preset (30 days check-in / 7 days grace / 48 hours contestable).", isError: false });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const interval = BigInt(Math.max(1, parseInt(intervalSec, 10) || 45));
    const grace = BigInt(Math.max(0, parseInt(graceSec, 10) || 15));
    const contestable = BigInt(Math.max(1, parseInt(contestableSec, 10) || 45));

    if (interval < BigInt(PROTOCOL_FLOORS.minCheckInIntervalSeconds)) {
      setMessage({
        text: `Check-in interval cannot be less than ${PROTOCOL_FLOORS.minCheckInIntervalSeconds} seconds (protocol floor).`,
        isError: true,
      });
      return;
    }

    if (contestable < BigInt(PROTOCOL_FLOORS.minContestableWindowSeconds)) {
      setMessage({
        text: `Contestable window cannot be less than ${PROTOCOL_FLOORS.minContestableWindowSeconds} seconds (protocol floor).`,
        isError: true,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage(null);
      await onUpdateParameters(interval, grace, contestable);
      setMessage({ text: "Vault parameters updated successfully on World Chain.", isError: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update parameters";
      setMessage({ text: msg, isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h3
            style={{
              fontFamily: "'Murs Gothic', var(--font-murs-gothic), sans-serif",
              fontSize: "1.375rem",
              fontWeight: 900,
              letterSpacing: "0.06em",
              color: "#ffffff",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            Timelock Protocol Parameters
          </h3>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "4px", lineHeight: 1.5 }}>
            Configure autonomous heartbeat renewal cadence, safety grace duration, and heir contestation dispute window.
          </p>
        </div>

        {/* Quick Presets or Locked Badge */}
        {isGreen ? (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={handleApplyRapidDemo}
              className="btn-secondary"
              style={{ fontSize: "0.75rem", padding: "6px 12px", borderRadius: 0, borderColor: "var(--accent-brass)", color: "var(--accent-brass)" }}
            >
              ⚡ 45s Testing Preset
            </button>
            <button
              type="button"
              onClick={handleApplyProductionPreset}
              className="btn-secondary"
              style={{ fontSize: "0.75rem", padding: "6px 12px", borderRadius: 0 }}
            >
              Standard 30d Preset
            </button>
          </div>
        ) : (
          <span
            style={{
              fontSize: "0.75rem",
              fontFamily: "var(--font-data)",
              color: "var(--status-amber)",
              border: "1px solid var(--status-amber)",
              padding: "4px 10px",
              borderRadius: 0,
              textTransform: "uppercase",
            }}
          >
            Parameters Locked (Vault Not Green)
          </span>
        )}
      </div>

      {!isGreen && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "rgba(184, 137, 74, 0.08)",
            border: "1px solid rgba(184, 137, 74, 0.35)",
            fontSize: "0.8125rem",
            color: "var(--accent-brass)",
            lineHeight: 1.5,
          }}
        >
          🔒 <strong>Parameters Frozen:</strong> Protocol security rules prevent editing timelock intervals while the vault is Amber or Red to guarantee succession integrity. Perform a <strong>Check-In</strong> above to restore Green status and unlock parameter updates.
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          <div style={{ padding: "16px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.12)" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#EDEAE3", display: "block", marginBottom: "8px" }}>
              Check-In Interval (Seconds)
            </label>
            <input
              type="number"
              min="5"
              className="input-instrument font-data"
              value={intervalSec}
              onChange={(e) => setIntervalSec(e.target.value)}
              disabled={!isGreen || isSubmitting || isLoading}
              style={{ backgroundColor: "#000000", borderColor: "rgba(255, 255, 255, 0.2)", borderRadius: 0, padding: "10px 14px", width: "100%" }}
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "6px", display: "block" }}>
              Protocol Floor: {PROTOCOL_FLOORS.minCheckInIntervalSeconds}s · Stays Green during this window
            </span>
          </div>

          <div style={{ padding: "16px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.12)" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#EDEAE3", display: "block", marginBottom: "8px" }}>
              Grace Duration (Seconds)
            </label>
            <input
              type="number"
              min="0"
              className="input-instrument font-data"
              value={graceSec}
              onChange={(e) => setGraceSec(e.target.value)}
              disabled={!isGreen || isSubmitting || isLoading}
              style={{ backgroundColor: "#000000", borderColor: "rgba(255, 255, 255, 0.2)", borderRadius: 0, padding: "10px 14px", width: "100%" }}
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "6px", display: "block" }}>
              Amber buffer window before Red transition
            </span>
          </div>

          <div style={{ padding: "16px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.12)" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#EDEAE3", display: "block", marginBottom: "8px" }}>
              Contestable Window (Seconds)
            </label>
            <input
              type="number"
              min="5"
              className="input-instrument font-data"
              value={contestableSec}
              onChange={(e) => setContestableSec(e.target.value)}
              disabled={!isGreen || isSubmitting || isLoading}
              style={{ backgroundColor: "#000000", borderColor: "rgba(255, 255, 255, 0.2)", borderRadius: 0, padding: "10px 14px", width: "100%" }}
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "6px", display: "block" }}>
              Protocol Floor: {PROTOCOL_FLOORS.minContestableWindowSeconds}s · Countdown for heir finalization
            </span>
          </div>
        </div>

        {message && (
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: message.isError ? "rgba(193, 80, 63, 0.15)" : "rgba(76, 175, 109, 0.15)",
              border: `1px solid ${message.isError ? "var(--status-red)" : "var(--status-green)"}`,
              borderRadius: 0,
              fontSize: "0.8125rem",
              color: "#ffffff",
            }}
          >
            {message.text}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {isGreen ? (
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="btn-brass"
              style={{ padding: "12px 28px", fontSize: "0.8125rem", borderRadius: 0 }}
            >
              {isSubmitting ? "UPDATING PARAMETERS…" : "UPDATE PARAMETERS →"}
            </button>
          ) : (
            <button
              type="button"
              disabled={true}
              className="btn-secondary"
              style={{
                padding: "12px 28px",
                fontSize: "0.8125rem",
                borderRadius: 0,
                opacity: 0.5,
                cursor: "not-allowed",
                borderColor: "rgba(255, 255, 255, 0.2)",
              }}
            >
              🔒 LOCKED WHILE VAULT IS NOT GREEN
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
