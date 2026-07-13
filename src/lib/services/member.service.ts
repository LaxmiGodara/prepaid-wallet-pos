import mongoose from "mongoose";

import { CARD_STATUS, PAGINATION, RECORD_STATUS } from "@/lib/constants";
import { Member, Wallet, type ICard, type IMember, type IWallet } from "@/lib/models";
import {
  findCardsForMembers,
  findMemberCard,
} from "@/lib/services/card.service";
import { AppError, type FieldError } from "@/types";

// ─── Output Types ──────────────────────────────────────────────────────────────

export interface MemberRecord {
  id: string;
  fullName: string;
  mobileNumber: string | null;
  referenceDetails: string | null;
  status: string;
  walletId: string;
  walletBalance: number;
  isReady: boolean; // ← NEW: computed from member + wallet + card
  createdAt: string;
  updatedAt: string;
}

export interface ReadinessChecks {
  memberActive: boolean;
  walletExists: boolean;
  walletActive: boolean;
  cardAssigned: boolean;
  cardActive: boolean;
  cardNotExpired: boolean;
}

export interface ReadinessStatus {
  isReady: boolean;
  checks: ReadinessChecks;
}

export interface MemberDetailRecord {
  id: string;
  fullName: string;
  mobileNumber: string | null;
  referenceDetails: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  wallet: {
    id: string;
    currentBalance: number;
    status: string;
  } | null;
  card: {
    id: string;
    cardNumber: string;
    status: string;
    expiresAt: string;
  } | null;
  readiness: ReadinessStatus;
}

// NEW ON DAY 20
export interface MembersStats {
  total: number;
  active: number;
  inactive: number;
}

// ─── Input Types ──────────────────────────────────────────────────────────────

interface ListMembersInput {
  page: number;
  limit: number;
  search: string | null;
  status: string | null;
}

interface ListMembersResult {
  memberList: MemberRecord[];
  total: number;
}

interface CreateMemberInput {
  fullName?: string;
  mobileNumber?: string;
  referenceDetails?: string;
}

interface UpdateMemberInput {
  fullName?: string;
  mobileNumber?: string;
  referenceDetails?: string;
}

// ─── computeReadiness ─────────────────────────────────────────────────────────

function computeReadiness(
  member: IMember,
  wallet: IWallet | null,
  card: ICard | null,
): ReadinessStatus {
  const now = new Date();

  const checks: ReadinessChecks = {
    memberActive: member.status === RECORD_STATUS.ACTIVE,
    walletExists: wallet !== null,
    walletActive: !!wallet && wallet.status === RECORD_STATUS.ACTIVE,
    cardAssigned: card !== null,
    cardActive: !!card && card.status === CARD_STATUS.ACTIVE,
    cardNotExpired: card ? new Date(card.expiresAt) > now : false,
  };

  const isReady = Object.values(checks).every(Boolean);
  return { isReady, checks };
}

// ─── validateCreateMemberInput ─────────────────────────────────────────────────

function validateCreateMemberInput(input: CreateMemberInput): FieldError[] {
  const errors: FieldError[] = [];

  const fullName = input.fullName?.trim() ?? "";
  if (!fullName) {
    errors.push({ field: "fullName", message: "Full name is required." });
  } else if (fullName.length < 2) {
    errors.push({
      field: "fullName",
      message: "Full name must be at least 2 characters.",
    });
  } else if (fullName.length > 120) {
    errors.push({
      field: "fullName",
      message: "Full name must not exceed 120 characters.",
    });
  }

  const mobileNumber = input.mobileNumber?.trim() ?? "";
  if (mobileNumber && !/^[6-9]\d{9}$/.test(mobileNumber)) {
    errors.push({
      field: "mobileNumber",
      message: "Mobile number must be a valid 10-digit number.",
    });
  }

  const referenceDetails = input.referenceDetails?.trim() ?? "";
  if (referenceDetails.length > 300) {
    errors.push({
      field: "referenceDetails",
      message: "Reference details must not exceed 300 characters.",
    });
  }

  return errors;
}

// ─── listMembers ───────────────────────────────────────────────────────────────

export async function listMembers(
  input: ListMembersInput,
): Promise<ListMembersResult> {
  const page = Math.max(1, input.page);
  const limit = Math.min(Math.max(1, input.limit), PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = { isDeleted: false };

  if (input.search) {
    const safeSearch = input.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { fullName: { $regex: safeSearch, $options: "i" } },
      { mobileNumber: { $regex: safeSearch, $options: "i" } },
    ];
  }

  if (input.status) filter.status = input.status;

  // Query 1+2: members and total count in parallel
  const [members, total] = await Promise.all([
    Member.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Member.countDocuments(filter),
  ]);

  const memberIds = members.map((m) => m._id);

  // Query 3+4: wallets AND cards in one Promise.all - three-way enrichment
  const [wallets, cardMap] = await Promise.all([
    Wallet.find({ memberId: { $in: memberIds } }),
    findCardsForMembers(memberIds),
  ]);

  // Build lookup Maps for O(1) access when combining the three datasets
  const walletMap = new Map(wallets.map((w) => [w.memberId.toString(), w]));

  const memberList: MemberRecord[] = members.map((m) => {
    const wallet = walletMap.get(m._id.toString()) ?? null;
    const card = cardMap.get(m._id.toString()) ?? null;
    const { isReady } = computeReadiness(m, wallet, card);

    return {
      id: m._id.toString(),
      fullName: m.fullName,
      mobileNumber: m.mobileNumber,
      referenceDetails: m.referenceDetails,
      status: m.status,
      walletId: wallet?._id.toString() ?? "",
      walletBalance: wallet?.currentBalance ?? 0,
      isReady, // ← computed from all three documents
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    };
  });

  return { memberList, total };
}

// ─── getMembersStats ──────────────────────────────────────────────────────────

export async function getMembersStats(): Promise<MembersStats> {
  const [total, active] = await Promise.all([
    Member.countDocuments({ isDeleted: false }),
    Member.countDocuments({ isDeleted: false, status: RECORD_STATUS.ACTIVE }),
  ]);

  return {
    total,
    active,
    inactive: total - active,
  };
}

// ─── createMember ─────────────────────────────────────────────────────────────

export async function createMember(
  input: CreateMemberInput,
  actorId: string,
): Promise<MemberRecord> {
  const validationErrors = validateCreateMemberInput(input);
  if (validationErrors.length > 0) {
    throw new AppError(
      "Validation failed. Please check the highlighted fields.",
      400,
      validationErrors,
    );
  }

  const fullName = input.fullName!.trim();
  const mobileNumber = input.mobileNumber?.trim() || null;
  const referenceDetails = input.referenceDetails?.trim() || null;

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const [member] = await Member.create(
      [
        {
          fullName,
          mobileNumber,
          referenceDetails,
          status: RECORD_STATUS.ACTIVE,
          createdBy: new mongoose.Types.ObjectId(actorId),
          updatedBy: null,
          isDeleted: false,
          deletedAt: null,
        },
      ],
      { session, ordered: true },
    );

    const [wallet] = await Wallet.create(
      [
        {
          memberId: member._id,
          currentBalance: 0,
          status: RECORD_STATUS.ACTIVE,
          createdBy: new mongoose.Types.ObjectId(actorId),
          updatedBy: null,
        },
      ],
      { session, ordered: true },
    );

    await session.commitTransaction();

    return {
      id: member._id.toString(),
      fullName: member.fullName,
      mobileNumber: member.mobileNumber,
      referenceDetails: member.referenceDetails,
      status: member.status,
      walletId: wallet._id.toString(),
      walletBalance: wallet.currentBalance,
      isReady: false, // new members never have a card yet
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// ─── validateUpdateMemberInput ────────────────────────────────────────────────

function validateUpdateMemberInput(input: UpdateMemberInput): FieldError[] {
  const errors: FieldError[] = [];

  if (input.fullName !== undefined) {
    const fullName = input.fullName.trim();
    if (!fullName) {
      errors.push({ field: "fullName", message: "Full name cannot be empty." });
    } else if (fullName.length < 2) {
      errors.push({
        field: "fullName",
        message: "Full name must be at least 2 characters.",
      });
    } else if (fullName.length > 120) {
      errors.push({
        field: "fullName",
        message: "Full name must not exceed 120 characters.",
      });
    }
  }

  if (input.mobileNumber !== undefined && input.mobileNumber.trim()) {
    if (!/^[6-9]\d{9}$/.test(input.mobileNumber.trim())) {
      errors.push({
        field: "mobileNumber",
        message: "Mobile number must be a valid 10-digit number.",
      });
    }
  }

  if (
    input.referenceDetails !== undefined &&
    input.referenceDetails.trim().length > 300
  ) {
    errors.push({
      field: "referenceDetails",
      message: "Reference details must not exceed 300 characters.",
    });
  }

  return errors;
}

// ─── updateMember ─────────────────────────────────────────────────────────────

export async function updateMember(
  targetId: string,
  input: UpdateMemberInput,
  actorId: string,
): Promise<MemberRecord> {
  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    throw new AppError("Invalid member ID.", 400);
  }

  const validationErrors = validateUpdateMemberInput(input);
  if (validationErrors.length > 0) {
    throw new AppError("Validation failed.", 400, validationErrors);
  }

  const hasAnyField =
    input.fullName !== undefined ||
    input.mobileNumber !== undefined ||
    input.referenceDetails !== undefined;

  if (!hasAnyField) {
    throw new AppError("Nothing to update. Provide at least one field.", 400);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateFields: Record<string, any> = {
    updatedBy: new mongoose.Types.ObjectId(actorId),
  };

  if (input.fullName !== undefined)
    updateFields.fullName = input.fullName.trim();
  if (input.mobileNumber !== undefined) {
    updateFields.mobileNumber = input.mobileNumber.trim() || null;
  }
  if (input.referenceDetails !== undefined) {
    updateFields.referenceDetails = input.referenceDetails.trim() || null;
  }

  const updated = await Member.findOneAndUpdate(
    { _id: targetId, isDeleted: false },
    updateFields,
    { new: true },
  );

  if (!updated) throw new AppError("Member not found.", 404);

  // Fetch wallet and card to return the full enriched record
  const [wallet, card] = await Promise.all([
    Wallet.findOne({ memberId: updated._id }),
    findMemberCard(updated._id),
  ]);

  const { isReady } = computeReadiness(updated, wallet ?? null, card ?? null);

  return {
    id: updated._id.toString(),
    fullName: updated.fullName,
    mobileNumber: updated.mobileNumber,
    referenceDetails: updated.referenceDetails,
    status: updated.status,
    walletId: wallet?._id.toString() ?? "",
    walletBalance: wallet?.currentBalance ?? 0,
    isReady,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

// ─── updateMemberStatus ──────────────────────────────────────────────────────

export async function updateMemberStatus(
  targetId: string,
  actorId: string,
): Promise<MemberRecord> {
  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    throw new AppError("Invalid member ID.", 400);
  }

  const member = await Member.findOne({ _id: targetId, isDeleted: false });
  if (!member) throw new AppError("Member not found.", 404);

  const newStatus =
    member.status === RECORD_STATUS.ACTIVE
      ? RECORD_STATUS.INACTIVE
      : RECORD_STATUS.ACTIVE;

  const updated = await Member.findOneAndUpdate(
    { _id: targetId, isDeleted: false },
    { status: newStatus, updatedBy: new mongoose.Types.ObjectId(actorId) },
    { new: true },
  );

  if (!updated) throw new AppError("Member not found.", 404);

  const [wallet, card] = await Promise.all([
    Wallet.findOne({ memberId: updated._id }),
    findMemberCard(updated._id),
  ]);

  const { isReady } = computeReadiness(updated, wallet ?? null, card ?? null);

  return {
    id: updated._id.toString(),
    fullName: updated.fullName,
    mobileNumber: updated.mobileNumber,
    referenceDetails: updated.referenceDetails,
    status: updated.status,
    walletId: wallet?._id.toString() ?? "",
    walletBalance: wallet?.currentBalance ?? 0,
    isReady,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

// ─── getMemberDetail ──────────────────────────────────────────────────────────

export async function getMemberDetail(
  memberId: string,
): Promise<MemberDetailRecord> {
  if (!mongoose.Types.ObjectId.isValid(memberId)) {
    throw new AppError("Invalid member ID.", 400);
  }

  const [member, wallet, card] = await Promise.all([
    Member.findOne({ _id: memberId, isDeleted: false }),
    Wallet.findOne({ memberId }),
    findMemberCard(memberId),
  ]);

  if (!member) {
    throw new AppError("Member not found.", 404);
  }

  const readiness = computeReadiness(member, wallet, card);

  return {
    id: member._id.toString(),
    fullName: member.fullName,
    mobileNumber: member.mobileNumber,
    referenceDetails: member.referenceDetails,
    status: member.status,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
    wallet: wallet
      ? {
          id: wallet._id.toString(),
          currentBalance: wallet.currentBalance,
          status: wallet.status,
        }
      : null,
    card: card
      ? {
          id: card._id.toString(),
          cardNumber: card.cardNumber,
          status: card.status,
          expiresAt: card.expiresAt.toISOString(),
        }
      : null,
    readiness,
  };
}
