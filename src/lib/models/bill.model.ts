import mongoose, { Document, Schema } from "mongoose";
import { BILL_STATUS } from "@/lib/constants";

interface IBillItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  productCode: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

const billItemSchema = new Schema<IBillItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    productName: {
      type: String,
      required: true,
    },

    productCode: {
      type: String,
      required: true,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: true,
    versionKey: false,
  },
);

export interface IBill extends Document {
  billNumber: string;
  memberId: mongoose.Types.ObjectId;
  walletId: mongoose.Types.ObjectId;
  cardId: mongoose.Types.ObjectId;
  cashierId: mongoose.Types.ObjectId;
  items: IBillItem[];
  totalAmount: number;
  walletBalanceBefore: number;
  walletBalanceAfter: number;
  status: string;
  notes: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const billSchema = new Schema<IBill>(
  {
    billNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
    },

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

    cashierId: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },

    items: {
      type: [billItemSchema],
      validate: {
        validator: (items: IBillItem[]) => items.length > 0,
        message: "A bill must have at least one item.",
      },
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    walletBalanceBefore: {
      type: Number,
      required: true,
      min: 0,
    },

    walletBalanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      required: true,
      enum: Object.values(BILL_STATUS),
      default: BILL_STATUS.CONFIRMED,
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

billSchema.index({ billNumber: 1 }, { unique: true });

billSchema.index({ memberId: 1, createdAt: -1 });

billSchema.index({ cashierId: 1, createdAt: -1 });

billSchema.index({ createdAt: -1 });

export const Bill =
  (mongoose.models.Bill as mongoose.Model<IBill>) ||
  mongoose.model<IBill>("Bill", billSchema);
