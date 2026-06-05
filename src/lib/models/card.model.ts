import mongoose, { Document, Schema } from "mongoose";
import { CARD_STATUS } from "@/lib/constants";

export interface ICard extends Document {
  cardNumber: string;
  memberId: mongoose.Types.ObjectId;
  status: string;
  activatedAt: Date;
  expiresAt: Date;
  replacedAt: Date | null;
  replacedByCardId: mongoose.Types.ObjectId | null;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const cardSchema = new Schema<ICard>(
  {
    cardNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 50,
    },

    memberId: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },

    status: {
      type: String,
      required: true,
      enum: Object.values(CARD_STATUS),
      default: CARD_STATUS.ACTIVE,
    },

    activatedAt: {
      type: Date,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    replacedAt: {
      type: Date,
      default: null,
    },

    replacedByCardId: {
      type: Schema.Types.ObjectId,
      ref: "Card",
      default: null,
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
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

cardSchema.index({ cardNumber: 1 }, { unique: true });

cardSchema.index({ memberId: 1, status: 1 });

export const Card =
  (mongoose.models.Card as mongoose.Model<ICard>) ||
  mongoose.model<ICard>("Card", cardSchema);
