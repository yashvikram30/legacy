"use client";

import React, { useState } from "react";
import { VaultStatus } from "@/lib/constants";
import { AddressChip } from "./AddressChip";

interface HeirListProps {
  heirs: readonly `0x${string}`[];
  vaultStatus: VaultStatus;
  /** Lowercased heir address → friendly name, resolved off-chain. */
  heirNames?: Record<string, string>;
  onAddHeir: (heirAddress: `0x${string}`, name: string) => Promise<void>;
  onRemoveHeir: (heirAddress: `0x${string}`) => Promise<void>;
  isLoading?: boolean;
}

export function HeirList({
  heirs,
  vaultStatus,
  heirNames = {},
  onAddHeir,
  onRemoveHeir,
  isLoading = false,
}: HeirListProps) {
  const [newHeirName, setNewHeirName] = useState("");
  const [newHeirInput, setNewHeirInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const isGreen = vaultStatus === VaultStatus.Green;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newHeirName.trim();
    const addr = newHeirInput.trim();

    if (!name) {
      setErrorText("Give this beneficiary a name first (e.g. “Jordan — daughter”).");
      return;
    }

    if (!addr.startsWith("0x") || addr.length !== 42) {
      setErrorText("Enter a valid 42-character Ethereum address (0x...)");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorText(null);
      await onAddHeir(addr as `0x${string}`, name);
      setNewHeirName("");
      setNewHeirInput("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add heir";
      setErrorText(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (heir: `0x${string}`) => {
    try {
      setIsSubmitting(true);
      setErrorText(null);
      await onRemoveHeir(heir);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove heir";
      setErrorText(msg);
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
            Authorized Heirs
          </h3>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "4px", lineHeight: 1.5 }}>
            Designated addresses permitted to initiate succession claims if this vault transitions to Red status.
          </p>
        </div>
        {!isGreen && (
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
            Modifications Locked (Vault Not Green)
          </span>
        )}
      </div>

      {/* Add Heir form — web2 flow: name the beneficiary first, then their wallet */}
      {isGreen && (
        <form
          onSubmit={handleAdd}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            padding: "18px",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            backgroundColor: "rgba(255, 255, 255, 0.015)",
          }}
        >
          {/* Step 1 — Name */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              htmlFor="heir-name-input"
              style={{
                fontSize: "0.6875rem",
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                fontFamily: "var(--font-data)",
              }}
            >
              1 // Beneficiary Name
            </label>
            <input
              id="heir-name-input"
              type="text"
              className="input-instrument"
              placeholder="e.g. Jordan — daughter"
              value={newHeirName}
              onChange={(e) => setNewHeirName(e.target.value)}
              disabled={isSubmitting || isLoading}
              maxLength={60}
              style={{
                fontSize: "0.9375rem",
                backgroundColor: "#000000",
                borderColor: "rgba(255, 255, 255, 0.2)",
                padding: "12px 16px",
                borderRadius: 0,
              }}
              autoComplete="off"
            />
          </div>

          {/* Step 2 — Wallet address */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              htmlFor="heir-address-input"
              style={{
                fontSize: "0.6875rem",
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                fontFamily: "var(--font-data)",
              }}
            >
              2 // Wallet Address
            </label>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <input
                id="heir-address-input"
                type="text"
                className="input-instrument font-data"
                placeholder="0x… (42-character heir wallet address)"
                value={newHeirInput}
                onChange={(e) => setNewHeirInput(e.target.value)}
                disabled={isSubmitting || isLoading}
                style={{
                  flex: "1 1 320px",
                  fontSize: "0.875rem",
                  backgroundColor: "#000000",
                  borderColor: "rgba(255, 255, 255, 0.2)",
                  padding: "12px 16px",
                  borderRadius: 0,
                }}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="submit"
                className="btn-brass"
                disabled={isSubmitting || isLoading || !newHeirName.trim() || !newHeirInput.trim()}
                style={{ padding: "12px 24px", fontSize: "0.8125rem", whiteSpace: "nowrap", borderRadius: 0 }}
              >
                {isSubmitting ? "DESIGNATING…" : "+ DESIGNATE HEIR"}
              </button>
            </div>
          </div>
        </form>
      )}

      {errorText && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "rgba(193, 80, 63, 0.15)",
            border: "1px solid var(--status-red)",
            borderRadius: 0,
            fontSize: "0.8125rem",
            color: "#ffffff",
          }}
        >
          {errorText}
        </div>
      )}

      {/* Table of Heirs */}
      {isLoading ? (
        <div style={{ border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: 0, overflow: "hidden" }}>
          <table className="table-instrument">
            <thead>
              <tr style={{ backgroundColor: "rgba(255, 255, 255, 0.04)" }}>
                <th style={{ width: "80px" }}>INDEX</th>
                <th>BENEFICIARY</th>
                <th>HEIR ADDRESS</th>
                {isGreen && <th style={{ textAlign: "right" }}>ACTION</th>}
              </tr>
            </thead>
            <tbody>
              {[1, 2].map((i) => (
                <tr key={i}>
                  <td>
                    <div className="skeleton-shimmer" style={{ width: "24px", height: "14px" }} />
                  </td>
                  <td>
                    <div className="skeleton-shimmer" style={{ width: "220px", height: "20px" }} />
                  </td>
                  <td>
                    <div className="skeleton-shimmer" style={{ width: "110px", height: "14px" }} />
                  </td>
                  {isGreen && (
                    <td style={{ textAlign: "right" }}>
                      <div className="skeleton-shimmer" style={{ width: "70px", height: "26px", marginLeft: "auto" }} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : heirs.length === 0 ? (
        <div
          style={{
            padding: "32px 24px",
            border: "1px dashed rgba(255, 255, 255, 0.12)",
            backgroundColor: "rgba(255, 255, 255, 0.01)",
            borderRadius: 0,
          }}
        >
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
            No authorized heirs designated yet. Enter an address above to authorize a succession beneficiary.
          </p>
        </div>
      ) : (
        <div style={{ border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: 0, overflow: "hidden" }}>
          <table className="table-instrument">
            <thead>
              <tr style={{ backgroundColor: "rgba(255, 255, 255, 0.04)" }}>
                <th style={{ width: "80px" }}>INDEX</th>
                <th>BENEFICIARY</th>
                <th>HEIR ADDRESS</th>
                {isGreen && <th style={{ textAlign: "right" }}>ACTION</th>}
              </tr>
            </thead>
            <tbody>
              {heirs.map((heir, idx) => {
                const heirName = heirNames[heir.toLowerCase()];
                return (
                <tr key={heir}>
                  <td className="font-data" style={{ color: "var(--accent-brass)", fontSize: "0.8125rem" }}>
                    0{idx + 1}{" //"}
                  </td>
                  <td>
                    {heirName ? (
                      <span style={{ color: "#ffffff", fontSize: "0.875rem", fontWeight: 500 }}>{heirName}</span>
                    ) : (
                      <span style={{ color: "var(--text-secondary)", fontSize: "0.8125rem", fontFamily: "var(--font-data)" }}>
                        Beneficiary #{idx + 1}
                      </span>
                    )}
                  </td>
                  <td>
                    <AddressChip address={heir} badge="" size="md" />
                  </td>
                  {isGreen && (
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => handleRemove(heir)}
                        disabled={isSubmitting}
                        className="btn-secondary"
                        style={{
                          padding: "6px 12px",
                          fontSize: "0.75rem",
                          borderRadius: 0,
                          borderColor: "rgba(193, 80, 63, 0.35)",
                          color: "var(--status-red)",
                        }}
                      >
                        REVOKE
                      </button>
                    </td>
                  )}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
