import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { getSubscription } from "@/lib/notifications/store";
import { dispatchTestAlert } from "@/lib/notifications/dispatcher";
import { SendTestAlertRequest } from "@/types/notifications";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body: SendTestAlertRequest = await request.json();

    if (!body.vaultAddress || !isAddress(body.vaultAddress)) {
      return NextResponse.json({ error: "Invalid vaultAddress parameter" }, { status: 400 });
    }

    const sub = await getSubscription(body.vaultAddress);
    if (!sub) {
      return NextResponse.json(
        {
          error: "No active notification subscription found for this vault. Please enter and save an email first.",
        },
        { status: 404 }
      );
    }

    if (!sub.email && !sub.pushEnabled) {
      return NextResponse.json(
        {
          error: "No alert channels connected. Please save an email address first.",
        },
        { status: 400 }
      );
    }

    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;

    const result = await dispatchTestAlert(sub, body.channel || "all", baseUrl);

    return NextResponse.json({
      success: result.success,
      channelsNotified: result.channelsNotified,
      error: result.error,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to send test alert";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
