import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { worldChainSepolia } from "@/lib/constants";
import { LegacyVaultABI } from "@/lib/contracts/abis";
import { getAllSubscriptions, updateLastAlert } from "@/lib/notifications/store";
import { dispatchHeartbeatAlert } from "@/lib/notifications/dispatcher";
import { AlertThreshold } from "@/types/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleHeartbeatCheck(request);
}

export async function POST(request: Request) {
  return handleHeartbeatCheck(request);
}

async function handleHeartbeatCheck(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET?.trim();
    if (cronSecret) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;

    const subscriptions = await getAllSubscriptions();
    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: "No active vault subscriptions to check.",
      });
    }

    const publicClient = createPublicClient({
      chain: worldChainSepolia,
      transport: http(
        process.env.NEXT_PUBLIC_WORLD_CHAIN_RPC_URL ||
          "https://worldchain-sepolia.gateway.tenderly.co"
      ),
    });

    const now = Math.floor(Date.now() / 1000);
    const results = [];
    let alertsDispatched = 0;

    for (const sub of subscriptions) {
      try {
        const [lastCheckInRaw, checkInIntervalRaw, statusRaw] = await Promise.all([
          publicClient.readContract({
            address: sub.vaultAddress,
            abi: LegacyVaultABI,
            functionName: "lastCheckIn",
          }),
          publicClient.readContract({
            address: sub.vaultAddress,
            abi: LegacyVaultABI,
            functionName: "checkInInterval",
          }),
          publicClient.readContract({
            address: sub.vaultAddress,
            abi: LegacyVaultABI,
            functionName: "getStatus",
          }),
        ]);

        const lastCheckIn = Number(lastCheckInRaw);
        const checkInInterval = Number(checkInIntervalRaw);
        const status = Number(statusRaw);

        const amberDeadline = lastCheckIn + checkInInterval;
        const secondsRemaining = amberDeadline - now;
        const lastCycle = sub.lastAlertSent?.cycleEpoch;
        const isNewCycle = lastCycle !== lastCheckIn;

        let neededThreshold: AlertThreshold | null = null;

        // Long interval (> 1 day)
        if (checkInInterval >= 86400) {
          if (status === 0 /* Green */ && secondsRemaining > 0) {
            if (secondsRemaining <= 86400) {
              if (isNewCycle || sub.lastAlertSent?.threshold !== "24h") {
                neededThreshold = "24h";
              }
            } else if (secondsRemaining <= 259200) {
              if (isNewCycle || !["24h", "3d"].includes(sub.lastAlertSent?.threshold || "")) {
                neededThreshold = "3d";
              }
            } else if (secondsRemaining <= 604800) {
              if (isNewCycle || !["24h", "3d", "7d"].includes(sub.lastAlertSent?.threshold || "")) {
                neededThreshold = "7d";
              }
            }
          } else if (status === 1 /* Amber */) {
            if (isNewCycle || sub.lastAlertSent?.threshold !== "amber") {
              neededThreshold = "amber";
            }
          }
        } else {
          // Rapid demo interval (< 1 day)
          if (status === 0 /* Green */ && secondsRemaining > 0) {
            const fraction = secondsRemaining / checkInInterval;
            if (fraction <= 0.3) {
              if (isNewCycle || sub.lastAlertSent?.threshold !== "24h") {
                neededThreshold = "24h";
              }
            }
          } else if (status === 1 /* Amber */) {
            if (isNewCycle || sub.lastAlertSent?.threshold !== "amber") {
              neededThreshold = "amber";
            }
          }
        }

        if (neededThreshold) {
          const dispatchRes = await dispatchHeartbeatAlert(
            sub,
            neededThreshold,
            secondsRemaining,
            baseUrl
          );

          if (dispatchRes.success) {
            await updateLastAlert(sub.vaultAddress, neededThreshold, lastCheckIn);
            alertsDispatched++;
          }

          results.push({
            vault: sub.vaultAddress,
            threshold: neededThreshold,
            secondsRemaining,
            notified: dispatchRes.channelsNotified,
          });
        } else {
          results.push({
            vault: sub.vaultAddress,
            status: status === 0 ? "Green" : status === 1 ? "Amber" : "Red",
            secondsRemaining,
            threshold: "none_needed",
          });
        }
      } catch (err) {
        console.error(`[Cron] Error evaluating vault ${sub.vaultAddress}:`, err);
        results.push({
          vault: sub.vaultAddress,
          error: err instanceof Error ? err.message : "Contract query failed",
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now,
      processed: subscriptions.length,
      alertsDispatched,
      results,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Cron execution failed";
    console.error("[Cron Handler Error]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
