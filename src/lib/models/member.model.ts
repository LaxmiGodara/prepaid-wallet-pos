import mongoose, { Document, Schema } from "mongoose";
import { RECORD_STATUS } from "@/lib/constants";

export interface IMember extends Document {
  fullName: string;
  mobileNumber: string | null;
  referenceDetails: string | null;
  status: string;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const memberSchema = new Schema<IMember>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },

    mobileNumber: {
      type: String,
      trim: true,
      default: null,
    },

    referenceDetails: {
      type: String,
      trim: true,
      default: null,
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

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

memberSchema.index({ fullName: 1 });

memberSchema.index({ status: 1, isDeleted: 1 });

// Supports mobile-number lookups/search without a full collection scan.
// Not unique: multiple members (e.g. family members) may legitimately share
// a household phone number — if the business rule should be "one member per
// number", change this to `{ unique: true, sparse: true }` (sparse so the
// many `null` values for members without a number don't collide).
memberSchema.index({ mobileNumber: 1 });

export const Member =
  (mongoose.models.Member as mongoose.Model<IMember>) ||
  mongoose.model<IMember>("Member", memberSchema);
