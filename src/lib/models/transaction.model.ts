import mongoose, { Document, Schema } from "mongoose";
import { TRANSACTION_TYPES } from "@/lib/constants";

export interface ITransaction extends Document {
  walletId: mongoose.Types.ObjectId;
  memberId: mongoose.Types.ObjectId;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  rechargeId: mongoose.Types.ObjectId | null;
  billId: mongoose.Types.ObjectId | null;
  debitId: mongoose.Types.ObjectId | null;
  description: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const transactionSchema = new Schema<ITransaction>(
  {
    walletId: {
      type: Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },

    memberId: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },

    type: {
      type: String,
      required: true,
      enum: Object.values(TRANSACTION_TYPES),
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    balanceBefore: {
      type: Number,
      required: true,
      min: 0,
    },

    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },

    rechargeId: {
      type: Schema.Types.ObjectId,
      ref: "Recharge",
      default: null,
    },

    billId: {
      type: Schema.Types.ObjectId,
      ref: "Bill",
      default: null,
    },

    debitId: {
      type: Schema.Types.ObjectId,
      ref: "Debit",
      default: null,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

transactionSchema.index({ walletId: 1, createdAt: -1 });

transactionSchema.index({ memberId: 1, createdAt: -1 });

transactionSchema.index({ type: 1, createdAt: -1 });

transactionSchema.index({ createdAt: -1 });

export const Transaction =
  (mongoose.models.Transaction as mongoose.Model<ITransaction>) ||
  mongoose.model<ITransaction>("Transaction", transactionSchema);
