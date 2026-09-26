"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSignMessage } from "wagmi";
import { buildSealMessage, digestBundle, sealMessage } from "@/lib/inheritance/crypto";

interface SealedMessagePanelProps {
  vaultAddress: `0x${string}`;
  ownerAddress: `0x${string}`;
  heirs: readonly `0x${string}`[];
}

interface InheritanceState {
  enrolled: boolean;
  heirPublicKey: string | null;
  hasSealed: boolean;
  sealedAt: number | null;
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function SealedMessagePanel({ vaultAddress, ownerAddress, heirs }: SealedMessagePanelProps) {
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
      setFeedback({ text: "Enter a message to seal.", isError: true });
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

      setFeedback({ text: "Message sealed. Only this heir can decrypt it, and only after succession.", isError: false });
      setText("");
      loadState(selectedHeir);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to seal message";
      setFeedback({ text: msg.includes("User rejected") ? "Signature request rejected." : msg, isError: true });
    } finally {
      setIsSealing(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <span className="section-tag">[ SEALED LEGACY MESSAGE ]</span>
        <h3 className="section-title" style={{ fontSize: "1.375rem", margin: "6px 0 8px" }}>
          Encrypt a Message for an Heir
        </h3>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 620 }}>
          Write a private message — a passphrase, final words, instructions — sealed to a single heir&apos;s wallet.
          You can write it but never read it back. The heir can decrypt it only after your vault enters succession.
        </p>
      </div>

      {heirs.length === 0 ? (
        <div style={{ padding: "16px 20px", border: "1px solid var(--border-hairline)", background: "rgba(255,255,255,0.02)", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          Add an authorized heir first — sealed messages are addressed to a specific heir.
        </div>
      ) : (
        <>
          {/* Heir selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="section-tag" style={{ margin: 0 }}>SELECT HEIR</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {heirs.map((h) => {
                const active = h.toLowerCase() === selectedHeir?.toLowerCase();
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setSelectedHeir(h)}
                    className="font-data"
                    style={{
                      padding: "8px 14px",
                      fontSize: "0.8125rem",
                      cursor: "pointer",
                      background: active ? "rgba(184,137,74,0.16)" : "transparent",
                      color: active ? "var(--accent-brass)" : "var(--text-secondary)",
                      border: `1px solid ${active ? "var(--accent-brass)" : "var(--border-hairline)"}`,
                    }}
                  >
                    {short(h)}
                  </button>
                );
              })}
            </div>
          </div>

          {isLoading || !state ? (
            <div className="skeleton-shimmer" style={{ width: "100%", height: 120 }} />
          ) : !state.enrolled ? (
            <div style={{ padding: "16px 20px", border: "1px solid var(--status-amber)", background: "rgba(217,154,61,0.08)", fontSize: "0.875rem", color: "var(--text-primary)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--status-amber)" }}>Heir not enrolled yet.</strong> Heir {short(selectedHeir!)} must
              open the Heir Portal and enroll their decryption key before you can seal a message to them. Once they enroll,
              their key appears here automatically.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: "0.75rem", color: "var(--status-green)", fontFamily: "var(--font-data)" }}>
                ✓ Heir enrolled · encryption key on file
                {state.hasSealed && state.sealedAt ? ` · last sealed ${new Date(state.sealedAt).toLocaleString()}` : ""}
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write the private message to seal for this heir…"
                rows={5}
                className="font-data"
                style={{
                  width: "100%",
                  resize: "vertical",
                  padding: "12px 16px",
                  background: "#000000",
                  border: "1px solid var(--border-hairline)",
                  color: "#ffffff",
                  fontSize: "0.875rem",
                  lineHeight: 1.5,
                }}
              />
              <button
                type="button"
                onClick={handleSeal}
                disabled={isSealing || text.trim().length === 0}
                className="btn-hero-action"
                style={{ alignSelf: "flex-start", padding: "12px 24px" }}
              >
                <span>{isSealing ? "SEALING…" : state.hasSealed ? "RE-SEAL MESSAGE" : "SEAL & STORE"}</span>
                <span className="arrow-icon" aria-hidden="true">→</span>
              </button>
              {state.hasSealed && (
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>
                  Re-sealing overwrites the previous message for this heir.
                </p>
              )}
            </div>
          )}

          {feedback && (
            <div
              style={{
                padding: "12px 16px",
                fontSize: "0.8125rem",
                fontFamily: "var(--font-data)",
                color: "#ffffff",
                border: `1px solid ${feedback.isError ? "var(--status-red)" : "var(--status-green)"}`,
                background: feedback.isError ? "rgba(193,80,63,0.12)" : "rgba(76,175,109,0.12)",
              }}
            >
              {feedback.text}
            </div>
          )}
        </>
      )}
    </div>
  );
}
