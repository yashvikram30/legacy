"use client";

import React, { useEffect, useRef, useState } from "react";

interface VaultCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (vaultName: string, ownerName: string) => void;
  /** Pre-fills "Your name" with what the owner used on a previous vault. */
  defaultOwnerName?: string;
}

const MAX_NAME_LENGTH = 60;

/**
 * Web2-style first step of vault creation: the owner names the vault and
 * themselves before any wallet interaction. Both names are metadata
 * persisted off-chain once the vault address is known — they never touch
 * the deployment transaction.
 */
export function VaultCreationModal({ isOpen, onClose, onDeploy, defaultOwnerName = "" }: VaultCreationModalProps) {
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset fields each time the modal opens
      setName("");
      setOwnerName(defaultOwnerName);
      // Focus the field on open for an immediate, web2-form feel.
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [isOpen, defaultOwnerName]);

  if (!isOpen) return null;

  const trimmed = name.trim();
  const trimmedOwner = ownerName.trim();
  const isValid = (v: string) => v.length > 0 && v.length <= MAX_NAME_LENGTH;
  const canSubmit = isValid(trimmed) && isValid(trimmedOwner);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onDeploy(trimmed, trimmedOwner);
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-vault-title"
      >
        <div className="flow-header">
          <h2 id="new-vault-title" className="flow-title">
            New vault
          </h2>
          <p className="flow-sub">Your heirs will see these names, not wallet addresses.</p>
          <button type="button" onClick={onClose} className="flow-close" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flow-fields">
          <label className="flow-field">
            <span>Vault name</span>
            <input
              ref={inputRef}
              type="text"
              className="flow-input"
              placeholder="Family Estate"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_NAME_LENGTH}
              autoComplete="off"
            />
          </label>

          <label className="flow-field">
            <span>Your name</span>
            <input
              type="text"
              className="flow-input"
              placeholder="Maria Chen"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              maxLength={MAX_NAME_LENGTH}
              autoComplete="name"
            />
          </label>
        </div>

        <div className="flow-footer" style={{ justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} className="flow-btn flow-btn--ghost">
            Cancel
          </button>
          <button type="submit" disabled={!canSubmit} className="flow-btn">
            Create vault
          </button>
        </div>
      </form>
    </div>
  );
}
