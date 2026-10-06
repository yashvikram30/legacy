"use client";

import React, { useState } from "react";

interface AddressChipProps {
  address: string;
  badge?: string;
  showCopy?: boolean;
  showExplorer?: boolean;
  truncate?: boolean;
  size?: "sm" | "md" | "lg";
  style?: React.CSSProperties;
}

export function AddressChip({
  address,
  badge = "EIP-1167 Clone",
  showCopy = true,
  showExplorer = true,
  truncate = false,
  size = "md",
  style,
}: AddressChipProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const displayText = truncate
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address;

  const fontSizes = {
    sm: "0.8125rem",
    md: "0.875rem",
    lg: "1rem",
  };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        flexWrap: "wrap",
        fontSize: fontSizes[size],
        ...style,
      }}
    >
      <span
        className="font-data"
        style={{
          fontWeight: 600,
          color: "#ffffff",
          letterSpacing: "0.01em",
        }}
      >
        {displayText}
      </span>

      <span style={{ color: "rgba(255, 255, 255, 0.2)", fontSize: "0.75rem" }}>·</span>

      {showCopy && (
        <button
          type="button"
          onClick={handleCopy}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            fontFamily: "var(--font-data)",
            fontSize: "0.75rem",
            color: copied ? "var(--status-green)" : "var(--text-secondary)",
            cursor: "pointer",
            transition: "color 0.15s ease",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
          }}
          title="Copy address to clipboard"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      )}

      {showExplorer && (
        <>
          <span style={{ color: "rgba(255, 255, 255, 0.2)", fontSize: "0.75rem" }}>·</span>
          <a
            href={`https://sepolia.worldscan.org/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: "var(--font-data)",
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
              transition: "color 0.15s ease",
            }}
            title="View contract on Worldscan"
          >
            Worldscan ↗
          </a>
        </>
      )}

      {badge && (
        <>
          <span style={{ color: "rgba(255, 255, 255, 0.2)", fontSize: "0.75rem" }}>·</span>
          <span
            style={{
              fontSize: "0.6875rem",
              fontFamily: "var(--font-data)",
              color: "var(--accent-brass)",
              letterSpacing: "0.04em",
            }}
          >
            {badge}
          </span>
        </>
      )}
    </div>
  );
}
