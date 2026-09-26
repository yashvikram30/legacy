"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSignMessage } from "wagmi";
import {
  buildDeriveMessage,
  derivePrivateKey,
  sha256Hex,
  unsealBytes,
  unsealMessage,
  type SealedBundle,
  type SealedVideoMeta,
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
  hasSealedVideo: boolean;
  sealedVideoAt: number | null;
  video: SealedVideoMeta | null;
}

export function SealedMessageHeirPanel({ vaultAddress, heirAddress, isHeir }: SealedMessageHeirPanelProps) {
  const { signMessageAsync } = useSignMessage();
  const [state, setState] = useState<HeirInheritanceState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [videoBusy, setVideoBusy] = useState(false);
  const [videoStage, setVideoStage] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [revealedVideoUrl, setRevealedVideoUrl] = useState<string | null>(null);
  const revealedVideoUrlRef = useRef<string | null>(null);

  // Revoke the object URL when it changes or the panel unmounts, so the
  // decrypted plaintext isn't kept around in memory longer than needed.
  useEffect(() => {
    revealedVideoUrlRef.current = revealedVideoUrl;
    return () => {
      if (revealedVideoUrlRef.current) URL.revokeObjectURL(revealedVideoUrlRef.current);
    };
  }, [revealedVideoUrl]);

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
          hasSealedVideo: Boolean(data.hasSealedVideo),
          sealedVideoAt: data.sealedVideoAt ?? null,
          video: data.video ?? null,
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

  const handleUnsealVideo = async () => {
    if (!state?.video) return;
    try {
      setVideoBusy(true);
      setVideoError(null);

      setVideoStage("Fetching encrypted video…");
      const res = await fetch(state.video.blobUrl);
      if (!res.ok) throw new Error("Failed to download the sealed video.");
      const ciphertext = new Uint8Array(await res.arrayBuffer());

      // Defense in depth: confirms the fetched bytes match what the owner
      // actually signed off on, independent of the decryption step below.
      const actualHash = sha256Hex(ciphertext);
      if (actualHash !== state.video.ciphertextHash) {
        throw new Error("Video integrity check failed — the downloaded file doesn't match what was sealed.");
      }

      setVideoStage("Deriving key & decrypting…");
      const message = buildDeriveMessage(vaultAddress, heirAddress);
      const signature = await signMessageAsync({ message });
      const priv = derivePrivateKey(signature);
      const plaintext = unsealBytes(state.video.ephPub, state.video.nonce, ciphertext, priv);

      const blob = new Blob([new Uint8Array(plaintext)], { type: state.video.mimeType });
      setRevealedVideoUrl(URL.createObjectURL(blob));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to unseal video";
      setVideoError(
        msg.includes("User rejected")
          ? "Signature request rejected."
          : msg.includes("integrity check")
          ? msg
          : "Could not decrypt. Ensure you're using the same wallet that enrolled this key."
      );
    } finally {
      setVideoBusy(false);
      setVideoStage(null);
    }
  };

  if (!isHeir) return null;

  return (
    <div
      style={{
        margin: "0 32px 32px",
        padding: "24px",
        border: "1px solid var(--border-hairline)",
        background: "rgba(255,255,255,0.02)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <span className="section-tag" style={{ margin: 0 }}>[ SEALED LEGACY MESSAGE ]</span>

      {isLoading || !state ? (
        <div className="skeleton-shimmer" style={{ width: "100%", height: 60 }} />
      ) : !state.enrolled ? (
        <>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
            The vault owner can leave you a private, encrypted message or video. Enroll your decryption key (a free,
            gasless signature) so the owner can seal one to your wallet. Only you will ever be able to open it.
          </p>
          <button
            type="button"
            onClick={handleEnroll}
            disabled={busy}
            className="btn-hero-action"
            style={{ alignSelf: "flex-start", padding: "12px 24px" }}
          >
            <span>{busy ? "AWAITING SIGNATURE…" : "ENROLL DECRYPTION KEY"}</span>
            <span className="arrow-icon" aria-hidden="true">→</span>
          </button>
        </>
      ) : !state.hasSealed && !state.hasSealedVideo ? (
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
          ✓ You&apos;re enrolled. Nothing has been sealed to you yet — the owner can now leave a message or video, and
          it will appear here to unseal after succession.
        </p>
      ) : !state.canReveal ? (
        <p style={{ fontSize: "0.875rem", color: "var(--text-primary)", lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: "var(--status-amber)" }}>
            A sealed {state.hasSealed && state.hasSealedVideo ? "message and video await" : state.hasSealedVideo ? "video awaits" : "message awaits"} you.
          </strong>{" "}
          It unlocks once the vault enters succession (Red status). Until then it stays encrypted and cannot be
          retrieved.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {state.hasSealed && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {revealed !== null ? (
                <>
                  <span style={{ fontSize: "0.75rem", color: "var(--status-green)", fontFamily: "var(--font-data)" }}>
                    ✓ DECRYPTED · visible only in your browser
                  </span>
                  <pre
                    className="font-data"
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
                    className="btn-secondary"
                    style={{ alignSelf: "flex-start", padding: "6px 14px", fontSize: "0.75rem" }}
                  >
                    Hide
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-primary)", lineHeight: 1.6, margin: 0 }}>
                    <strong style={{ color: "var(--status-green)" }}>A sealed message is ready.</strong> Sign to
                    derive your key and decrypt it locally in your browser.
                  </p>
                  <button
                    type="button"
                    onClick={handleUnseal}
                    disabled={busy}
                    className="btn-hero-action"
                    style={{ alignSelf: "flex-start", padding: "12px 24px" }}
                  >
                    <span>{busy ? "DECRYPTING…" : "UNSEAL MESSAGE"}</span>
                    <span className="arrow-icon" aria-hidden="true">→</span>
                  </button>
                </>
              )}
            </div>
          )}

          {state.hasSealedVideo && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                borderTop: state.hasSealed ? "1px solid var(--border-hairline)" : undefined,
                paddingTop: state.hasSealed ? 16 : 0,
              }}
            >
              {revealedVideoUrl ? (
                <>
                  <span style={{ fontSize: "0.75rem", color: "var(--status-green)", fontFamily: "var(--font-data)" }}>
                    ✓ DECRYPTED · visible only in your browser
                  </span>
                  <video controls src={revealedVideoUrl} style={{ width: "100%", maxHeight: 420, background: "#000000" }} />
                  <button
                    type="button"
                    onClick={() => setRevealedVideoUrl(null)}
                    className="btn-secondary"
                    style={{ alignSelf: "flex-start", padding: "6px 14px", fontSize: "0.75rem" }}
                  >
                    Hide
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-primary)", lineHeight: 1.6, margin: 0 }}>
                    <strong style={{ color: "var(--status-green)" }}>A sealed video is ready.</strong> Sign to derive
                    your key and decrypt it locally in your browser.
                  </p>
                  {videoStage && (
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "var(--font-data)" }}>
                      {videoStage}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleUnsealVideo}
                    disabled={videoBusy}
                    className="btn-hero-action"
                    style={{ alignSelf: "flex-start", padding: "12px 24px" }}
                  >
                    <span>{videoBusy ? "DECRYPTING…" : "UNSEAL VIDEO"}</span>
                    <span className="arrow-icon" aria-hidden="true">→</span>
                  </button>
                  {videoError && (
                    <div
                      style={{
                        padding: "10px 14px",
                        fontSize: "0.8125rem",
                        fontFamily: "var(--font-data)",
                        color: "#ffffff",
                        border: "1px solid var(--status-red)",
                        background: "rgba(193,80,63,0.12)",
                      }}
                    >
                      {videoError}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "10px 14px",
            fontSize: "0.8125rem",
            fontFamily: "var(--font-data)",
            color: "#ffffff",
            border: "1px solid var(--status-red)",
            background: "rgba(193,80,63,0.12)",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
