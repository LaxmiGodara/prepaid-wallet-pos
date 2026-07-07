import mongoose from "mongoose";

import { PAGINATION, PAYMENT_MODES, RECORD_STATUS, TRANSACTION_TYPES } from "@/lib/constants";
import { Member, Recharge, Transaction, Wallet } from "@/lib/models";
import { AppError, type FieldError } from "@/types";

export interface RechargeRecord {
  id:          string;
  memberId:    string;
  memberName:  string;
  walletId:    string;
  amount:      number;
  paymentMode: string;
  notes:       string;
  // walletBalanceBefore/After omitted from list - Transaction model
  // has no referenceId so we cannot join back from list endpoint.
  // These ARE returned from createRecharge (calculated at write time).
  walletBalanceBefore?: number;
  walletBalanceAfter?:  number;
  createdAt:   string;
}

interface CreateRechargeInput {
  memberId?:    string;
  amount?:      number | string;
  paymentMode?: string;
  notes?:       string;
}

interface ListRechargesInput {
  page: number; limit: number; search: string | null;
}

export async function listRecharges(
  input: ListRechargesInput
): Promise<{ rechargeList: RechargeRecord[]; total: number }> {
  const page  = Math.max(1, input.page);
  const limit = Math.min(Math.max(1, input.limit), PAGINATION.MAX_LIMIT);
  const skip  = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};

  if (input.search) {
    const safe = input.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matchingMembers = await Member.find({
      isDeleted: false,
      fullName: { $regex: safe, $options: "i" },
    }).select("_id");
    filter.memberId = { $in: matchingMembers.map((m) => m._id) };
  }

  const [recharges, total] = await Promise.all([
    Recharge.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Recharge.countDocuments(filter),
  ]);

  const memberIds = recharges.map((r) => r.memberId);
  const members   = await Member.find({ _id: { $in: memberIds } });
  const memberMap = new Map(members.map((m) => [m._id.toString(), m.fullName]));

  // Transaction model has no referenceId - cannot join back from list.
  // Show amount only; before/after balance is available on createRecharge return.
  const rechargeList: RechargeRecord[] = recharges.map((r) => ({
    id:          r._id.toString(),
    memberId:    r.memberId.toString(),
    memberName:  memberMap.get(r.memberId.toString()) ?? "Unknown",
    walletId:    r.walletId.toString(),
    amount:      r.amount,
    paymentMode: r.paymentMode,
    notes:       r.notes ?? "",
    createdAt:   r.createdAt.toISOString(),
  }));

  return { rechargeList, total };
}

export async function createRecharge(
  input: CreateRechargeInput,
  actorId: string
): Promise<RechargeRecord> {
  const errors: FieldError[] = [];

  if (!input.memberId?.trim()) errors.push({ field: "memberId", message: "Please select a member." });
  const amount = Number(input.amount);
  if (!input.amount || isNaN(amount) || amount <= 0) {
    errors.push({ field: "amount", message: "Amount must be greater than zero." });
  }
  const validModes = Object.values(PAYMENT_MODES);
  if (!input.paymentMode || !validModes.includes(input.paymentMode as (typeof validModes)[number])) {
    errors.push({ field: "paymentMode", message: "Please select a valid payment mode." });
  }

  if (errors.length > 0) throw new AppError("Validation failed.", 400, errors);
  if (!mongoose.Types.ObjectId.isValid(input.memberId!)) throw new AppError("Invalid member ID.", 400);

  const member = await Member.findOne({ _id: input.memberId, isDeleted: false });
  if (!member) throw new AppError("Member not found.", 404);
  if (member.status !== RECORD_STATUS.ACTIVE) {
    throw new AppError("Cannot recharge an inactive member's wallet.", 400);
  }

  const wallet = await Wallet.findOne({ memberId: input.memberId });
  if (!wallet) throw new AppError("Wallet not found for this member.", 404);
  if (wallet.status !== RECORD_STATUS.ACTIVE) {
    throw new AppError("Cannot recharge an inactive wallet.", 400);
  }

  const actorOid  = new mongoose.Types.ObjectId(actorId);
  const memberOid = new mongoose.Types.ObjectId(input.memberId);

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Atomic $inc - returns document AFTER update
    const updatedWallet = await Wallet.findOneAndUpdate(
      { _id: wallet._id },
      { $inc: { currentBalance: amount }, updatedBy: actorOid },
      { session, new: true }
    );
    if (!updatedWallet) throw new AppError("Wallet update failed.", 500);

    const balanceAfter  = updatedWallet.currentBalance;
    const balanceBefore = balanceAfter - amount;

    // Recharge model fields: memberId, walletId, amount, paymentMode, notes (string)
    // Model does NOT have referenceNumber - use notes field for any reference info
    const [recharge] = await Recharge.create(
      [{
        memberId:    memberOid,
        walletId:    wallet._id,
        amount,
        paymentMode: input.paymentMode,
        notes:       input.notes?.trim() ?? "",  // ← null → "" (model requires string)
        createdBy:   actorOid,
      }],
      { session }
    );

    // Transaction model fields: balanceBefore/balanceAfter (not walletBalance...)
    // Model does NOT have referenceId/referenceModel
    await Transaction.create(
      [{
        memberId:     memberOid,
        walletId:     wallet._id,
        type:         TRANSACTION_TYPES.CREDIT,
        amount,
        balanceBefore,   // ← was walletBalanceBefore
        balanceAfter,    // ← was walletBalanceAfter
        createdBy:    actorOid,
      }],
      { session }
    );

    await session.commitTransaction();

    return {
      id:                  recharge._id.toString(),
      memberId:            memberOid.toString(),
      memberName:          member.fullName,
      walletId:            wallet._id.toString(),
      amount,
      paymentMode:         recharge.paymentMode,
      notes:               recharge.notes ?? "",
      walletBalanceBefore: balanceBefore,
      walletBalanceAfter:  balanceAfter,
      createdAt:           recharge.createdAt.toISOString(),
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}