"use client";

import React from "react";
import Link from "next/link";
import { AddressChip } from "./AddressChip";

interface VaultHeaderProps {
  selectedVault: `0x${string}` | null;
  userVaults: readonly `0x${string}`[] | undefined;
  onSelectVault: (vault: `0x${string}`) => void;
  onCreateVault: () => void;
  isCreatingVault: boolean;
  isWrongChain: boolean;
  onSwitchChain: () => void;
}

export function VaultHeader({
  selectedVault,
  userVaults,
  onSelectVault,
  onCreateVault,
  isCreatingVault,
  isWrongChain,
  onSwitchChain,
}: VaultHeaderProps) {
  const hasMultipleVaults = Boolean(userVaults && userVaults.length > 0);

  const handleSelectorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "__DEPLOY_NEW__") {
      if (isWrongChain) {
        onSwitchChain();
      } else {
        onCreateVault();
      }
    } else if (val) {
      onSelectVault(val as `0x${string}`);
    }
  };

  return (
    <div style={{ padding: "24px 32px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
      {/* Top row: clean navigation path + network indicator */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8125rem" }}>
          <Link
            href="/"
            style={{
              color: "var(--text-secondary)",
              textDecoration: "none",
              transition: "color 0.15s ease",
            }}
          >
            Home
          </Link>
          <span style={{ color: "rgba(255, 255, 255, 0.25)" }}>/</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>Vault Console</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: isWrongChain ? "var(--status-red)" : "var(--status-green)",
              boxShadow: `0 0 6px ${isWrongChain ? "var(--status-red)" : "var(--status-green)"}`,
            }}
          />
          <span
            className="font-data"
            style={{
              fontSize: "0.6875rem",
              letterSpacing: "0.02em",
              color: isWrongChain ? "var(--status-red)" : "var(--text-secondary)",
            }}
          >
            {isWrongChain ? "Wrong Network" : "World Chain Sepolia (4801)"}
          </span>
        </div>
      </div>

      {/* Main vault selector + active address row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        {/* Left: Active address on one clean line */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Active Vault
          </span>
          {selectedVault ? (
            <AddressChip
              address={selectedVault}
              badge="EIP-1167 Clone"
              size="md"
            />
          ) : (
            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              No vault deployed under connected wallet.
            </span>
          )}
        </div>

        {/* Right: Consolidated vault selector / deploy button */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {hasMultipleVaults && (
            <select
              value={selectedVault ?? ""}
              onChange={handleSelectorChange}
              disabled={isCreatingVault}
              className="input-instrument font-data"
              style={{
                width: "auto",
                minWidth: "220px",
                padding: "8px 12px",
                fontSize: "0.8125rem",
                borderRadius: 0,
                backgroundColor: "#000000",
                borderColor: "rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                cursor: "pointer",
              }}
              aria-label="Switch vault or deploy new"
            >
              <optgroup label="Succession Vaults">
                {userVaults?.map((v, i) => {
                  const isLegacy = v.toLowerCase() === "0x95a15387dd33a87c5ca07e3ec3dc2acfd982ca97".toLowerCase();
                  return (
                    <option key={v} value={v}>
                      Vault #{i + 1} · {v.slice(0, 6)}…{v.slice(-4)} {isLegacy ? "(Legacy)" : ""}
                    </option>
                  );
                })}
              </optgroup>
              <optgroup label="Actions">
                <option value="__DEPLOY_NEW__">
                  {isCreatingVault ? "Deploying Clone…" : "+ Deploy Another Vault"}
                </option>
              </optgroup>
            </select>
          )}

          {(!hasMultipleVaults || (userVaults && userVaults.length === 1)) && (
            <button
              type="button"
              onClick={isWrongChain ? onSwitchChain : onCreateVault}
              disabled={isCreatingVault}
              className="btn-secondary"
              style={{
                fontSize: "0.75rem",
                padding: "8px 14px",
                borderRadius: 0,
                fontFamily: "var(--font-data)",
                whiteSpace: "nowrap",
              }}
            >
              {isCreatingVault
                ? "Deploying…"
                : isWrongChain
                ? "Switch Network"
                : "+ Deploy Another Vault"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
