import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { getInheritance } from "@/lib/inheritance/store";
import { readVaultIsInSuccession } from "@/lib/inheritance/chain";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vault = searchParams.get("vault");
    const heir = searchParams.get("heir");

    if (!vault || !isAddress(vault)) {
      return NextResponse.json({ error: "Invalid vault address" }, { status: 400 });
    }
    if (!heir || !isAddress(heir)) {
      return NextResponse.json({ error: "Invalid heir address" }, { status: 400 });
    }

    const record = await getInheritance(vault, heir);

    if (!record) {
      return NextResponse.json({
        enrolled: false,
        heirPublicKey: null,
        hasSealed: false,
        canReveal: false,
        bundle: null,
      });
    }

    const hasSealed = Boolean(record.sealedBundle);

    // The sealed ciphertext is only released once the vault has entered
    // succession (Red). It is encrypted regardless, but this enforces the
    // "only after succession" reveal rule server-side, not just in the UI.
    let canReveal = false;
    if (hasSealed) {
      try {
        canReveal = await readVaultIsInSuccession(vault as `0x${string}`);
      } catch (err) {
        console.warn("[Inheritance] succession status check failed:", err);
        canReveal = false;
      }
    }

    return NextResponse.json({
      enrolled: Boolean(record.heirPublicKey),
      heirPublicKey: record.heirPublicKey || null,
      hasSealed,
      sealedAt: record.sealedAt ?? null,
      canReveal,
      bundle: canReveal ? record.sealedBundle : null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load inheritance record";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
