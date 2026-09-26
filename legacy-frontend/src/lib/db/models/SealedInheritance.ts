import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISealedBundle {
  ephPub: string;
  nonce: string;
  ct: string;
}

export interface ISealedInheritance extends Document {
  vaultAddress: string;
  heirAddress: string;
  heirPublicKey: string;
  sealedBundle?: ISealedBundle;
  sealedBy?: string;
  sealedAt?: number;
  createdAt: Date;
  updatedAt: Date;
}

const SealedBundleSchema = new Schema<ISealedBundle>(
  {
    ephPub: { type: String, required: true },
    nonce: { type: String, required: true },
    ct: { type: String, required: true },
  },
  { _id: false }
);

const SealedInheritanceSchema = new Schema<ISealedInheritance>(
  {
    vaultAddress: { type: String, required: true, lowercase: true, trim: true, index: true },
    heirAddress: { type: String, required: true, lowercase: true, trim: true, index: true },
    heirPublicKey: { type: String, required: true },
    sealedBundle: { type: SealedBundleSchema },
    sealedBy: { type: String, lowercase: true, trim: true },
    sealedAt: { type: Number },
  },
  { timestamps: true }
);

SealedInheritanceSchema.index({ vaultAddress: 1, heirAddress: 1 }, { unique: true });

export const SealedInheritanceModel: Model<ISealedInheritance> =
  mongoose.models.SealedInheritance ||
  mongoose.model<ISealedInheritance>("SealedInheritance", SealedInheritanceSchema);
