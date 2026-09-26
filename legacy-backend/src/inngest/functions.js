import {
  sendHeartbeatExpiringEmail,
  sendClaimStartedEmail,
  sendClaimExpiringEmail,
  sendClaimExpiredEmail,
} from "../services/email.js";
import { inngest } from "./client.js";
import { readVaultState, readActiveClaims } from "../services/chain.js";
import { getSubscriptionByVault, getAllActiveSubscriptions } from "../services/db.js";

/**
 * 1. Milestone 1: Heartbeat Cadence (6 Months About to End)
 * Event: "vault/heartbeat.monitored"
 * Data: { vaultAddress, ownerEmail }
 */
export const heartbeatCadenceWorkflow = inngest.createFunction(
  {
    id: "heartbeat-cadence-workflow",
    name: "Vault Heartbeat Cadence Monitor",
    triggers: [{ event: "vault/heartbeat.monitored" }],
    cancelOn: [
      {
        event: "vault/checked-in",
        match: "data.vaultAddress",
      },
    ],
  },
  async ({ event, step }) => {
    const { vaultAddress, ownerEmail } = event.data;

    // Step 1: Read contract state
    const vault = await step.run("read-vault-state", async () => {
      return readVaultState(vaultAddress);
    });

    const amberDeadline = vault.lastCheckIn + vault.checkInInterval;
    const now = Math.floor(Date.now() / 1000);

    // If interval >= 1 day, schedule staged 7d and 24h reminders
    if (vault.checkInInterval >= 86400) {
      const sevenDaysBefore = amberDeadline - 7 * 86400;
      if (sevenDaysBefore > now) {
        // await step.sleepUntil("wait-until-7d-before-deadline", new Date(sevenDaysBefore * 1000));
        await step.run("send-7d-warning", async () => {
          const fresh = await readVaultState(vaultAddress);
          if (fresh.status === 0 && fresh.lastCheckIn === vault.lastCheckIn) {
            const secLeft = amberDeadline - Math.floor(Date.now() / 1000);
            await sendHeartbeatExpiringEmail({
              to: ownerEmail,
              vaultAddress,
              secondsRemaining: secLeft,
            });
          }
        });
      }

      const oneDayBefore = amberDeadline - 86400;
      if (oneDayBefore > now) {
        // await step.sleepUntil("wait-until-24h-before-deadline", new Date(oneDayBefore * 1000));
        await step.run("send-24h-warning", async () => {
          const fresh = await readVaultState(vaultAddress);
          if (fresh.status === 0 && fresh.lastCheckIn === vault.lastCheckIn) {
            const secLeft = amberDeadline - Math.floor(Date.now() / 1000);
            await sendHeartbeatExpiringEmail({
              to: ownerEmail,
              vaultAddress,
              secondsRemaining: secLeft,
            });
          }
        });
      }
    } else {
      // Rapid demo interval (< 1 day)
      const warningTime = amberDeadline - Math.floor(vault.checkInInterval * 0.3);
      if (warningTime > now) {
        // await step.sleepUntil("wait-until-demo-warning", new Date(warningTime * 1000));
        await step.run("send-demo-warning", async () => {
          const fresh = await readVaultState(vaultAddress);
          if (fresh.status === 0 && fresh.lastCheckIn === vault.lastCheckIn) {
            const secLeft = amberDeadline - Math.floor(Date.now() / 1000);
            await sendHeartbeatExpiringEmail({
              to: ownerEmail,
              vaultAddress,
              secondsRemaining: secLeft,
            });
          }
        });
      }
    }

    return { completed: true, vaultAddress };
  }
);

/**
 * 2. Milestones 2, 3, & 4: Contestable Claim Lifecycle (7 Days)
 * Event: "vault/claim.initiated"
 * Data: { vaultAddress, heirAddress, ownerEmail, contestableSeconds }
 */
export const contestableClaimWorkflow = inngest.createFunction(
  {
    id: "contestable-claim-workflow",
    name: "Contestable Claim 7-Day Lifecycle",
    triggers: [{ event: "vault/claim.initiated" }],
    cancelOn: [
      {
        event: "vault/claim.vetoed",
        match: "data.vaultAddress",
      },
    ],
  },
  async ({ event, step }) => {
    const { vaultAddress, heirAddress, ownerEmail, contestableSeconds = 604800 } = event.data;

    // ── Milestone 2: Send "7-day period started" alert immediately ───────────
    await step.run("send-claim-started-alert", async () => {
      await sendClaimStartedEmail({
        to: ownerEmail,
        vaultAddress,
        heirAddress,
        contestableSeconds,
      });
    });

    const now = Math.floor(Date.now() / 1000);
    const expiryTime = now + contestableSeconds;

    // ── Milestone 3: Wait until ~24h before expiry (<24h left to veto) ──────
    let expiringWarningTime;
    if (contestableSeconds >= 86400) {
      // 24 hours before 7-day period ends
      expiringWarningTime = expiryTime - 86400;
    } else {
      // Rapid demo: 30% time remaining
      expiringWarningTime = expiryTime - Math.floor(contestableSeconds * 0.3);
    }

    if (expiringWarningTime > Math.floor(Date.now() / 1000)) {
      await step.sleepUntil("wait-until-claim-expiring", new Date(expiringWarningTime * 1000));

      await step.run("send-claim-expiring-alert", async () => {
        const fresh = await readVaultState(vaultAddress);
        // If owner checked in, claim is vetoed
        if (fresh.lastCheckIn >= now) {
          console.log(`[Claim Inngest] Claim vetoed by owner check-in for vault ${vaultAddress}`);
          return { vetoed: true };
        }

        const secLeft = Math.max(0, expiryTime - Math.floor(Date.now() / 1000));
        await sendClaimExpiringEmail({
          to: ownerEmail,
          vaultAddress,
          heirAddress,
          secondsRemaining: secLeft,
        });
        return { alerted: true };
      });
    }

    // ── Milestone 4: Wait until 7-day period ends ────────────────────────────
    if (expiryTime > Math.floor(Date.now() / 1000)) {
      await step.sleepUntil("wait-until-claim-expired", new Date(expiryTime * 1000));
    }

    await step.run("send-claim-expired-alert", async () => {
      const fresh = await readVaultState(vaultAddress);
      if (fresh.lastCheckIn >= now) {
        console.log(`[Claim Inngest] Claim vetoed by owner check-in for vault ${vaultAddress}`);
        return { vetoed: true };
      }

      await sendClaimExpiredEmail({
        to: ownerEmail,
        vaultAddress,
        heirAddress,
      });
      return { finalized: true };
    });

    return { completed: true, vaultAddress, heirAddress };
  }
);

