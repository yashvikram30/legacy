import fs from "fs";
import path from "path";
import { connectToDatabase } from "@/lib/db/mongodb";
import { SealedInheritanceModel, ISealedInheritance } from "@/lib/db/models/SealedInheritance";
import type { SealedBundle, SealedVideoMeta } from "./crypto";

export interface SealedInheritanceRecord {
  vaultAddress: string;
  heirAddress: string;
  heirPublicKey: string;
  sealedBundle?: SealedBundle;
  sealedBy?: string;
  sealedAt?: number;
  sealedVideo?: SealedVideoMeta;
  sealedVideoBy?: string;
  sealedVideoAt?: number;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "sealed-inheritance.json");

const memoryCache = new Map<string, SealedInheritanceRecord>();

function keyFor(vault: string, heir: string): string {
  return `${vault.toLowerCase()}:${heir.toLowerCase()}`;
}

function ensureDirExists() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn("[Inheritance] Unable to create data directory:", err);
  }
}

function loadFromFile(): void {
  try {
    ensureDirExists();
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, "utf-8");
      const list: SealedInheritanceRecord[] = JSON.parse(raw);
      for (const item of list) {
        if (item.vaultAddress && item.heirAddress) {
          memoryCache.set(keyFor(item.vaultAddress, item.heirAddress), item);
        }
      }
    }
  } catch (err) {
    console.warn("[Inheritance] Failed to load from file:", err);
  }
}

function persistToFile(): void {
  try {
    ensureDirExists();
    fs.writeFileSync(STORE_FILE, JSON.stringify(Array.from(memoryCache.values()), null, 2), "utf-8");
  } catch (err) {
    console.warn("[Inheritance] Failed to persist to file:", err);
  }
}

loadFromFile();

function docToRecord(doc: ISealedInheritance): SealedInheritanceRecord {
  return {
    vaultAddress: doc.vaultAddress,
    heirAddress: doc.heirAddress,
    heirPublicKey: doc.heirPublicKey,
    sealedBundle: doc.sealedBundle
      ? { ephPub: doc.sealedBundle.ephPub, nonce: doc.sealedBundle.nonce, ct: doc.sealedBundle.ct }
      : undefined,
    sealedBy: doc.sealedBy,
    sealedAt: doc.sealedAt,
    sealedVideo: doc.sealedVideo
      ? {
          ephPub: doc.sealedVideo.ephPub,
          nonce: doc.sealedVideo.nonce,
          blobUrl: doc.sealedVideo.blobUrl,
          ciphertextHash: doc.sealedVideo.ciphertextHash,
          mimeType: doc.sealedVideo.mimeType,
          size: doc.sealedVideo.size,
        }
      : undefined,
    sealedVideoBy: doc.sealedVideoBy,
    sealedVideoAt: doc.sealedVideoAt,
  };
}

export async function getInheritance(
  vault: string,
  heir: string
): Promise<SealedInheritanceRecord | null> {
  const key = keyFor(vault, heir);
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const doc = await SealedInheritanceModel.findOne({
        vaultAddress: vault.toLowerCase(),
        heirAddress: heir.toLowerCase(),
      });
      if (doc) {
        const rec = docToRecord(doc);
        memoryCache.set(key, rec);
        return rec;
      }
      return null;
    }
  } catch (err) {
    console.warn("[Inheritance] Mongo query failed, falling back to cache:", err);
  }
  loadFromFile();
  return memoryCache.get(key) || null;
}

/** Create or update the heir's published public key (enrollment). */
export async function saveEnrollment(
  vault: string,
  heir: string,
  heirPublicKey: string
): Promise<SealedInheritanceRecord> {
  const key = keyFor(vault, heir);
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const doc = await SealedInheritanceModel.findOneAndUpdate(
        { vaultAddress: vault.toLowerCase(), heirAddress: heir.toLowerCase() },
        { $set: { heirPublicKey } },
        { new: true, upsert: true }
      );
      const rec = docToRecord(doc);
      memoryCache.set(key, rec);
      persistToFile();
      return rec;
    }
  } catch (err) {
    console.warn("[Inheritance] Mongo enrollment save failed, falling back to file:", err);
  }
  loadFromFile();
  const existing = memoryCache.get(key);
  const rec: SealedInheritanceRecord = {
    vaultAddress: vault.toLowerCase(),
    heirAddress: heir.toLowerCase(),
    heirPublicKey,
    sealedBundle: existing?.sealedBundle,
    sealedBy: existing?.sealedBy,
    sealedAt: existing?.sealedAt,
  };
  memoryCache.set(key, rec);
  persistToFile();
  return rec;
}

/** Store the owner's sealed bundle for an already-enrolled heir. */
export async function saveSealedBundle(
  vault: string,
  heir: string,
  bundle: SealedBundle,
  sealedBy: string
): Promise<SealedInheritanceRecord | null> {
  const key = keyFor(vault, heir);
  const sealedAt = Date.now();
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const doc = await SealedInheritanceModel.findOneAndUpdate(
        { vaultAddress: vault.toLowerCase(), heirAddress: heir.toLowerCase() },
        { $set: { sealedBundle: bundle, sealedBy: sealedBy.toLowerCase(), sealedAt } },
        { new: true }
      );
      if (!doc) return null;
      const rec = docToRecord(doc);
      memoryCache.set(key, rec);
      persistToFile();
      return rec;
    }
  } catch (err) {
    console.warn("[Inheritance] Mongo seal save failed, falling back to file:", err);
  }
  loadFromFile();
  const existing = memoryCache.get(key);
  if (!existing) return null;
  const rec: SealedInheritanceRecord = {
    ...existing,
    sealedBundle: bundle,
    sealedBy: sealedBy.toLowerCase(),
    sealedAt,
  };
  memoryCache.set(key, rec);
  persistToFile();
  return rec;
}

/** Store the owner's sealed video metadata for an already-enrolled heir. The
 *  ciphertext itself lives in blob storage; only its URL + digest are kept here. */
export async function saveSealedVideo(
  vault: string,
  heir: string,
  video: SealedVideoMeta,
  sealedBy: string
): Promise<SealedInheritanceRecord | null> {
  const key = keyFor(vault, heir);
  const sealedVideoAt = Date.now();
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const doc = await SealedInheritanceModel.findOneAndUpdate(
        { vaultAddress: vault.toLowerCase(), heirAddress: heir.toLowerCase() },
        { $set: { sealedVideo: video, sealedVideoBy: sealedBy.toLowerCase(), sealedVideoAt } },
        { new: true }
      );
      if (!doc) return null;
      const rec = docToRecord(doc);
      memoryCache.set(key, rec);
      persistToFile();
      return rec;
    }
  } catch (err) {
    console.warn("[Inheritance] Mongo video save failed, falling back to file:", err);
  }
  loadFromFile();
  const existing = memoryCache.get(key);
  if (!existing) return null;
  const rec: SealedInheritanceRecord = {
    ...existing,
    sealedVideo: video,
    sealedVideoBy: sealedBy.toLowerCase(),
    sealedVideoAt,
  };
  memoryCache.set(key, rec);
  persistToFile();
  return rec;
}
