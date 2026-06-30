

import mongoose from "mongoose";

import { PAGINATION, RECORD_STATUS } from "@/lib/constants";
import { Member, Wallet } from "@/lib/models";
import { AppError, type FieldError } from "@/types";

export interface MemberRecord {
  id: string;
  fullName: string;
  mobileNumber: string | null;
  referenceDetails: string | null;
  status: string;
  walletId: string;
  walletBalance: number;
  createdAt: string;
  updatedAt: string;
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

// ─── validateCreateMemberInput ─────────────────────────────────────────────────
// fullName is required. mobileNumber and referenceDetails are optional -
// they are only validated for FORMAT if a value was actually provided.

function validateCreateMemberInput(input: CreateMemberInput): FieldError[] {
  const errors: FieldError[] = [];

  const fullName = input.fullName?.trim() ?? "";
  if (!fullName) {
    errors.push({ field: "fullName", message: "Full name is required." });
  } else if (fullName.length < 2) {
    errors.push({ field: "fullName", message: "Full name must be at least 2 characters." });
  } else if (fullName.length > 120) {
    errors.push({ field: "fullName", message: "Full name must not exceed 120 characters." });
  }

  // Optional: only validate format if a non-empty value was provided.
  const mobileNumber = input.mobileNumber?.trim() ?? "";
  if (mobileNumber && !/^[6-9]\d{9}$/.test(mobileNumber)) {
    errors.push({
      field: "mobileNumber",
      message: "Mobile number must be a valid 10-digit number.",
    });
  }

  // Optional: free text, only checked for excessive length.
  const referenceDetails = input.referenceDetails?.trim() ?? "";
  if (referenceDetails.length > 300) {
    errors.push({
      field: "referenceDetails",
      message: "Reference details must not exceed 300 characters.",
    });
  }

  return errors;
}


export async function listMembers(
  input: ListMembersInput
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

  const [members, total] = await Promise.all([
    Member.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Member.countDocuments(filter),
  ]);

  // ── Fetch all wallets for this page of members in ONE query ──────────────
  const memberIds = members.map((m) => m._id);
  const wallets = await Wallet.find({ memberId: { $in: memberIds } });

  // Build a lookup map for O(1) access while combining the two datasets.
  // Keys are stringified ObjectIds so they can be compared reliably.
  const walletMap = new Map(
    wallets.map((w) => [w.memberId.toString(), w])
  );

  const memberList: MemberRecord[] = members.map((m) => {
    const wallet = walletMap.get(m._id.toString());
    return {
      id: m._id.toString(),
      fullName: m.fullName,
      mobileNumber: m.mobileNumber,
      referenceDetails: m.referenceDetails,
      status: m.status,
      // wallet should always exist due to the transaction guarantee,
      // but ?? provides a safe fallback in case of legacy/edge data
      walletId: wallet?._id.toString() ?? "",
      walletBalance: wallet?.currentBalance ?? 0,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    };
  });

  return { memberList, total };
}




export async function createMember(
  input: CreateMemberInput,
  actorId: string
): Promise<MemberRecord> {
  // ── Step 1: Validate ──────────────────────────────────────────────────────
  const validationErrors = validateCreateMemberInput(input);
  if (validationErrors.length > 0) {
    throw new AppError(
      "Validation failed. Please check the highlighted fields.",
      400,
      validationErrors
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
      { session }
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
      { session }
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