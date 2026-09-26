"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSignMessage } from "wagmi";
import { buildSealMessage, digestBundle, sealMessage } from "@/lib/inheritance/crypto";

interface SealedMessagePanelProps {
  vaultAddress: `0x${string}`;
  ownerAddress: `0x${string}`;
  heirs: readonly `0x${string}`[];
  /** Lowercased heir address → display name. */
  heirNames?: Record<string, string>;
  onGoToHeirs?: () => void;
}

interface InheritanceState {
  enrolled: boolean;
  heirPublicKey: string | null;
  hasSealed: boolean;
  sealedAt: number | null;
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function SealedMessagePanel({ vaultAddress, ownerAddress, heirs, heirNames = {}, onGoToHeirs }: SealedMessagePanelProps) {
  const nameOf = (h: string) => heirNames[h.toLowerCase()] ?? short(h);
  const [linkCopied, setLinkCopied] = useState(false);
  const copyPortalLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/claim?v=${vaultAddress}`);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };
  const { signMessageAsync } = useSignMessage();
  const [selectedHeir, setSelectedHeir] = useState<`0x${string}` | null>(heirs[0] ?? null);
  const [state, setState] = useState<InheritanceState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [text, setText] = useState("");
  const [isSealing, setIsSealing] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    if (!selectedHeir && heirs.length > 0) setSelectedHeir(heirs[0]);
  }, [heirs, selectedHeir]);

  const loadState = useCallback(async (heir: `0x${string}`) => {
    setIsLoading(true);
    setState(null);
    try {
      const res = await fetch(`/api/inheritance?vault=${vaultAddress}&heir=${heir}`);
      const data = await res.json();
      if (res.ok) {
        setState({
          enrolled: Boolean(data.enrolled),
          heirPublicKey: data.heirPublicKey ?? null,
          hasSealed: Boolean(data.hasSealed),
          sealedAt: data.sealedAt ?? null,
        });
      } else {
        setState({ enrolled: false, heirPublicKey: null, hasSealed: false, sealedAt: null });
      }
    } catch {
      setState({ enrolled: false, heirPublicKey: null, hasSealed: false, sealedAt: null });
    } finally {
      setIsLoading(false);
    }
  }, [vaultAddress]);

  useEffect(() => {
    if (selectedHeir) loadState(selectedHeir);
  }, [selectedHeir, loadState]);

  const handleSeal = async () => {
    if (!selectedHeir || !state?.heirPublicKey || !signMessageAsync) return;
    if (text.trim().length === 0) {
      setFeedback({ text: "Write a message first.", isError: true });
      return;
    }
    try {
      setIsSealing(true);
      setFeedback(null);

      const bundle = sealMessage(text, state.heirPublicKey);
      const digest = digestBundle(bundle);
      const message = buildSealMessage(vaultAddress, selectedHeir, digest);
      const signature = await signMessageAsync({ message });

      const res = await fetch("/api/inheritance/seal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultAddress,
          heirAddress: selectedHeir,
          ownerAddress,
          bundle,
          signature,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to seal message");

      setFeedback({ text: `Sealed. Only ${nameOf(selectedHeir)} can open it, once the vault passes to them.`, isError: false });
      setText("");
      loadState(selectedHeir);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to seal message";
      setFeedback({ text: msg.includes("User rejected") ? "You declined the signature in your wallet." : msg, isError: true });
    } finally {
      setIsSealing(false);
    }
  };

  return (
    <div className="panel-stack">
      <div className="panel-head">
        <div>
          <h3 className="panel-title">Sealed message</h3>
          <p className="panel-lead">
            Leave a private note for one heir. Only they can open it, and only after the vault passes to them.
          </p>
        </div>
      </div>

      {heirs.length === 0 ? (
        <div className="panel-empty">
          <span>Add an heir first. Each message is sealed to one person.</span>
          {onGoToHeirs && (
            <button type="button" className="flow-btn flow-btn--ghost" onClick={onGoToHeirs}>
              Go to heirs
            </button>
          )}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>To</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} role="group" aria-label="Choose heir">
              {heirs.map((h) => (
                <button
                  key={h}
                  type="button"
                  className="chip"
                  aria-pressed={h.toLowerCase() === selectedHeir?.toLowerCase()}
                  onClick={() => {
                    setFeedback(null);
                    setSelectedHeir(h);
                  }}
                  title={h}
                >
                  {nameOf(h)}
                </button>
              ))}
            </div>
          </div>

          {isLoading || !state ? (
            <div className="skeleton-shimmer" style={{ width: "100%", height: 140, borderRadius: 12 }} />
          ) : !state.enrolled ? (
            <div className="console-alert console-alert--warning">
              <div className="console-alert-body">
                <strong>{nameOf(selectedHeir!)} needs to set up their key first</strong>
                <p>Ask them to open the heir portal and sign in once. You can write to them right after.</p>
              </div>
              <button type="button" className="flow-btn flow-btn--ghost" onClick={copyPortalLink}>
                {linkCopied ? "Link copied" : "Copy portal link"}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Write something only ${nameOf(selectedHeir!)} will read…`}
                rows={6}
                className="flow-input"
                aria-label="Message"
                style={{ resize: "vertical", lineHeight: 1.6 }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                  {state.hasSealed && state.sealedAt
                    ? `Saving replaces the message you sealed on ${new Date(state.sealedAt).toLocaleDateString()}.`
                    : "You won't be able to read it again after sealing."}
                </span>
                <button type="button" onClick={handleSeal} disabled={isSealing || text.trim().length === 0} className="flow-btn">
                  {isSealing ? "Sealing…" : state.hasSealed ? "Replace message" : "Seal message"}
                </button>
              </div>
            </div>
          )}

          {feedback && (
            <div className={`panel-note ${feedback.isError ? "panel-note--error" : "panel-note--success"}`}>{feedback.text}</div>
          )}
        </>
      )}
    </div>
  );
}
