import mongoose, { Document, Schema } from "mongoose";
import { PAYMENT_MODES } from "@/lib/constants";

export interface IDebit extends Document {
  memberId: mongoose.Types.ObjectId;
  walletId: mongoose.Types.ObjectId;
  cardId: mongoose.Types.ObjectId;
  amount: number;
  reason: string;
  paymentMode: string;
  notes: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const debitSchema = new Schema<IDebit>(
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

    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 300,
    },

    paymentMode: {
      type: String,
      required: true,
      enum: Object.values(PAYMENT_MODES),
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

debitSchema.index({ memberId: 1, createdAt: -1 });

debitSchema.index({ createdAt: -1 });

export const Debit =
  (mongoose.models.Debit as mongoose.Model<IDebit>) ||
  mongoose.model<IDebit>("Debit", debitSchema);
