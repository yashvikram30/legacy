import { NextResponse } from "next/server";
import type { IDKitResult } from "@worldcoin/idkit";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const { rp_id, idkitResponse } = (await request.json()) as {
      rp_id?: string;
      idkitResponse: IDKitResult;
    };

    const targetRpId =
      rp_id ||
      process.env.NEXT_PUBLIC_WORLD_ID_RP_ID ||
      process.env.rp_id;

    if (!targetRpId) {
      return NextResponse.json(
        { error: "rp_id is not specified in the request or environment variables." },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://developer.world.org/api/v4/verify/${targetRpId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(idkitResponse),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        {
          error: "Developer Portal verification failed",
          details: errorData,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, ...data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Verification request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
