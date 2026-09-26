import { NextResponse } from "next/server";
import { isAddress, createPublicClient, http } from "viem";
import { worldChainSepolia } from "@/lib/constants";
import { LegacyVaultABI } from "@/lib/contracts/abis";
import { getSubscription } from "@/lib/notifications/store";
import { dispatchClaimAlert } from "@/lib/notifications/dispatcher";
import { ClaimAlertRequest } from "@/types/notifications";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body: ClaimAlertRequest = await request.json();

    if (!body.vaultAddress || !isAddress(body.vaultAddress)) {
      return NextResponse.json({ error: "Invalid vaultAddress parameter" }, { status: 400 });
    }

    if (!body.heirAddress || !isAddress(body.heirAddress)) {
      return NextResponse.json({ error: "Invalid heirAddress parameter" }, { status: 400 });
    }

    const sub = await getSubscription(body.vaultAddress);
    if (!sub) {
      console.log(`[Claim Alert] No subscription found for vault ${body.vaultAddress}`);
      return NextResponse.json({ ok: true, notice: "No subscription registered for this vault" });
    }

    // Read contestableWindow from on-chain contract
    let contestableSeconds = 604800; // default 7 days fallback
    try {
      const publicClient = createPublicClient({
        chain: worldChainSepolia,
        transport: http(
          process.env.NEXT_PUBLIC_WORLD_CHAIN_RPC_URL ||
            "https://worldchain-sepolia.gateway.tenderly.co"
        ),
      });

      const windowRaw = await publicClient.readContract({
        address: body.vaultAddress,
        abi: LegacyVaultABI,
        functionName: "contestableWindow",
      });
      contestableSeconds = Number(windowRaw);
    } catch (readErr) {
      console.warn("[Claim Alert] Unable to read contestableWindow on-chain, using fallback:", readErr);
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://legacy-drab-two.vercel.app";

    const res = await dispatchClaimAlert(
      sub,
      body.heirAddress,
      contestableSeconds,
      body.txHash,
      baseUrl
    );

    return NextResponse.json({
      success: res.success,
      channelsNotified: res.channelsNotified,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to dispatch claim alert";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
