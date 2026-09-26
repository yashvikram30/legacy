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

export async function sendEmailNotification({
  to,
  subject,
  html,
  text,
}: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL || "Legacy Protocol <alerts@legacyprotocol.xyz>";

  if (!apiKey || apiKey === "your_resend_api_key_here") {
    return {
      success: false,
      error: "RESEND_API_KEY is not configured in the environment.",
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
    const errorMsg = err instanceof Error ? err.message : "Unknown error in email dispatch";
    console.error("[Email Network Error]", errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
