import { NextResponse } from "next/server";
import { signRequest } from "@worldcoin/idkit-core/signing";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    let action = process.env.NEXT_PUBLIC_WORLD_ID_ACTION || "heartbeat";
    try {
      const body = await request.json();
      if (body?.action) {
        action = body.action;
      }
    } catch {
      // Empty or invalid body, use default action
    }

    const signingKey = process.env.RP_SIGNING_KEY?.trim();
    if (!signingKey) {
      return NextResponse.json(
        { error: "RP_SIGNING_KEY is not defined in environment variables (.env.local)." },
        { status: 500 }
      );
    }

    const cleanHex = signingKey.startsWith("0x") ? signingKey.slice(2) : signingKey;
    if (cleanHex.length !== 64) {
      return NextResponse.json(
        {
          error: `Invalid RP_SIGNING_KEY length: received ${cleanHex.length} hex characters (${cleanHex.length / 2} bytes), expected 64 hex characters (32 bytes).`,
        },
        { status: 500 }
      );
    }

    const appId = process.env.NEXT_PUBLIC_WORLD_ID_APP_ID || process.env.app_id;
    const rpId = process.env.NEXT_PUBLIC_WORLD_ID_RP_ID || process.env.rp_id;

    if (!appId || !rpId) {
      return NextResponse.json(
        { error: "World ID app_id or rp_id is not defined in environment variables." },
        { status: 500 }
      );
    }

    console.log(`[API /api/rp-signature] Signing RP request for action "${action}", appId: "${appId}", rpId: "${rpId}"`);

    const { sig, nonce, createdAt, expiresAt } = signRequest({
      signingKeyHex: signingKey,
      action,
      ttl: 600,
    });

    console.log(`[API /api/rp-signature] Successfully generated signature (nonce: ${nonce}, expiresAt: ${expiresAt})`);

    return NextResponse.json({
      sig,
      nonce,
      created_at: createdAt,
      expires_at: expiresAt,
      app_id: appId,
      rp_id: rpId,
    });
  } catch (err: unknown) {
    console.error("[API /api/rp-signature] Error signing request:", err);
    const message = err instanceof Error ? err.message : "Failed to sign RP request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
