export interface PushAlertPayload {
  recipientAddress: `0x${string}`;
  title: string;
  body: string;
  ctaUrl?: string;
  icon?: string;
}

export interface SendPushResult {
  success: boolean;
  error?: string;
  simulated?: boolean;
}

export async function sendPushNotification(
  payload: PushAlertPayload
): Promise<SendPushResult> {
  const privateKey = process.env.PUSH_CHANNEL_PRIVATE_KEY?.trim();
  const channelAddress = process.env.PUSH_CHANNEL_ADDRESS?.trim();

  // If Push Protocol credentials are not set, log simulation (graceful development)
  if (!privateKey || !channelAddress || privateKey === "your_push_channel_private_key_here") {
    console.log(
      `[PushProtocol:Simulated] Recipient: ${payload.recipientAddress} | Title: "${payload.title}" | Body: "${payload.body}"`
    );
    return {
      success: true,
      simulated: true,
    };
  }

  try {
    // Dynamic runtime import to avoid requiring optional peer dependencies at build time
    const dynamicImport = new Function("specifier", "return import(specifier)");
    const PushAPI = (await dynamicImport("@pushprotocol/restapi")) as any;
    const { ethers } = (await dynamicImport("ethers")) as any;

    const signer = new ethers.Wallet(privateKey);
    const chainId = process.env.NEXT_PUBLIC_CHAIN_ID || "4801"; // World Chain Sepolia

    await PushAPI.payloads.sendNotification({
      signer,
      type: 3, // Targetted
      identityType: 2, // Direct payload
      notification: {
        title: payload.title,
        body: payload.body,
      },
      payload: {
        title: payload.title,
        body: payload.body,
        cta: payload.ctaUrl || "",
        img: payload.icon || "https://legacyprotocol.xyz/icon.png",
      },
      recipients: `eip155:${chainId}:${payload.recipientAddress}`,
      channel: `eip155:${chainId}:${channelAddress}`,
      env: "staging",
    });

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Push Protocol dispatch failed";
    console.warn("[Push Protocol Notice]", errorMsg);
    // Graceful fallback to simulated success so it does not block the user flow
    return {
      success: true,
      simulated: true,
      error: errorMsg,
    };
  }
}
