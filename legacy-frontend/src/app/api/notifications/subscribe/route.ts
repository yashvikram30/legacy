import { NextResponse } from "next/server";
import { createPublicClient, http, isAddress } from "viem";
import { getSubscription, saveSubscription } from "@/lib/notifications/store";
import { dispatchVaultCreatedAlert, SEVEN_DAYS_SECONDS } from "@/lib/notifications/dispatcher";
import { worldChainSepolia } from "@/lib/constants";
import { LegacyVaultABI } from "@/lib/contracts/abis";
import { SubscribeRequest } from "@/types/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vault = searchParams.get("vault");

    if (!vault || !isAddress(vault)) {
      return NextResponse.json({ error: "Invalid vault address" }, { status: 400 });
    }

    const sub = await getSubscription(vault);
    return NextResponse.json({ subscription: sub });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to get subscription";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: SubscribeRequest = await request.json();

    if (!body.vaultAddress || !isAddress(body.vaultAddress)) {
      return NextResponse.json({ error: "Invalid vaultAddress parameter" }, { status: 400 });
    }

    if (!body.ownerAddress || !isAddress(body.ownerAddress)) {
      return NextResponse.json({ error: "Invalid ownerAddress parameter" }, { status: 400 });
    }

    // Validate email format if provided
    let cleanEmail: string | undefined = undefined;
    if (body.email && body.email.trim().length > 0) {
      const emailTrimmed = body.email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailTrimmed)) {
        return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
      }
      cleanEmail = emailTrimmed;
    }

    // Detect whether this request newly arms email dispatch for the vault, so the
    // short-window "vault created" alert is sent once rather than on every update.
    const existing = await getSubscription(body.vaultAddress);
    const isNewlyArmedEmail = Boolean(cleanEmail) && existing?.email !== cleanEmail;

    const updated = await saveSubscription({
      vaultAddress: body.vaultAddress as `0x${string}`,
      ownerAddress: body.ownerAddress as `0x${string}`,
      email: cleanEmail,
      pushEnabled: body.pushEnabled,
    });

    // If the owner just armed email on a vault configured with a short (<7d)
    // check-in cadence, welcome them and warn the window will get over soon.
    if (isNewlyArmedEmail) {
      try {
        const publicClient = createPublicClient({
          chain: worldChainSepolia,
          transport: http(
            process.env.NEXT_PUBLIC_WORLD_CHAIN_RPC_URL ||
              "https://worldchain-sepolia.gateway.tenderly.co"
          ),
        });
        const checkInIntervalRaw = await publicClient.readContract({
          address: body.vaultAddress as `0x${string}`,
          abi: LegacyVaultABI,
          functionName: "checkInInterval",
        });
        const checkInInterval = Number(checkInIntervalRaw);
        if (checkInInterval > 0 && checkInInterval < SEVEN_DAYS_SECONDS) {
          const host = request.headers.get("host") || "localhost:3000";
          const protocol = request.headers.get("x-forwarded-proto") || "http";
          const baseUrl = `${protocol}://${host}`;
          await dispatchVaultCreatedAlert(updated, checkInInterval, baseUrl);
        }
      } catch (err) {
        // A failure to read the contract or dispatch must not fail the subscription save.
        console.warn("[Subscribe] vault-created alert skipped:", err);
      }
    }

    return NextResponse.json({ success: true, subscription: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update subscription";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
