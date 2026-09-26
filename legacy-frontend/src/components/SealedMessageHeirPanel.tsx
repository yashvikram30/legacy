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
          <div className="skeleton-shimmer" style={{ width: "100%", height: 60, borderRadius: "var(--radius-sm, 6px)" }} />
        ) : !state.enrolled ? (
          <>
            <p className="panel-lead" style={{ margin: 0, lineHeight: 1.6 }}>
              The vault owner can leave you a private, encrypted message. Enroll your decryption key (a free,
              gasless signature) so the owner can seal one to your wallet. Only you will ever be able to read it.
            </p>
            <button
              type="button"
              onClick={handleEnroll}
              disabled={busy}
              className="flow-btn"
              style={{ alignSelf: "flex-start" }}
            >
              <span>{busy ? "Awaiting signature…" : "Enroll decryption key →"}</span>
            </button>
          </>
        ) : !state.hasSealed ? (
          <p className="panel-lead" style={{ margin: 0, lineHeight: 1.6 }}>
            ✓ You&apos;re enrolled. No message has been sealed to you yet — the owner can now leave one, and it will appear here to unseal after succession.
          </p>
        ) : !state.canReveal ? (
          <div className="panel-note" style={{ borderLeft: "3px solid var(--status-amber)" }}>
            <strong style={{ color: "var(--status-amber)" }}>A sealed message awaits you.</strong> It unlocks once the
            vault enters succession (Red status). Until then it stays encrypted and cannot be retrieved.
          </div>
        ) : revealed !== null ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="state-pill">
              <span className="network-dot" style={{ backgroundColor: "var(--status-green)" }} />
              Decrypted · visible only in your browser
            </span>
            <pre
              className="panel-summary font-data"
              style={{
                margin: 0,
                padding: "16px",
                background: "#000000",
                border: "1px solid var(--status-green)",
                color: "#ffffff",
                fontSize: "0.875rem",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {revealed}
            </pre>
            <button
              type="button"
              onClick={() => setRevealed(null)}
              className="flow-btn flow-btn--ghost"
              style={{ alignSelf: "flex-start", padding: "6px 14px", fontSize: "0.75rem" }}
            >
              Hide
            </button>
          </div>
        ) : (
          <>
            <div className="panel-note panel-note--success">
              <strong style={{ color: "var(--status-green)" }}>A sealed message is ready.</strong> Sign to derive
              your key and decrypt it locally in your browser.
            </div>
            <button
              type="button"
              onClick={handleUnseal}
              disabled={busy}
              className="flow-btn"
              style={{ alignSelf: "flex-start" }}
            >
              <span>{busy ? "Decrypting…" : "Unseal message →"}</span>
            </button>
          </>
        )}

        {error && <div className="panel-note panel-note--error">{error}</div>}
      </div>
    </section>
  );
}
