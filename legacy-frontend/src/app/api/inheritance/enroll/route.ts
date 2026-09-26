import { NextResponse } from "next/server";
import { isAddress, recoverMessageAddress } from "viem";
import { buildDeriveMessage, publicKeyFromSignature } from "@/lib/inheritance/crypto";
import { saveEnrollment } from "@/lib/inheritance/store";
import { readIsHeir } from "@/lib/inheritance/chain";

export const dynamic = "force-dynamic";

interface EnrollRequest {
  vaultAddress: `0x${string}`;
  heirAddress: `0x${string}`;
  signature: `0x${string}`;
}

export async function POST(request: Request) {
  try {
    const body: EnrollRequest = await request.json();

    if (!body.vaultAddress || !isAddress(body.vaultAddress)) {
      return NextResponse.json({ error: "Invalid vaultAddress" }, { status: 400 });
    }
    if (!body.heirAddress || !isAddress(body.heirAddress)) {
      return NextResponse.json({ error: "Invalid heirAddress" }, { status: 400 });
    }
    if (!body.signature || !body.signature.startsWith("0x")) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // The signature must be over the canonical derive-message for this exact
    // (vault, heir) pair, and must recover to the claimed heir address. This
    // prevents anyone from publishing a public key on behalf of the heir.
    const message = buildDeriveMessage(body.vaultAddress, body.heirAddress);
    let recovered: `0x${string}`;
    try {
      recovered = await recoverMessageAddress({ message, signature: body.signature });
    } catch {
      return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
    }

    if (recovered.toLowerCase() !== body.heirAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "Signature does not match the provided heir address." },
        { status: 401 }
      );
    }

    // Only genuine on-chain heirs may enroll for a vault.
    try {
      const isHeir = await readIsHeir(body.vaultAddress, body.heirAddress);
      if (!isHeir) {
        return NextResponse.json(
          { error: "This address is not a registered heir of the vault." },
          { status: 403 }
        );
      }
    } catch (err) {
      console.warn("[Inheritance/enroll] isHeir check failed:", err);
      return NextResponse.json({ error: "Unable to verify heir status on-chain." }, { status: 502 });
    }

    // The stored public key is derived server-side from the same signature, so
    // it always corresponds to the key the heir will re-derive when unsealing.
    const heirPublicKey = publicKeyFromSignature(body.signature);
    const record = await saveEnrollment(body.vaultAddress, body.heirAddress, heirPublicKey);

    return NextResponse.json({ success: true, heirPublicKey: record.heirPublicKey });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Enrollment failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
