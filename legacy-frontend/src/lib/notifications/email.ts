import nodemailer from "nodemailer";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function getTransporter() {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  const service =
    process.env.SMTP_SERVICE || (user.includes("gmail.com") ? "gmail" : undefined);

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

export async function sendEmailNotification({
  to,
  subject,
  html,
  text,
}: SendEmailOptions): Promise<SendEmailResult> {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

  // 1. Prioritize Nodemailer if SMTP / Gmail credentials are present
  if (user && pass) {
    try {
      const transporter = getTransporter();
      if (!transporter) {
        throw new Error("Failed to initialize Nodemailer transporter");
      }

      const fromEmail =
        process.env.EMAIL_FROM ||
        process.env.SMTP_FROM ||
        `Legacy Protocol <${user}>`;

      const info = await transporter.sendMail({
        from: fromEmail,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>?/gm, ""),
      });

      console.log(`[Email] Successfully sent email to ${to}: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Unknown error in Nodemailer dispatch";
      console.error("[Nodemailer Error]", errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  // 2. Fallback to Resend API if RESEND_API_KEY is configured
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || "Legacy Protocol <alerts@legacyprotocol.xyz>";

  if (!apiKey || apiKey === "your_resend_api_key_here") {
    return {
      success: false,
      error: "Neither Nodemailer credentials (EMAIL_USER/EMAIL_PASS) nor RESEND_API_KEY are configured.",
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html,
        text,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[Resend API Error]", data);
      return {
        success: false,
        error: data?.message || `HTTP ${res.status}`,
      };
    }

    return {
      success: true,
      messageId: data.id,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Unknown error in email dispatch";
    console.error("[Email Network Error]", errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
