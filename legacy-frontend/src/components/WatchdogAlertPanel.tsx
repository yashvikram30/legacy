"use client";

import React, { useState, useEffect } from "react";
import { VaultNotificationSubscription, AlertLogEntry } from "@/types/notifications";

interface WatchdogAlertPanelProps {
  vaultAddress: `0x${string}`;
  ownerAddress?: `0x${string}`;
}

export function WatchdogAlertPanel({
  vaultAddress,
  ownerAddress,
}: WatchdogAlertPanelProps) {
  const [subscription, setSubscription] = useState<VaultNotificationSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  // Form states
  const [emailInput, setEmailInput] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);

  const fetchSubscription = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/notifications/subscribe?vault=${vaultAddress}`);
      if (res.ok) {
        const data = await res.json();
        if (data.subscription) {
          setSubscription(data.subscription);
          setEmailInput(data.subscription.email || "");
          setPushEnabled(Boolean(data.subscription.pushEnabled));
        }
      }
    } catch (err) {
      console.warn("Failed to load subscription:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (vaultAddress) {
      fetchSubscription();
    }
  }, [vaultAddress]);

  const handleSaveEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ownerAddress) return;

    const trimmed = emailInput.trim().toLowerCase();
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setFeedback({ message: "Please enter a valid email address.", isError: true });
      return;
    }

    try {
      setIsSaving(true);
      setFeedback(null);

      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultAddress,
          ownerAddress,
          email: trimmed,
          pushEnabled,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update notification settings");
      }

      setSubscription(data.subscription);
      setFeedback({
        message: trimmed
          ? "Saved. Alerts will go to this email."
          : "Alert settings updated.",
        isError: false,
      });
    } catch (err) {
      setFeedback({
        message: err instanceof Error ? err.message : "Failed to save email",
        isError: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const togglePush = () => {
    const next = !pushEnabled;
    setPushEnabled(next);
    if (ownerAddress) {
      fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultAddress,
          ownerAddress,
          email: emailInput.trim().toLowerCase(),
          pushEnabled: next,
        }),
      }).then(() => fetchSubscription());
    }
  };

  const handleSendTestAlert = async () => {
    if (!subscription?.email && !subscription?.pushEnabled) {
      setFeedback({
        message: "Save an email address or enable wallet notifications first.",
        isError: true,
      });
      return;
    }

    try {
      setIsSendingTest(true);
      setFeedback(null);

      const res = await fetch("/api/notifications/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultAddress,
          channel: "all",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch test notification");
      }

      const channels = (data.channelsNotified || []).join(", ");
      setFeedback({
        message: `Test alert sent${channels ? ` via ${channels}` : ""}. Check your inbox.`,
        isError: false,
      });
      fetchSubscription();
    } catch (err) {
      setFeedback({
        message: err instanceof Error ? err.message : "Failed to send test alert",
        isError: true,
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const isArmed = Boolean(subscription?.email || subscription?.pushEnabled);
  const emailChanged = emailInput.trim().toLowerCase() !== (subscription?.email ?? "");

  return (
    <div className="panel-stack">
      <div className="panel-head">
        <div>
          <h3 className="panel-title">Alerts</h3>
          <p className="panel-lead">Get a heads-up before a check-in is due, and the moment an heir starts a claim.</p>
        </div>
        {!isLoading && (
          <span className="state-pill">
            <span className="network-dot" style={{ backgroundColor: isArmed ? "var(--status-green)" : "rgba(255,255,255,0.3)" }} />
            {isArmed ? "Alerts on" : "Alerts off"}
          </span>
        )}
      </div>

      <div className="setting-list">
        <form onSubmit={handleSaveEmail} className="setting-row">
          <div className="setting-label">
            <strong>Email</strong>
            <span>{subscription?.email ? `Sending to ${subscription.email}` : "Kept private. Never stored on-chain."}</span>
          </div>
          <div className="setting-control" style={{ flex: "1 1 320px", justifyContent: "flex-end" }}>
            <input
              type="email"
              className="flow-input"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="you@example.com"
              aria-label="Alert email"
              disabled={isSaving}
              style={{ flex: "1 1 200px", maxWidth: 300 }}
            />
            <button type="submit" className="flow-btn" disabled={isSaving || !emailChanged}>
              {isSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>

        <div className="setting-row">
          <div className="setting-label">
            <strong>Wallet notifications</strong>
            <span>Also get alerts in Push-compatible wallets.</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={pushEnabled}
            aria-label="Wallet notifications"
            className="toggle"
            onClick={togglePush}
          />
        </div>
      </div>

      {feedback && (
        <div className={`panel-note ${feedback.isError ? "panel-note--error" : "panel-note--success"}`}>{feedback.message}</div>
      )}

      <div className="panel-summary">
        <ul className="bullet-list">
          <li>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            Reminders before your next check-in is due
          </li>
          <li>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6l8-3z" />
              <path d="M12 9v4M12 16h.01" />
            </svg>
            An instant alert if an heir starts a claim, with a link to cancel it
          </li>
        </ul>
      </div>

      {isArmed && (
        <div className="panel-actions" style={{ justifyContent: "flex-start" }}>
          <button type="button" className="flow-btn flow-btn--ghost" onClick={handleSendTestAlert} disabled={isSendingTest}>
            {isSendingTest ? "Sending…" : "Send a test alert"}
          </button>
        </div>
      )}

      {subscription?.recentAlerts && subscription.recentAlerts.length > 0 && (
        <div>
          <p style={{ margin: "0 0 8px", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>Recent alerts</p>
          <div className="setting-list">
            {subscription.recentAlerts.slice(0, 5).map((alert: AlertLogEntry) => (
              <div key={alert.id} className="setting-row" style={{ padding: "12px 20px" }}>
                <span style={{ fontSize: "0.875rem", color: "var(--text-primary)" }}>{alert.title}</span>
                <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                  {new Date(alert.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
