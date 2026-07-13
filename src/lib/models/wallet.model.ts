import mongoose, { Document, Schema } from "mongoose";
import { RECORD_STATUS } from "@/lib/constants";

export interface IWallet extends Document {
  memberId: mongoose.Types.ObjectId;
  currentBalance: number;
  status: string;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId | null;
  isDeleted: boolean;
  deletedAt: Date | null;
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

    // Added for consistency with Member/Staff/Card (all of which soft-delete).
    // Nothing currently sets these — there is no wallet-delete flow yet — but
    // the fields exist so that a future "delete member" cascade can soft-delete
    // the owning wallet the same way it soft-deletes the member, instead of
    // leaving an orphaned active-looking wallet behind.
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

// memberId's unique index is already created by `unique: true` on the field
// itself, above — an explicit walletSchema.index({ memberId: 1 }) here would
// just be a duplicate (this used to be here and Mongoose warned about it).

export const Wallet =
  (mongoose.models.Wallet as mongoose.Model<IWallet>) ||
  mongoose.model<IWallet>("Wallet", walletSchema);
