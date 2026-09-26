import mongoose, { Schema, Document, Model } from "mongoose";
import { AlertThreshold } from "@/types/notifications";

export interface IAlertLog {
  id: string;
  threshold: AlertThreshold;
  title: string;
  message: string;
  timestamp: number;
  channel: string;
  success: boolean;
  error?: string;
}

export interface IVaultSubscription extends Document {
  vaultAddress: string;
  ownerAddress: string;
  email?: string;
  emailVerified: boolean;
  pushEnabled: boolean;
  lastAlertSent?: {
    threshold: AlertThreshold;
    timestamp: number;
    cycleEpoch: number;
  };
  recentAlerts: IAlertLog[];
  createdAt: Date;
  updatedAt: Date;
}

const AlertLogSchema = new Schema<IAlertLog>(
  {
    id: { type: String, required: true },
    threshold: {
      type: String,
      enum: ["7d", "3d", "24h", "amber", "claim_initiated", "vault_created", "test"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Number, required: true },
    channel: { type: String, required: true },
    success: { type: Boolean, required: true },
    error: { type: String },
  },
  { _id: false }
);

const VaultSubscriptionSchema = new Schema<IVaultSubscription>(
  {
    vaultAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    ownerAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    pushEnabled: {
      type: Boolean,
      default: false,
    },
    lastAlertSent: {
      threshold: {
        type: String,
        enum: ["7d", "3d", "24h", "amber", "claim_initiated", "vault_created", "test"],
      },
      timestamp: { type: Number },
      cycleEpoch: { type: Number },
    },
    recentAlerts: {
      type: [AlertLogSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Prevent model overwrite error upon hot-reloads in Next.js
export const VaultSubscriptionModel: Model<IVaultSubscription> =
  mongoose.models.VaultSubscription ||
  mongoose.model<IVaultSubscription>("VaultSubscription", VaultSubscriptionSchema);
