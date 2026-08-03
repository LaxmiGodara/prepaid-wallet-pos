import mongoose, { Document, Schema } from "mongoose";
import { STOCK_MOVEMENT_TYPES } from "@/lib/constants";

export interface IStockMovement extends Document {
  productId: mongoose.Types.ObjectId;
  movementType: string;
  quantityBefore: number;
  quantityChanged: number;
  quantityAfter: number;
  billId: mongoose.Types.ObjectId | null;
  notes: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const stockMovementSchema = new Schema<IStockMovement>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    movementType: {
      type: String,
      required: true,
      enum: Object.values(STOCK_MOVEMENT_TYPES),
    },

    quantityBefore: {
      type: Number,
      required: true,
    },

    quantityChanged: {
      type: Number,
      required: true,
    },

    quantityAfter: {
      type: Number,
      required: true,
    },

    billId: {
      type: Schema.Types.ObjectId,
      ref: "Bill",
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

stockMovementSchema.index({ productId: 1, createdAt: -1 });

stockMovementSchema.index({ movementType: 1, createdAt: -1 });

stockMovementSchema.index({ createdAt: -1 });

export const StockMovement =
  (mongoose.models.StockMovement as mongoose.Model<IStockMovement>) ||
  mongoose.model<IStockMovement>("StockMovement", stockMovementSchema);
