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
          ? "Emergency dispatch email saved and armed in MongoDB."
          : "Notification settings updated.",
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

  const handleSendTestAlert = async () => {
    if (!subscription?.email && !subscription?.pushEnabled) {
      setFeedback({
        message: "Please enter and save an email address before sending a test alert.",
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
        message: `Test alert dispatched successfully (${channels || "email"}). Check your inbox!`,
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* Watchdog Status Header */}
      <div
        style={{
          padding: "20px 24px",
          backgroundColor: "#161C20",
          border: "1px solid var(--border-hairline)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: isArmed ? "var(--status-green)" : "var(--status-amber)",
              boxShadow: isArmed
                ? "0 0 10px rgba(76, 175, 109, 0.4)"
                : "0 0 10px rgba(217, 154, 61, 0.4)",
            }}
          />
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.25rem",
                color: "var(--text-primary)",
                fontWeight: 500,
              }}
            >
              Automated Watchdog Network
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              {isArmed
                ? "Armed: Continuous on-chain monitoring. Alerts dispatched to your designated email."
                : "Standby: Enter your email below to arm heartbeat & heir contest warnings."}
            </div>
          </div>
        </div>

        {isArmed && (
          <button
            type="button"
            onClick={handleSendTestAlert}
            disabled={isSendingTest}
            style={{
              padding: "8px 16px",
              backgroundColor: "transparent",
              border: "1px solid var(--accent-brass)",
              color: "var(--accent-brass)",
              fontSize: "0.8125rem",
              fontFamily: "var(--font-data)",
              cursor: isSendingTest ? "not-allowed" : "pointer",
              borderRadius: "4px",
              transition: "all 0.2s ease",
            }}
          >
            {isSendingTest ? "Transmitting..." : "Send Test Email →"}
          </button>
        )}
      </div>

      {feedback && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: feedback.isError ? "rgba(193, 80, 63, 0.1)" : "rgba(76, 175, 109, 0.1)",
            border: `1px solid ${feedback.isError ? "var(--status-red)" : "var(--status-green)"}`,
            color: feedback.isError ? "var(--status-red)" : "var(--status-green)",
            fontSize: "0.875rem",
            fontFamily: "var(--font-data)",
          }}
        >
          {feedback.message}
        </div>
      )}

      {/* Primary Channel: Email Notification */}
      <form
        onSubmit={handleSaveEmail}
        style={{
          padding: "20px 24px",
          backgroundColor: "#161C20",
          border: "1px solid var(--border-hairline)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "0.8125rem",
                  fontFamily: "var(--font-data)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--text-primary)",
                  fontWeight: 600,
                }}
              >
                Emergency Dispatch Email
              </span>
              {subscription?.email ? (
                <span
                  style={{
                    fontSize: "0.6875rem",
                    padding: "2px 8px",
                    backgroundColor: "rgba(76, 175, 109, 0.15)",
                    color: "var(--status-green)",
                    border: "1px solid var(--status-green)",
                    borderRadius: "2px",
                  }}
                >
                  Armed & Saved
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "0.6875rem",
                    padding: "2px 8px",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-hairline)",
                    borderRadius: "2px",
                  }}
                >
                  Unconfigured
                </span>
              )}
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "4px", margin: "4px 0 0" }}>
              Private email address mapped to this smart contract in MongoDB. Never published on-chain.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="owner@example.com"
            disabled={isSaving}
            style={{
              flex: 1,
              padding: "10px 14px",
              backgroundColor: "#10151A",
              border: "1px solid var(--border-hairline)",
              color: "var(--text-primary)",
              fontSize: "0.875rem",
              fontFamily: "var(--font-data)",
              borderRadius: "4px",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={isSaving}
            style={{
              padding: "10px 20px",
              backgroundColor: "var(--accent-brass)",
              color: "#10151A",
              border: "none",
              fontSize: "0.8125rem",
              fontWeight: 700,
              fontFamily: "var(--font-data)",
              borderRadius: "4px",
              cursor: isSaving ? "not-allowed" : "pointer",
              transition: "opacity 0.2s ease",
            }}
          >
            {isSaving ? "Saving..." : subscription?.email ? "Update Email" : "Save & Arm Watchdog"}
          </button>
        </div>

        {subscription?.email && (
          <div
            style={{
              fontSize: "0.75rem",
              fontFamily: "var(--font-data)",
              color: "var(--text-secondary)",
              padding: "8px 12px",
              backgroundColor: "#10151A",
              border: "1px solid var(--border-hairline)",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Active Dispatch Target: <strong style={{ color: "#EDEAE3" }}>{subscription.email}</strong></span>
            <span>Storage: MongoDB Atlas</span>
          </div>
        )}
      </form>

      {/* Secondary Channel: Push Protocol (Web3) */}
      <div
        style={{
          padding: "20px 24px",
          backgroundColor: "#161C20",
          border: "1px solid var(--border-hairline)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontSize: "0.8125rem",
                fontFamily: "var(--font-data)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--text-primary)",
                fontWeight: 600,
              }}
            >
              Push Protocol (Web3 In-Wallet)
            </span>
            {pushEnabled ? (
              <span
                style={{
                  fontSize: "0.6875rem",
                  padding: "2px 8px",
                  backgroundColor: "rgba(76, 175, 109, 0.15)",
                  color: "var(--status-green)",
                  border: "1px solid var(--status-green)",
                  borderRadius: "2px",
                }}
              >
                Enabled
              </span>
            ) : (
              <span
                style={{
                  fontSize: "0.6875rem",
                  padding: "2px 8px",
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-hairline)",
                  borderRadius: "2px",
                }}
              >
                Optional
              </span>
            )}
          </div>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "4px", margin: "4px 0 0" }}>
            Also deliver alerts to your connected Ethereum address via Push Protocol mobile & browser apps.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
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
          }}
          style={{
            padding: "8px 16px",
            backgroundColor: pushEnabled ? "rgba(76, 175, 109, 0.15)" : "transparent",
            border: `1px solid ${pushEnabled ? "var(--status-green)" : "var(--border-hairline)"}`,
            color: pushEnabled ? "var(--status-green)" : "var(--text-primary)",
            fontSize: "0.8125rem",
            fontFamily: "var(--font-data)",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {pushEnabled ? "Enabled ✓" : "Enable Push"}
        </button>
      </div>

      {/* Configured Watchdog Rules */}
      <div
        style={{
          padding: "20px 24px",
          backgroundColor: "#161C20",
          border: "1px solid var(--border-hairline)",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Automated Watchdog Rules
        </span>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
          <div
            style={{
              padding: "12px 14px",
              backgroundColor: "#10151A",
              border: "1px solid var(--border-hairline)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <span style={{ fontSize: "0.8125rem", color: "var(--text-primary)", fontWeight: 600 }}>
              Pre-Amber Heartbeat Warnings
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              Dispatched 7 days, 3 days, and 24 hours prior to check-in interval expiration.
            </span>
          </div>

          <div
            style={{
              padding: "12px 14px",
              backgroundColor: "#10151A",
              border: "1px solid var(--border-hairline)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <span style={{ fontSize: "0.8125rem", color: "var(--text-primary)", fontWeight: 600 }}>
              Contestable Claim Challenge
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              Instant email notification when an heir initiates succession, with direct link to veto via World ID.
            </span>
          </div>
        </div>
      </div>

      {/* Recent Alert Activity Log */}
      {subscription?.recentAlerts && subscription.recentAlerts.length > 0 && (
        <div
          style={{
            padding: "20px 24px",
            backgroundColor: "#161C20",
            border: "1px solid var(--border-hairline)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Dispatched Alert History
          </span>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {subscription.recentAlerts.slice(0, 5).map((alert: AlertLogEntry) => (
              <div
                key={alert.id}
                style={{
                  padding: "10px 12px",
                  backgroundColor: "#10151A",
                  border: "1px solid var(--border-hairline)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-data)",
                }}
              >
                <div>
                  <span style={{ color: "var(--accent-brass)", fontWeight: 600, marginRight: "8px" }}>
                    [{alert.threshold.toUpperCase()}]
                  </span>
                  <span style={{ color: "var(--text-primary)" }}>{alert.title}</span>
                </div>
                <span style={{ color: "var(--text-secondary)" }}>
                  {new Date(alert.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
