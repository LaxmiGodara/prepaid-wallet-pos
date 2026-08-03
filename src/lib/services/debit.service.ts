import mongoose from "mongoose";

import { startDbSession } from "@/lib/db";

import { CARD_STATUS, PAGINATION, PAYMENT_MODES, RECORD_STATUS, TRANSACTION_TYPES } from "@/lib/constants";
import { Card, Debit, Member, Transaction, Wallet } from "@/lib/models";
import { AppError, type FieldError } from "@/types";

export interface DebitRecord {
  id:                  string;
  memberId:            string;
  memberName:          string;
  walletId:            string;
  amount:              number;
  reason:              string;
  paymentMode:         string;
  walletBalanceBefore?: number;
  walletBalanceAfter?:  number;
  createdAt:           string;
}

interface CreateDebitInput {
  memberId?: string;
  amount?:   number | string;
  reason?:   string;
  paymentMode?: string;
  notes?: string;
}

interface ListDebitsInput {
  page: number; limit: number; search: string | null;
}

export async function listDebits(
  input: ListDebitsInput
): Promise<{ debitList: DebitRecord[]; total: number }> {
  const page  = Math.max(1, input.page);
  const limit = Math.min(Math.max(1, input.limit), PAGINATION.MAX_LIMIT);
  const skip  = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (input.search) {
    const safe = input.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matchingMembers = await Member.find({
      isDeleted: false, fullName: { $regex: safe, $options: "i" },
    }).select("_id");
    filter.memberId = { $in: matchingMembers.map((m) => m._id) };
  }

  const [debits, total] = await Promise.all([
    Debit.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Debit.countDocuments(filter),
  ]);

  const memberIds = debits.map((d) => d.memberId);
  const members   = await Member.find({ _id: { $in: memberIds } });
  const memberMap = new Map(members.map((m) => [m._id.toString(), m.fullName]));
  const debitIds = debits.map((d) => d._id);
  const transactions = await Transaction.find({ debitId: { $in: debitIds } });
  const transactionMap = new Map(transactions.map((t) => [t.debitId?.toString(), t]));

  return {
    debitList: debits.map((d) => {
      const transaction = transactionMap.get(d._id.toString());

      return {
        id:         d._id.toString(),
        memberId:   d.memberId.toString(),
        memberName: memberMap.get(d.memberId.toString()) ?? "Unknown",
        walletId:   d.walletId.toString(),
        amount:     d.amount,
        reason:     d.reason,
        paymentMode: d.paymentMode,
        walletBalanceBefore: transaction?.balanceBefore,
        walletBalanceAfter:  transaction?.balanceAfter,
        createdAt:  d.createdAt.toISOString(),
      };
    }),
    total,
  };
}

export async function createDebit(
  input: CreateDebitInput,
  actorId: string
): Promise<DebitRecord> {
  const errors: FieldError[] = [];
  if (!input.memberId?.trim()) errors.push({ field: "memberId", message: "Please select a member." });
  const amount = Number(input.amount);
  if (!input.amount || isNaN(amount) || amount <= 0) {
    errors.push({ field: "amount", message: "Amount must be greater than zero." });
  }
  if (!input.reason?.trim()) errors.push({ field: "reason", message: "Reason is required." });
  if (errors.length > 0) throw new AppError("Validation failed.", 400, errors);

  if (!mongoose.Types.ObjectId.isValid(input.memberId!)) throw new AppError("Invalid member ID.", 400);

  const member = await Member.findOne({ _id: input.memberId, isDeleted: false });
  if (!member) throw new AppError("Member not found.", 404);
  if (member.status !== RECORD_STATUS.ACTIVE) throw new AppError("Member account is not active.", 400);

  const wallet = await Wallet.findOne({ memberId: input.memberId });
  if (!wallet) throw new AppError("Wallet not found.", 404);
  if (wallet.status !== RECORD_STATUS.ACTIVE) throw new AppError("Wallet is not active.", 400);

  const activeCard = await Card.findOne({
    memberId: input.memberId,
    status: CARD_STATUS.ACTIVE,
    expiresAt: { $gt: new Date() },
  });
  if (!activeCard) {
    throw new AppError("Member must have an active card before debit.", 400, [
      { field: "memberId", message: "Assign an active card to this member first." },
    ]);
  }

  if (wallet.currentBalance < amount) {
    throw new AppError(
      `Insufficient wallet balance. Current balance: ₹${wallet.currentBalance.toLocaleString("en-IN")}`,
      400,
      [{ field: "amount", message: `Maximum deductible: ₹${wallet.currentBalance.toLocaleString("en-IN")}` }]
    );
  }

  const actorOid  = new mongoose.Types.ObjectId(actorId);
  const memberOid = new mongoose.Types.ObjectId(input.memberId);

  // Started on whichever connection (demo or production) this request's
  // model calls will resolve to — see startDbSession() in src/lib/db.ts.
  const session = await startDbSession();
  try {
    session.startTransaction();

    // Conditional update: only deducts if currentBalance >= amount (race condition guard)
    const updatedWallet = await Wallet.findOneAndUpdate(
      { _id: wallet._id, currentBalance: { $gte: amount } },
      { $inc: { currentBalance: -amount }, updatedBy: actorOid },
      { session, new: true }
    );
    if (!updatedWallet) {
      throw new AppError("Insufficient wallet balance.", 400, [
        { field: "amount", message: "Balance insufficient (concurrent update detected)." },
      ]);
    }

    const balanceAfter  = updatedWallet.currentBalance;
    const balanceBefore = balanceAfter + amount;

    const [debit] = await Debit.create(
      [{
        memberId:  memberOid,
        walletId:  wallet._id,
        cardId:    activeCard._id,
        amount,
        reason:    input.reason!.trim(),
        paymentMode: input.paymentMode ?? PAYMENT_MODES.CASH,
        notes:     input.notes?.trim() ?? "",
        createdBy: actorOid,
      }],
      { session, ordered: true }
    );

    // Transaction model: balanceBefore/balanceAfter (not walletBalance...)
    // No referenceId/referenceModel on Transaction model
    await Transaction.create(
      [{
        memberId:     memberOid,
        walletId:     wallet._id,
        type:         TRANSACTION_TYPES.DEBIT,
        amount,
        balanceBefore,  // ← was walletBalanceBefore
        balanceAfter,   // ← was walletBalanceAfter
        debitId:      debit._id,
        createdBy:    actorOid,
      }],
      { session, ordered: true }
    );

    await session.commitTransaction();

    return {
      id:                  debit._id.toString(),
      memberId:            memberOid.toString(),
      memberName:          member.fullName,
      walletId:            wallet._id.toString(),
      amount,
      reason:              debit.reason,
      paymentMode:         debit.paymentMode,
      walletBalanceBefore: balanceBefore,
      walletBalanceAfter:  balanceAfter,
      createdAt:           debit.createdAt.toISOString(),
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
