import mongoose, { Document, Schema } from "mongoose";
import { PAYMENT_MODES } from "@/lib/constants";

export interface IRecharge extends Document {
  memberId: mongoose.Types.ObjectId;
  walletId: mongoose.Types.ObjectId;
  cardId: mongoose.Types.ObjectId;
  amount: number;
  paymentMode: string;
  referenceNumber: string | null;
  notes: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const rechargeSchema = new Schema<IRecharge>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },

    walletId: {
      type: Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },

    cardId: {
      type: Schema.Types.ObjectId,
      ref: "Card",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    paymentMode: {
      type: String,
      required: true,
      enum: Object.values(PAYMENT_MODES),
    },

    referenceNumber: {
      type: String,
      trim: true,
      default: null,
    },

    notes: {
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

rechargeSchema.index({ memberId: 1, createdAt: -1 });

rechargeSchema.index({ createdAt: -1 });

export const Recharge =
  (mongoose.models.Recharge as mongoose.Model<IRecharge>) ||
  mongoose.model<IRecharge>("Recharge", rechargeSchema);
