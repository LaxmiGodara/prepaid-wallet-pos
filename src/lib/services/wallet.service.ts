import mongoose from "mongoose";

import { PAGINATION, RECORD_STATUS } from "@/lib/constants";
import { Member, Wallet } from "@/lib/models";
import { AppError } from "@/types";

export interface WalletRecord {
  id: string;
  memberId: string;
  memberName: string;
  currentBalance: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletsSummary {
  totalBalance: number;
  activeCount: number;
  inactiveCount: number;
}

// ─── getWalletsSummary ──────────────────────────────────────────────────────
// Aggregates the total value currently held across all member wallets, plus
// a breakdown of active vs. inactive wallet counts. Used by the dashboard to
// give the business owner a live "money in wallets" figure.

export async function getWalletsSummary(): Promise<WalletsSummary> {
  const [totals, activeCount] = await Promise.all([
    Wallet.aggregate<{ _id: null; totalBalance: number }>([
      { $group: { _id: null, totalBalance: { $sum: "$currentBalance" } } },
    ]),
    Wallet.countDocuments({ status: RECORD_STATUS.ACTIVE }),
  ]);

  const totalWallets = await Wallet.countDocuments({});

  return {
    totalBalance: totals[0]?.totalBalance ?? 0,
    activeCount,
    inactiveCount: totalWallets - activeCount,
  };
}

interface ListWalletsInput {
  page: number;
  limit: number;
  search: string | null;
  status: string | null;
}

export async function listWallets(
  input: ListWalletsInput
): Promise<{ walletList: WalletRecord[]; total: number }> {
  const page  = Math.max(1, input.page);
  const limit = Math.min(Math.max(1, input.limit), PAGINATION.MAX_LIMIT);
  const skip  = (page - 1) * limit;

  // If search is provided, find matching members first, then filter wallets by those memberIds
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walletFilter: Record<string, any> = {};
  if (input.status) walletFilter.status = input.status;

  if (input.search) {
    const safe = input.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matchingMembers = await Member.find({
      isDeleted: false,
      $or: [
        { fullName: { $regex: safe, $options: "i" } },
        { mobileNumber: { $regex: safe, $options: "i" } },
      ],
    }).select("_id");
    walletFilter.memberId = { $in: matchingMembers.map((m) => m._id) };
  }

  const [wallets, total] = await Promise.all([
    Wallet.find(walletFilter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Wallet.countDocuments(walletFilter),
  ]);

  const memberIds = wallets.map((w) => w.memberId);
  const members   = await Member.find({ _id: { $in: memberIds } });
  const memberMap = new Map(members.map((m) => [m._id.toString(), m.fullName]));

  const walletList: WalletRecord[] = wallets.map((w) => ({
    id:             w._id.toString(),
    memberId:       w.memberId.toString(),
    memberName:     memberMap.get(w.memberId.toString()) ?? "Unknown",
    currentBalance: w.currentBalance,
    status:         w.status,
    createdAt:      w.createdAt.toISOString(),
    updatedAt:      w.updatedAt.toISOString(),
  }));

  return { walletList, total };
}

export async function updateWalletStatus(
  walletId: string,
  actorId: string
): Promise<WalletRecord> {
  if (!mongoose.Types.ObjectId.isValid(walletId)) {
    throw new AppError("Invalid wallet ID.", 400);
  }

  const wallet = await Wallet.findById(walletId);
  if (!wallet) throw new AppError("Wallet not found.", 404);

  const newStatus =
    wallet.status === RECORD_STATUS.ACTIVE
      ? RECORD_STATUS.INACTIVE
      : RECORD_STATUS.ACTIVE;

  const updated = await Wallet.findByIdAndUpdate(
    walletId,
    { status: newStatus, updatedBy: new mongoose.Types.ObjectId(actorId) },
    { new: true }
  );
  if (!updated) throw new AppError("Wallet not found.", 404);

  const member = await Member.findById(updated.memberId);

  return {
    id:             updated._id.toString(),
    memberId:       updated.memberId.toString(),
    memberName:     member?.fullName ?? "Unknown",
    currentBalance: updated.currentBalance,
    status:         updated.status,
    createdAt:      updated.createdAt.toISOString(),
    updatedAt:      updated.updatedAt.toISOString(),
  };
}