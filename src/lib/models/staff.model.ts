import mongoose, { Document, Schema } from "mongoose";
import { RECORD_STATUS, STAFF_ROLES } from "@/lib/constants";

export interface IStaff extends Document {
  fullName: string;
  username: string;
  passwordHash: string;
  role: string;
  status: string;
  tokenVersion: number;
  createdBy: mongoose.Types.ObjectId | null;
  updatedBy: mongoose.Types.ObjectId | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const staffSchema = new Schema<IStaff>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },

    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 40,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      required: true,
      enum: Object.values(STAFF_ROLES),
    },

    status: {
      type: String,
      required: true,
      enum: Object.values(RECORD_STATUS),
      default: RECORD_STATUS.ACTIVE,
    },

    tokenVersion: {
      type: Number,
      default: 0,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
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

staffSchema.index({ username: 1 }, { unique: true });

staffSchema.index(
  { role: 1 },
  {
    unique: true,
    partialFilterExpression: {
      role: STAFF_ROLES.SUPER_ADMIN,
      isDeleted: false,
    },
  },
);

export const Staff =
  (mongoose.models.Staff as mongoose.Model<IStaff>) ||
  mongoose.model<IStaff>("Staff", staffSchema);
