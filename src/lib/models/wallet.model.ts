import mongoose, { Document, Schema } from "mongoose";
import { RECORD_STATUS } from "@/lib/constants";

export interface IWallet extends Document {
  memberId: mongoose.Types.ObjectId;
  currentBalance: number;
  status: string;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<IWallet>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
      unique: true,
    },

    currentBalance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      required: true,
      enum: Object.values(RECORD_STATUS),
      default: RECORD_STATUS.ACTIVE,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

walletSchema.index({ memberId: 1 }, { unique: true });

export const Wallet =
  (mongoose.models.Wallet as mongoose.Model<IWallet>) ||
  mongoose.model<IWallet>("Wallet", walletSchema);
