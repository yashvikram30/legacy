import mongoose from "mongoose";

const AlertLogSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    threshold: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Number, required: true },
    channel: { type: String, required: true },
    success: { type: Boolean, required: true },
    error: { type: String },
  },
  { _id: false }
);

const VaultSubscriptionSchema = new mongoose.Schema(
  {
    vaultAddress: { type: String, required: true, unique: true, lowercase: true, trim: true },
    ownerAddress: { type: String, required: true, lowercase: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    emailVerified: { type: Boolean, default: false },
    pushEnabled: { type: Boolean, default: false },
    lastAlertSent: {
      threshold: { type: String },
      timestamp: { type: Number },
      cycleEpoch: { type: Number },
    },
    lastClaimAlertSent: {
      threshold: { type: String },
      timestamp: { type: Number },
      claimInitiatedAt: { type: Number },
      heirAddress: { type: String, lowercase: true, trim: true },
    },
    recentAlerts: { type: [AlertLogSchema], default: [] },
  },
  { timestamps: true }
);

export const VaultSubscription =
  mongoose.models.VaultSubscription ||
  mongoose.model("VaultSubscription", VaultSubscriptionSchema);

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/legacy-protocol";

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    isConnected = true;
    console.log(" Connected to MongoDB");
  } catch (err) {
    console.warn("⚠️ [DB] MongoDB connection failed, running without persistent DB:", err.message);
  }
}

export async function getSubscriptionByVault(vaultAddress) {
  try {
    await connectDB();
    if (!isConnected) return null;
    return await VaultSubscription.findOne({ vaultAddress: vaultAddress.toLowerCase() });
  } catch (err) {
    console.warn("[DB] Error fetching subscription:", err.message);
    return null;
  }
}

export async function getAllActiveSubscriptions() {
  try {
    await connectDB();
    if (!isConnected) return [];
    return await VaultSubscription.find({ email: { $exists: true, $ne: "" } });
  } catch (err) {
    console.warn("[DB] Error fetching all subscriptions:", err.message);
    return [];
  }
}
