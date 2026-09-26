"use client";

import React, { useEffect, useRef, useState } from "react";

interface VaultCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (vaultName: string) => void;
}

const MAX_NAME_LENGTH = 60;

/**
 * Web2-style first step of vault creation: the owner gives the vault a
 * human-readable name before any wallet interaction. The name is metadata
 * persisted off-chain once the vault address is known — it never touches
 * the deployment transaction.
 */
export function VaultCreationModal({ isOpen, onClose, onDeploy }: VaultCreationModalProps) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset field each time the modal opens
      setName("");
      // Focus the field on open for an immediate, web2-form feel.
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= MAX_NAME_LENGTH;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onDeploy(trimmed);
  };

  return (
    <div
      className="deployment-overlay modal-backdrop-animate"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="deployment-modal modal-surface-animate"
        style={{ maxWidth: "480px" }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            background: "rgba(255, 255, 255, 0.02)",
          }}
        >
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
            [ NEW VAULT ]
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
            NAME YOUR SUCCESSION VAULT
          </h2>
        </div>

        {/* Body */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: 0 }}>
            Give this vault a name you&apos;ll recognize — like{" "}
            <span style={{ color: "var(--text-primary)" }}>&ldquo;Family Estate&rdquo;</span> or{" "}
            <span style={{ color: "var(--text-primary)" }}>&ldquo;Cold Storage Legacy&rdquo;</span>. It&apos;s a
            private label for your dashboard and is stored off-chain.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              htmlFor="vault-name-input"
              style={{
                fontSize: "0.6875rem",
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                fontFamily: "var(--font-data)",
              }}
            >
              Vault Name
            </label>
            <input
              id="vault-name-input"
              ref={inputRef}
              type="text"
              className="input-instrument"
              placeholder="e.g. Family Estate"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_NAME_LENGTH}
              autoComplete="off"
              style={{ fontSize: "0.9375rem", borderRadius: 0, padding: "12px 16px", backgroundColor: "#000000" }}
            />
            <span style={{ fontSize: "0.6875rem", color: "rgba(255, 255, 255, 0.4)", textAlign: "right" }}>
              {trimmed.length}/{MAX_NAME_LENGTH}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            background: "rgba(255, 255, 255, 0.015)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: "10px 18px", fontSize: "0.8125rem", borderRadius: 0 }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="btn-brass"
            style={{ padding: "10px 22px", fontSize: "0.8125rem", borderRadius: 0, whiteSpace: "nowrap" }}
          >
            Deploy Vault →
          </button>
        </div>
      </form>
    </div>
  );
}
