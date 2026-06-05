import mongoose, { Document, Schema } from "mongoose";

export interface IStock extends Document {
  productId: mongoose.Types.ObjectId;
  currentQty: number;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const stockSchema = new Schema<IStock>(
  {
    productId: {
      // One stock record per product. unique: true enforces this.
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      unique: true,
    },

    currentQty: {
      // The current number of units available.
      // No minimum - the PRD allows negative stock with a warning.
      // Negative stock occurs when billing outpaces stock updates.
      // The billing service will warn but not block when stock is low or negative.
      type: Number,
      required: true,
      default: 0,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },

    updatedBy: {
      // Updated every time an admin adjusts the stock quantity.
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

stockSchema.index({ productId: 1 }, { unique: true });

export const Stock =
  (mongoose.models.Stock as mongoose.Model<IStock>) ||
  mongoose.model<IStock>("Stock", stockSchema);
