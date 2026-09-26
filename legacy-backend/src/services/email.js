import nodemailer from "nodemailer";

function formatDuration(seconds) {
  if (seconds < 60) return `${Math.max(0, Math.floor(seconds))}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return `${d}d ${h}h`;
}

function generateEmailTemplate({
  headline,
  statusColor,
  statusBadge,
  vaultAddress,
  explanation,
  timeHighlight,
  ctaText,
  ctaUrl,
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #10151A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #EDEAE3;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #10151A; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #1C2226; border: 1px solid #2E353A; border-radius: 4px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; border-bottom: 1px solid #2E353A; background-color: #141A1E;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 16px; font-weight: 700; letter-spacing: 0.1em; color: #EDEAE3; text-transform: uppercase;">
                      LEGACY PROTOCOL
                    </span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 10px; font-size: 11px; font-family: monospace; font-weight: 700; text-transform: uppercase; border-radius: 2px; color: ${statusColor}; background-color: rgba(255, 255, 255, 0.05); border: 1px solid ${statusColor};">
                      ${statusBadge}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 600; color: #EDEAE3; line-height: 1.3;">
                ${headline}
              </h1>

              <div style="background-color: #10151A; border: 1px solid #2E353A; padding: 12px 16px; margin-bottom: 24px; font-family: monospace; font-size: 13px; color: #9A9E98; word-break: break-all;">
                Vault: <strong style="color: #EDEAE3;">${vaultAddress}</strong>
              </div>

              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #EDEAE3;">
                ${explanation}
              </p>

              <!-- Highlight Readout Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px; background-color: #10151A; border: 1px solid #2E353A; border-left: 3px solid ${statusColor};">
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9A9E98; margin-bottom: 4px;">
                      Time Window Remaining
                    </div>
                    <div style="font-size: 24px; font-weight: 700; font-family: monospace; color: ${statusColor};">
                      ${timeHighlight}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Call to Action Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}" target="_blank" style="display: inline-block; width: 100%; text-align: center; box-sizing: border-box; background-color: #B8894A; color: #10151A; padding: 14px 24px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 4px; letter-spacing: 0.02em;">
                      ${ctaText} →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #2E353A; background-color: #141A1E; font-size: 12px; color: #9A9E98; line-height: 1.5;">
              This is an autonomous on-chain alert dispatched by Legacy Protocol Succession Engine.<br>
              Recipient designated as owner of vault <code>${vaultAddress}</code>.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function createTransporter() {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  const service = process.env.SMTP_SERVICE || (user && user.includes("gmail.com") ? "gmail" : undefined);

  if (service) {
    return nodemailer.createTransport({
      service,
      auth: { user, pass },
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

const transporter = createTransporter();

export async function sendEmail({ to, subject, html, text }) {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  const fromEmail =
    process.env.EMAIL_FROM || process.env.SMTP_FROM || `Legacy Protocol <${user || "alerts@legacyprotocol.xyz"}>`;

  if (!user || !pass) {
    console.log(
      `[Email Simulation - Configure EMAIL_USER and EMAIL_PASS in .env] To: ${to} | Subject: ${subject}`
    );
    return { success: true, simulated: true };
  }

  try {
    const mailOptions = {
      from: fromEmail,
      to,
      subject,
      html,
      text: text || subject,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [Email Sent] Message ID: ${info.messageId} to ${to}`);
    return { success: true, messageId: info.messageId, info };
  } catch (err) {
    console.error("[Nodemailer Error]", err);
    return { success: false, error: err.message };
  }
}

// ── 1. Milestone: 6-month heartbeat expiring ─────────────────────────────────
export async function sendHeartbeatExpiringEmail({ to, vaultAddress, secondsRemaining, baseUrl }) {
  const formatted = formatDuration(secondsRemaining);
  const targetBase = baseUrl || process.env.APP_BASE_URL || "https://legacy-drab-two.vercel.app";
  const vaultUrl = `${targetBase}/vault?v=${vaultAddress}`;
  const subject = `[Legacy Vault] Proof-of-Liveness Check-In Due in ${formatted}`;

  const html = generateEmailTemplate({
    headline: `Proof-of-Liveness Check-In Due in ${formatted}`,
    statusColor: "#D99A3D",
    statusBadge: "Check-In Due",
    vaultAddress,
    explanation: `Your vault cadence requires a proof-of-liveness check-in within <strong>${formatted}</strong>. If no check-in occurs, the vault will transition into the Amber grace period.`,
    timeHighlight: `${formatted} remaining`,
    ctaText: "Check In with World ID",
    ctaUrl: vaultUrl,
  });

  return sendEmail({ to, subject, html });
}

// ── 2. Milestone: 7-day claim period started ──────────────────────────────────
export async function sendClaimStartedEmail({ to, vaultAddress, heirAddress, contestableSeconds, baseUrl }) {
  const windowTime = formatDuration(contestableSeconds);
  const targetBase = baseUrl || process.env.APP_BASE_URL || "https://legacy-drab-two.vercel.app";
  const vaultUrl = `${targetBase}/vault?v=${vaultAddress}`;
  const subject = `[URGENT] Contestable Succession Claim Initiated on Your Vault`;

  const html = generateEmailTemplate({
    headline: "Contestable Succession Claim Initiated",
    statusColor: "#C1503F",
    statusBadge: "Claim Initiated",
    vaultAddress,
    explanation: `Heir <code>${heirAddress}</code> has initiated succession on your Legacy Vault. The <strong>${windowTime}</strong> contestable challenge window is now running.<br><br><strong>Owner Veto Right:</strong> If you are alive, you can invalidate and abort this claim immediately by checking in.`,
    timeHighlight: `${windowTime} to Veto`,
    ctaText: "Veto Claim & Check In Now",
    ctaUrl: vaultUrl,
  });

  return sendEmail({ to, subject, html });
}

// ── 3. Milestone: 7-day claim period about to end (<24h) ─────────────────────
export async function sendClaimExpiringEmail({ to, vaultAddress, heirAddress, secondsRemaining, baseUrl }) {
  const formatted = formatDuration(secondsRemaining);
  const targetBase = baseUrl || process.env.APP_BASE_URL || "https://legacy-drab-two.vercel.app";
  const vaultUrl = `${targetBase}/vault?v=${vaultAddress}`;
  const subject = `[URGENT] Final ${formatted} to Veto Succession Claim`;

  const html = generateEmailTemplate({
    headline: "Final Hours to Veto Succession Claim",
    statusColor: "#C1503F",
    statusBadge: "Veto Window Closing",
    vaultAddress,
    explanation: `The contestable challenge window for the claim initiated by heir <code>${heirAddress}</code> will close in <strong>${formatted}</strong>.<br><br><strong>Action required:</strong> If you do not perform a World ID check-in before this window expires, the heir will be empowered to finalize and transfer control.`,
    timeHighlight: `${formatted} to Veto`,
    ctaText: "Veto Claim & Check In Now",
    ctaUrl: vaultUrl,
  });

  return sendEmail({ to, subject, html });
}

// ── 4. Milestone: 7-day claim period ended ───────────────────────────────────
export async function sendClaimExpiredEmail({ to, vaultAddress, heirAddress, baseUrl }) {
  const targetBase = baseUrl || process.env.APP_BASE_URL || "https://legacy-drab-two.vercel.app";
  const vaultUrl = `${targetBase}/vault?v=${vaultAddress}`;
  const subject = `[NOTICE] Contestable Challenge Window Has Closed`;

  const html = generateEmailTemplate({
    headline: "Contestable Challenge Window Closed",
    statusColor: "#C1503F",
    statusBadge: "Claim Eligible",
    vaultAddress,
    explanation: `The contestable challenge window has expired without an owner veto. Heir <code>${heirAddress}</code> is now eligible to finalize and claim the allocated assets.`,
    timeHighlight: "Window Elapsed",
    ctaText: "View Vault Dashboard",
    ctaUrl: vaultUrl,
  });

  return sendEmail({ to, subject, html });
}
