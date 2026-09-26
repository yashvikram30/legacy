// Polyfill for Bun's process.getBuiltinModule('v8') to support BSON v7 in Bun runtime
if (typeof process !== "undefined" && typeof (process as any).getBuiltinModule === "function") {
  const orig = (process as any).getBuiltinModule;
  (process as any).getBuiltinModule = function (mod: string) {
    if (mod === "v8") {
      const v8 = orig.call(process, mod);
      return {
        ...v8,
        startupSnapshot: {
          isBuildingSnapshot: () => false,
        },
      };
    }
    return orig.call(process, mod);
  };
}

import dns from "node:dns";

// Configure public DNS resolvers to handle SRV lookups if local ISP DNS refuses SRV queries
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Ignore in environments where setServers is restricted
}

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI?.trim();

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Global cached connection for Next.js hot-reloading
const globalForMongoose = globalThis as unknown as {
  mongooseCache?: MongooseCache;
};

const cached: MongooseCache = globalForMongoose.mongooseCache || {
  conn: null,
  promise: null,
};

globalForMongoose.mongooseCache = cached;

export async function connectToDatabase(): Promise<typeof mongoose | null> {
  if (!MONGODB_URI) {
    console.warn("[MongoDB] MONGODB_URI is not defined in environment variables. Falling back to in-memory/file store.");
    return null;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((m) => {
        console.log("[MongoDB] Connected successfully to MongoDB Atlas.");
        return m;
      })
      .catch((err) => {
        console.warn("[MongoDB] Connection warning (falling back to local store):", err?.message || err);
        cached.promise = null;
        return null as any;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    return null;
  }
}
