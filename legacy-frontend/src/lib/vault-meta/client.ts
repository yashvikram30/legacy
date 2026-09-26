"use client";

// Client-side helpers for the off-chain vault/beneficiary naming layer.
// Names are metadata only — the source of truth for ownership and heirs
// remains the on-chain vault contract. These calls never block the chain
// transaction; a naming failure is surfaced but the on-chain state stands.

export interface HeirNameEntry {
  address: string;
  name: string;
}

export interface VaultMetaRecord {
  vaultAddress: string;
  ownerAddress: string;
  vaultName?: string;
  ownerName?: string;
  heirNames: HeirNameEntry[];
  createdAt: number;
  updatedAt: number;
}

export async function fetchVaultMeta(vault: string): Promise<VaultMetaRecord | null> {
  try {
    const res = await fetch(`/api/vault-meta?vault=${vault}`);
    if (!res.ok) return null;
    const data = await res.json();
    return (data.meta as VaultMetaRecord | null) ?? null;
  } catch {
    return null;
  }
}

export async function fetchVaultMetasByOwner(owner: string): Promise<VaultMetaRecord[]> {
  try {
    const res = await fetch(`/api/vault-meta?owner=${owner}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.metas as VaultMetaRecord[] | undefined) ?? [];
  } catch {
    return [];
  }
}

export async function saveVaultNames(
  vaultAddress: string,
  ownerAddress: string,
  names: { vaultName?: string; ownerName?: string }
): Promise<boolean> {
  try {
    const res = await fetch("/api/vault-meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vaultAddress, ownerAddress, ...names }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function saveHeirName(
  vaultAddress: string,
  ownerAddress: string,
  heirAddress: string,
  name: string
): Promise<boolean> {
  try {
    const res = await fetch("/api/vault-meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vaultAddress, ownerAddress, heir: { address: heirAddress, name } }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function removeHeirName(vaultAddress: string, heirAddress: string): Promise<boolean> {
  try {
    const res = await fetch("/api/vault-meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vaultAddress, removeHeir: heirAddress }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Build a lowercased address → name lookup from a meta record. */
export function heirNameMap(meta: VaultMetaRecord | null): Record<string, string> {
  const map: Record<string, string> = {};
  if (!meta) return map;
  for (const h of meta.heirNames) map[h.address.toLowerCase()] = h.name;
  return map;
}
