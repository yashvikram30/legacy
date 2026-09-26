import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isAddress } from "viem";
import { readVaultOwner } from "@/lib/inheritance/chain";

export const dynamic = "force-dynamic";

const MAX_CIPHERTEXT_BYTES = 200 * 1024 * 1024; // 200MB — ciphertext is ~ plaintext size + a small tag

interface ClientPayload {
  vaultAddress: string;
  heirAddress: string;
  ownerAddress: string;
}

/**
 * Issues short-lived, scoped tokens so the browser can upload the encrypted
 * video directly to Vercel Blob (never through our server / Mongo). Only the
 * vault's on-chain owner may request one.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayloadRaw) => {
        let payload: ClientPayload;
        try {
          payload = JSON.parse(clientPayloadRaw || "{}");
        } catch {
          throw new Error("Missing or malformed client payload");
        }
        const { vaultAddress, heirAddress, ownerAddress } = payload;
        if (!vaultAddress || !isAddress(vaultAddress)) throw new Error("Invalid vaultAddress");
        if (!heirAddress || !isAddress(heirAddress)) throw new Error("Invalid heirAddress");
        if (!ownerAddress || !isAddress(ownerAddress)) throw new Error("Invalid ownerAddress");

        const onChainOwner = await readVaultOwner(vaultAddress as `0x${string}`);
        if (onChainOwner.toLowerCase() !== ownerAddress.toLowerCase()) {
          throw new Error("Only the vault owner can upload a sealed video.");
        }

        return {
          // The uploaded bytes are ciphertext produced client-side — this
          // content type is just a transport label, not the video's real type.
          allowedContentTypes: ["application/octet-stream"],
          maximumSizeInBytes: MAX_CIPHERTEXT_BYTES,
          addRandomSuffix: true,
          tokenPayload: clientPayloadRaw,
        };
      },
      // No onUploadCompleted: the client calls /api/inheritance/seal-video
      // itself right after the upload finishes, with a signature binding the
      // returned blob URL. We don't rely on Vercel's webhook callback (which
      // also can't reach a localhost dev server).
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload authorization failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
