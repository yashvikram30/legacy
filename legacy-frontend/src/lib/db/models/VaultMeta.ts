import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHeirName {
  address: string;
  name: string;
}

export interface IVaultMeta extends Document {
  vaultAddress: string;
  ownerAddress: string;
  vaultName?: string;
  heirNames: IHeirName[];
  createdAt: Date;
  updatedAt: Date;
}

const HeirNameSchema = new Schema<IHeirName>(
  {
    address: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const VaultMetaSchema = new Schema<IVaultMeta>(
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
    vaultName: {
      type: String,
      trim: true,
    },
    heirNames: {
      type: [HeirNameSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Prevent model overwrite error upon hot-reloads in Next.js
export const VaultMetaModel: Model<IVaultMeta> =
  mongoose.models.VaultMeta || mongoose.model<IVaultMeta>("VaultMeta", VaultMetaSchema);
