import fs from "fs";
import path from "path";
import { connectToDatabase } from "@/lib/db/mongodb";
import { VaultMetaModel, IVaultMeta } from "@/lib/db/models/VaultMeta";

export interface HeirNameEntry {
  address: string;
  name: string;
}

export interface VaultMetaRecord {
  vaultAddress: string;
  ownerAddress: string;
  vaultName?: string;
  heirNames: HeirNameEntry[];
  createdAt: number;
  updatedAt: number;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "vault-meta.json");

// In-memory fallback, keyed by lowercased vault address
const memoryCache = new Map<string, VaultMetaRecord>();

function ensureDirExists() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn("[VaultMeta] Unable to create data directory:", err);
  }
}

function loadFromFile(): void {
  try {
    ensureDirExists();
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, "utf-8");
      const list: VaultMetaRecord[] = JSON.parse(raw);
      for (const item of list) {
        if (item.vaultAddress) {
          memoryCache.set(item.vaultAddress.toLowerCase(), item);
        }
      }
    }
  } catch (err) {
    console.warn("[VaultMeta] Failed to load from file:", err);
  }
}

function persistToFile(): void {
  try {
    ensureDirExists();
    fs.writeFileSync(STORE_FILE, JSON.stringify(Array.from(memoryCache.values()), null, 2), "utf-8");
  } catch (err) {
    console.warn("[VaultMeta] Failed to persist to file:", err);
  }
}

// Initial load
loadFromFile();

function docToRecord(doc: IVaultMeta): VaultMetaRecord {
  return {
    vaultAddress: doc.vaultAddress,
    ownerAddress: doc.ownerAddress,
    vaultName: doc.vaultName,
    heirNames: (doc.heirNames || []).map((h) => ({ address: h.address, name: h.name })),
    createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).getTime() : Date.now(),
  };
}

export async function getVaultMeta(vaultAddress: string): Promise<VaultMetaRecord | null> {
  const key = vaultAddress.toLowerCase();
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const doc = await VaultMetaModel.findOne({ vaultAddress: key });
      if (doc) {
        const rec = docToRecord(doc);
        memoryCache.set(key, rec);
        return rec;
      }
      return null;
    }
  } catch (err) {
    console.warn("[VaultMeta] Mongo query failed, falling back to cache:", err);
  }
  loadFromFile();
  return memoryCache.get(key) || null;
}

export async function getVaultMetasByOwner(ownerAddress: string): Promise<VaultMetaRecord[]> {
  const owner = ownerAddress.toLowerCase();
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const docs = await VaultMetaModel.find({ ownerAddress: owner });
      const list = docs.map(docToRecord);
      for (const item of list) memoryCache.set(item.vaultAddress.toLowerCase(), item);
      return list;
    }
  } catch (err) {
    console.warn("[VaultMeta] Mongo owner query failed, falling back to cache:", err);
  }
  loadFromFile();
  return Array.from(memoryCache.values()).filter((r) => r.ownerAddress.toLowerCase() === owner);
}

/** Persist (or update) the display name the owner chose for a vault. */
export async function setVaultName(
  vaultAddress: string,
  ownerAddress: string,
  vaultName: string
): Promise<VaultMetaRecord> {
  const key = vaultAddress.toLowerCase();
  const owner = ownerAddress.toLowerCase();
  const name = vaultName.trim();

  try {
    const conn = await connectToDatabase();
    if (conn) {
      const doc = await VaultMetaModel.findOneAndUpdate(
        { vaultAddress: key },
        { $set: { vaultName: name, ownerAddress: owner } },
        { new: true, upsert: true }
      );
      const rec = docToRecord(doc);
      memoryCache.set(key, rec);
      persistToFile();
      return rec;
    }
  } catch (err) {
    console.warn("[VaultMeta] Mongo setVaultName failed, falling back to file:", err);
  }

  loadFromFile();
  const existing = memoryCache.get(key);
  const rec: VaultMetaRecord = {
    vaultAddress: key,
    ownerAddress: owner,
    vaultName: name,
    heirNames: existing?.heirNames ?? [],
    createdAt: existing?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  };
  memoryCache.set(key, rec);
  persistToFile();
  return rec;
}

/** Attach (or update) the friendly name the owner gave a beneficiary. */
export async function setHeirName(
  vaultAddress: string,
  ownerAddress: string,
  heirAddress: string,
  name: string
): Promise<VaultMetaRecord> {
  const key = vaultAddress.toLowerCase();
  const owner = ownerAddress.toLowerCase();
  const heir = heirAddress.toLowerCase();
  const trimmed = name.trim();

  try {
    const conn = await connectToDatabase();
    if (conn) {
      // Ensure a document exists (and owner is recorded), then upsert the heir name
      // entry — pull any existing entry for this heir first to avoid duplicates.
      await VaultMetaModel.updateOne(
        { vaultAddress: key },
        { $set: { ownerAddress: owner }, $pull: { heirNames: { address: heir } } },
        { upsert: true }
      );
      const doc = await VaultMetaModel.findOneAndUpdate(
        { vaultAddress: key },
        { $push: { heirNames: { address: heir, name: trimmed } } },
        { new: true }
      );
      if (doc) {
        const rec = docToRecord(doc);
        memoryCache.set(key, rec);
        persistToFile();
        return rec;
      }
    }
  } catch (err) {
    console.warn("[VaultMeta] Mongo setHeirName failed, falling back to file:", err);
  }

  loadFromFile();
  const existing = memoryCache.get(key);
  const heirNames = (existing?.heirNames ?? []).filter((h) => h.address.toLowerCase() !== heir);
  heirNames.push({ address: heir, name: trimmed });
  const rec: VaultMetaRecord = {
    vaultAddress: key,
    ownerAddress: owner,
    vaultName: existing?.vaultName,
    heirNames,
    createdAt: existing?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  };
  memoryCache.set(key, rec);
  persistToFile();
  return rec;
}

/** Remove a beneficiary's stored name (e.g. when the heir is revoked on-chain). */
export async function removeHeirName(
  vaultAddress: string,
  heirAddress: string
): Promise<VaultMetaRecord | null> {
  const key = vaultAddress.toLowerCase();
  const heir = heirAddress.toLowerCase();

  try {
    const conn = await connectToDatabase();
    if (conn) {
      const doc = await VaultMetaModel.findOneAndUpdate(
        { vaultAddress: key },
        { $pull: { heirNames: { address: heir } } },
        { new: true }
      );
      if (doc) {
        const rec = docToRecord(doc);
        memoryCache.set(key, rec);
        persistToFile();
        return rec;
      }
      return null;
    }
  } catch (err) {
    console.warn("[VaultMeta] Mongo removeHeirName failed, falling back to file:", err);
  }

  loadFromFile();
  const existing = memoryCache.get(key);
  if (!existing) return null;
  existing.heirNames = existing.heirNames.filter((h) => h.address.toLowerCase() !== heir);
  existing.updatedAt = Date.now();
  memoryCache.set(key, existing);
  persistToFile();
  return existing;
}
