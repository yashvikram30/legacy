"use client";

import React, { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { parseAbiItem, type PublicClient } from "viem";
import { VaultStatus, explorerAddressUrl, explorerTxUrl, CHAIN_NAME } from "@/lib/constants";

// Public Monad RPCs cap eth_getLogs at a 100-block range, so recent history is
// read in 100-block windows; the explorer link has everything older.
const LOG_WINDOW = 100n;
const RECENT_WINDOWS = 30; // ~3,000 blocks, about 20 minutes at Monad's 400ms blocks
const WINDOWS_IN_FLIGHT = 5; // stay well inside public RPC rate limits

const activityEvents = [
  parseAbiItem("event CheckedIn(uint256 timestamp)"),
  parseAbiItem("event HeirAdded(address indexed heir)"),
  parseAbiItem("event ParametersUpdated(uint256 checkInInterval, uint256 gracePeriod, uint256 contestableWindow)"),
] as const;

async function fetchRecentVaultLogs(client: PublicClient, vault: `0x${string}`) {
  const latest = await client.getBlockNumber();
  const windows: [bigint, bigint][] = [];
  for (let i = 0; i < RECENT_WINDOWS; i++) {
    const toBlock = latest - BigInt(i) * LOG_WINDOW;
    if (toBlock < 0n) break;
    const fromBlock = toBlock >= LOG_WINDOW - 1n ? toBlock - (LOG_WINDOW - 1n) : 0n;
    windows.push([fromBlock, toBlock]);
  }

  const logs = [];
  for (let i = 0; i < windows.length; i += WINDOWS_IN_FLIGHT) {
    const batch = await Promise.all(
      windows.slice(i, i + WINDOWS_IN_FLIGHT).map(([fromBlock, toBlock]) =>
        client.getLogs({ address: vault, events: activityEvents, fromBlock, toBlock }).catch(() => [])
      )
    );
    logs.push(...batch.flat());
  }
  return logs;
}

interface ActivityItem {
  id: string;
  type: "CHECK_IN" | "REGISTER" | "PARAMETER_UPDATE" | "HEIR_CHANGE" | "CLAIM" | "INITIALIZED";
  title: string;
  description: string;
  timestamp: number;
  blockNumber?: bigint;
  transactionHash?: `0x${string}`;
  badgeColor: string;
}

interface ActivityLogProps {
  vaultAddress: `0x${string}`;
  lastCheckIn: bigint;
  livenessRegistered: boolean;
  vaultStatus: VaultStatus;
}

export function ActivityLog({
  vaultAddress,
  lastCheckIn,
  livenessRegistered,
}: ActivityLogProps) {
  const publicClient = usePublicClient();
  const [logs, setLogs] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchActivity() {
      if (!publicClient || !vaultAddress) return;
      setIsLoading(true);

      const items: ActivityItem[] = [];

      try {
        for (const l of await fetchRecentVaultLogs(publicClient, vaultAddress)) {
          if (l.eventName === "CheckedIn") {
            items.push({
              id: `checkin-${l.transactionHash}-${l.logIndex}`,
              type: "CHECK_IN",
              title: "LIVENESS HEARTBEAT VERIFIED",
              description: `Passkey check-in verified on-chain on ${CHAIN_NAME}.`,
              timestamp: Number(l.args.timestamp ?? BigInt(Math.floor(Date.now() / 1000))),
              blockNumber: l.blockNumber,
              transactionHash: l.transactionHash,
              badgeColor: "var(--status-green)",
            });
          } else if (l.eventName === "HeirAdded") {
            items.push({
              id: `heir-add-${l.transactionHash}-${l.logIndex}`,
              type: "HEIR_CHANGE",
              title: "HEIR ADDED",
              description: `Heir address ${l.args.heir?.slice(0, 8)}…${l.args.heir?.slice(-6)} authorized for succession claims.`,
              timestamp: Math.floor(Date.now() / 1000),
              blockNumber: l.blockNumber,
              transactionHash: l.transactionHash,
              badgeColor: "var(--accent-brass)",
            });
          } else if (l.eventName === "ParametersUpdated") {
            items.push({
              id: `param-${l.transactionHash}-${l.logIndex}`,
              type: "PARAMETER_UPDATE",
              title: "TIMELOCK PARAMETERS UPDATED",
              description: `Cadence configured to ${Math.round(Number(l.args.checkInInterval || 0n) / 86400)}d cadence / ${Math.round(Number(l.args.gracePeriod || 0n) / 86400)}d grace.`,
              timestamp: Math.floor(Date.now() / 1000),
              blockNumber: l.blockNumber,
              transactionHash: l.transactionHash,
              badgeColor: "var(--accent-brass)",
            });
          }
        }
      } catch {
        // Logs are best-effort history; the explorer link always has the full record.
      }

      // If registered, synthesize initial registration proof if no getLogs returned it
      if (livenessRegistered && items.filter((i) => i.type === "CHECK_IN").length === 0) {
        items.push({
          id: `initial-registration-${vaultAddress}`,
          type: "REGISTER",
          title: "PASSKEY LINKED TO VAULT",
          description: `Passkey verified and linked to this vault on ${CHAIN_NAME}.`,
          timestamp: lastCheckIn > 0n ? Number(lastCheckIn) : Math.floor(Date.now() / 1000),
          badgeColor: "var(--status-green)",
        });
      }

      // Add baseline vault instantiation
      items.push({
        id: `vault-init-${vaultAddress}`,
        type: "INITIALIZED",
        title: "SUCCESSION VAULT INSTANTIATED",
        description: `Succession vault deployed and ownership assigned.`,
        timestamp: lastCheckIn > 0n ? Number(lastCheckIn) : Math.floor(Date.now() / 1000),
        badgeColor: "var(--text-secondary)",
      });

      // Sort descending by timestamp
      items.sort((a, b) => b.timestamp - a.timestamp);

      if (isMounted) {
        setLogs(items);
        setIsLoading(false);
      }
    }

    fetchActivity();
    return () => {
      isMounted = false;
    };
  }, [publicClient, vaultAddress, lastCheckIn, livenessRegistered]);

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "Recent";
    const d = new Date(timestamp * 1000);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h3
            style={{
              fontFamily: "'Murs Gothic', var(--font-murs-gothic), sans-serif",
              fontSize: "1.375rem",
              fontWeight: 900,
              letterSpacing: "0.06em",
              color: "#ffffff",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            Activity & Proof History
          </h3>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "4px", lineHeight: 1.5 }}>
            Recent on-chain activity: passkey check-ins, heirs and parameter changes. Full history is on the explorer.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <a
            href={`${explorerAddressUrl(vaultAddress)}#events`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ padding: "8px 14px", fontSize: "0.75rem", borderRadius: 0, fontFamily: "var(--font-data)" }}
          >
            EXPLORER EVENTS ↗
          </a>
        </div>
      </div>

      {/* Activity Timeline List */}
      {isLoading ? (
        <div style={{ padding: "48px 32px", textAlign: "center", backgroundColor: "rgba(255, 255, 255, 0.01)" }}>
          <span className="font-data" style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Querying {CHAIN_NAME} logs…
          </span>
        </div>
      ) : logs.length === 0 ? (
        <div
          style={{
            padding: "32px 24px",
            border: "1px dashed rgba(255, 255, 255, 0.12)",
            backgroundColor: "rgba(255, 255, 255, 0.01)",
            borderRadius: 0,
          }}
        >
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
            No on-chain activity has been detected for this vault address yet.
          </p>
        </div>
      ) : (
        <div
          style={{
            border: "1px solid rgba(255, 255, 255, 0.12)",
            backgroundColor: "#000000",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {logs.map((item, index) => (
            <div
              key={item.id}
              style={{
                padding: "20px 24px",
                borderBottom: index !== logs.length - 1 ? "1px solid rgba(255, 255, 255, 0.08)" : "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: "16px",
                transition: "background-color 0.15s ease",
              }}
            >
              {/* Event Content */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "680px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: "0.6875rem",
                      fontFamily: "var(--font-data)",
                      color: item.badgeColor,
                      border: `1px solid ${item.badgeColor}`,
                      padding: "2px 8px",
                      borderRadius: 0,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    ● {item.title}
                  </span>

                  <span className="font-data" style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    {formatDate(item.timestamp)}
                  </span>
                </div>

                <p style={{ fontSize: "0.8125rem", color: "rgba(255, 255, 255, 0.8)", margin: 0, lineHeight: 1.5 }}>
                  {item.description}
                </p>
              </div>

              {/* Technical Hash & Block Info */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                {item.blockNumber && (
                  <span className="font-data" style={{ fontSize: "0.6875rem", color: "var(--text-secondary)" }}>
                    BLOCK #{item.blockNumber.toString()}
                  </span>
                )}
                {item.transactionHash && (
                  <a
                    href={explorerTxUrl(item.transactionHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-data"
                    style={{
                      fontSize: "0.6875rem",
                      color: "var(--accent-brass)",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    <span>TX: {item.transactionHash.slice(0, 8)}…{item.transactionHash.slice(-6)}</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
