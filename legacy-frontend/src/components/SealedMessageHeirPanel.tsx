"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSignMessage } from "wagmi";
import {
  buildDeriveMessage,
  derivePrivateKey,
  unsealMessage,
  type SealedBundle,
} from "@/lib/inheritance/crypto";

interface SealedMessageHeirPanelProps {
  vaultAddress: `0x${string}`;
  heirAddress: `0x${string}`;
  isHeir: boolean;
}

interface HeirInheritanceState {
  enrolled: boolean;
  hasSealed: boolean;
  canReveal: boolean;
  sealedAt: number | null;
  bundle: SealedBundle | null;
}

export function SealedMessageHeirPanel({ vaultAddress, heirAddress, isHeir }: SealedMessageHeirPanelProps) {
  const { signMessageAsync } = useSignMessage();
  const [state, setState] = useState<HeirInheritanceState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/inheritance?vault=${vaultAddress}&heir=${heirAddress}`);
      const data = await res.json();
      if (res.ok) {
        setState({
          enrolled: Boolean(data.enrolled),
          hasSealed: Boolean(data.hasSealed),
          canReveal: Boolean(data.canReveal),
          sealedAt: data.sealedAt ?? null,
          bundle: data.bundle ?? null,
        });
      }
    } catch {
      /* ignore — panel simply won't render actions */
    } finally {
      setIsLoading(false);
    }
  }, [vaultAddress, heirAddress]);

  useEffect(() => {
    if (isHeir) load();
  }, [isHeir, load]);

  const handleEnroll = async () => {
    try {
      setBusy(true);
      setError(null);
      const message = buildDeriveMessage(vaultAddress, heirAddress);
      const signature = await signMessageAsync({ message });
      const res = await fetch("/api/inheritance/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaultAddress, heirAddress, signature }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Enrollment failed");
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Enrollment failed";
      setError(msg.includes("User rejected") ? "Signature request rejected." : msg);
    } finally {
      setBusy(false);
    }
  };

  const handleUnseal = async () => {
    if (!state?.bundle) return;
    try {
      setBusy(true);
      setError(null);
      const message = buildDeriveMessage(vaultAddress, heirAddress);
      const signature = await signMessageAsync({ message });
      const priv = derivePrivateKey(signature);
      const plaintext = unsealMessage(state.bundle, priv);
      setRevealed(plaintext);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to unseal";
      // A wrong signature (non-deterministic wallet) yields an auth failure on decrypt.
      setError(
        msg.includes("User rejected")
          ? "Signature request rejected."
          : "Could not decrypt. Ensure you're using the same wallet that enrolled this key."
      );
    } finally {
      setBusy(false);
    }
  };

  if (!isHeir) return null;

  return (
    <section className="console-card">
      <div className="console-tabpanel panel-stack">
        <h3 className="panel-title" style={{ fontSize: "1.0625rem" }}>
          Sealed message
        </h3>

        {isLoading || !state ? (
          <div className="skeleton-shimmer" style={{ width: "100%", height: 60, borderRadius: 12 }} />
        ) : revealed !== null ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="state-pill">
              <span className="network-dot" style={{ backgroundColor: "var(--status-green)" }} />
              Decrypted — visible only in your browser
            </span>
            <pre className="panel-summary font-data" style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {revealed}
            </pre>
            <button type="button" onClick={() => setRevealed(null)} className="flow-btn flow-btn--ghost" style={{ alignSelf: "flex-start" }}>
              Hide
            </button>
          </div>
        ) : !state.enrolled ? (
          <>
            <p className="panel-lead">
              The owner can leave you a private message. Sign once (free, no gas) to set up your key, so only you can ever read it.
            </p>
            <button type="button" onClick={handleEnroll} disabled={busy} className="flow-btn" style={{ alignSelf: "flex-start" }}>
              {busy ? "Waiting for signature…" : "Set up your key"}
            </button>
          </>
        ) : !state.hasSealed ? (
          <p className="panel-lead">No message yet. It&apos;ll appear here once the owner writes one.</p>
        ) : !state.canReveal ? (
          <div className="panel-note">
            <strong>A message is waiting.</strong> It unlocks once claims open.
          </div>
        ) : (
          <>
            <div className="panel-note panel-note--success">
              <strong>A sealed message is ready.</strong> Sign to decrypt it in your browser.
            </div>
            <button type="button" onClick={handleUnseal} disabled={busy} className="flow-btn" style={{ alignSelf: "flex-start" }}>
              {busy ? "Decrypting…" : "Unseal message"}
            </button>
          </>
        )}

        {error && <div className="panel-note panel-note--error">{error}</div>}
      </div>
    </section>
  );
}
