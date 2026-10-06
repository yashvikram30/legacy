import { NextResponse } from "next/server";
import { isAddress } from "viem";
import {
  getVaultMeta,
  getVaultMetasByOwner,
  setVaultNames,
  setHeirName,
  removeHeirName,
} from "@/lib/vault-meta/store";

export const dynamic = "force-dynamic";

const MAX_NAME_LENGTH = 60;

function cleanName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_NAME_LENGTH) return null;
  return trimmed;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vault = searchParams.get("vault");
    const owner = searchParams.get("owner");

    if (vault) {
      if (!isAddress(vault)) {
        return NextResponse.json({ error: "Invalid vault address" }, { status: 400 });
      }
      const meta = await getVaultMeta(vault);
      return NextResponse.json({ meta });
    }

    if (owner) {
      if (!isAddress(owner)) {
        return NextResponse.json({ error: "Invalid owner address" }, { status: 400 });
      }
      const metas = await getVaultMetasByOwner(owner);
      return NextResponse.json({ metas });
    }

    return NextResponse.json({ error: "Provide a vault or owner query parameter" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to read vault metadata";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

interface VaultMetaPostBody {
  vaultAddress?: string;
  ownerAddress?: string;
  vaultName?: string;
  ownerName?: string;
  heir?: { address?: string; name?: string };
  removeHeir?: string;
}

export async function POST(request: Request) {
  try {
    const body: VaultMetaPostBody = await request.json();

    if (!body.vaultAddress || !isAddress(body.vaultAddress)) {
      return NextResponse.json({ error: "Invalid vaultAddress parameter" }, { status: 400 });
    }

    // A removal never needs an owner and short-circuits.
    if (body.removeHeir) {
      if (!isAddress(body.removeHeir)) {
        return NextResponse.json({ error: "Invalid removeHeir address" }, { status: 400 });
      }
      const meta = await removeHeirName(body.vaultAddress, body.removeHeir);
      return NextResponse.json({ success: true, meta });
    }

    if (!body.ownerAddress || !isAddress(body.ownerAddress)) {
      return NextResponse.json({ error: "Invalid ownerAddress parameter" }, { status: 400 });
    }

    if (body.heir) {
      if (!body.heir.address || !isAddress(body.heir.address)) {
        return NextResponse.json({ error: "Invalid heir address" }, { status: 400 });
      }
      const name = cleanName(body.heir.name);
      if (!name) {
        return NextResponse.json(
          { error: `Beneficiary name must be 1–${MAX_NAME_LENGTH} characters` },
          { status: 400 }
        );
      }
      const meta = await setHeirName(body.vaultAddress, body.ownerAddress, body.heir.address, name);
      return NextResponse.json({ success: true, meta });
    }

    if (body.vaultName !== undefined || body.ownerName !== undefined) {
      const names: { vaultName?: string; ownerName?: string } = {};
      if (body.vaultName !== undefined) {
        const name = cleanName(body.vaultName);
        if (!name) {
          return NextResponse.json(
            { error: `Vault name must be 1–${MAX_NAME_LENGTH} characters` },
            { status: 400 }
          );
        }
        names.vaultName = name;
      }
      if (body.ownerName !== undefined) {
        const name = cleanName(body.ownerName);
        if (!name) {
          return NextResponse.json(
            { error: `Your name must be 1–${MAX_NAME_LENGTH} characters` },
            { status: 400 }
          );
        }
        names.ownerName = name;
      }
      const meta = await setVaultNames(body.vaultAddress, body.ownerAddress, names);
      return NextResponse.json({ success: true, meta });
    }

    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update vault metadata";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
