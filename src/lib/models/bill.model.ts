// src/lib/models/Bill.model.ts

import mongoose, { Document, Schema } from "mongoose";

import { BILL_STATUS } from "@/lib/constants";

interface IBillItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  productCode?: string; // optional - not all product setups include a code
  unitPrice: number;
  quantity: number;
  subtotal: number; // renamed from lineTotal to match billing service
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
      required: false, // optional - populated only when products have a code
      default: null,
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
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true, versionKey: false },
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

billSchema.pre("save", async function () {
  if (!this.isNew) return;

  const date = new Date();
  const datePart =
    `${date.getFullYear()}` +
    `${String(date.getMonth() + 1).padStart(2, "0")}` +
    `${String(date.getDate()).padStart(2, "0")}`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const random = Math.floor(Math.random() * 9000 + 1000).toString();
    const candidate = `BILL-${datePart}-${random}`;
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const existing = await Bill.findOne({ billNumber: candidate });
    if (!existing) {
      this.billNumber = candidate;
      return;
    }
  }

  throw new Error("Could not generate a unique bill number. Please retry.");
});

billSchema.index({ billNumber: 1 }, { unique: true });
billSchema.index({ memberId: 1, createdAt: -1 });
billSchema.index({ cashierId: 1, createdAt: -1 });
billSchema.index({ createdAt: -1 });

export const Bill =
  (mongoose.models.Bill as mongoose.Model<IBill>) ||
  mongoose.model<IBill>("Bill", billSchema);
