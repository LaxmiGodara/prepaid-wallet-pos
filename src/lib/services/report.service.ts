
import mongoose from "mongoose";
import { Bill, Member, Recharge } from "@/lib/models";

export interface DailySummaryRow {
  date: string;
  rechargeCount:  number;
  rechargeTotal:  number;
  billCount:      number;
  billTotal:      number;
  netFlow:        number; // rechargeTotal - billTotal
}

export interface ReportSummary {
  totalRecharges: number;
  totalRechargeAmount: number;
  totalBills: number;
  totalBillAmount: number;
  netFlow: number;
  daily: DailySummaryRow[];
}

export interface TopMemberRow {
  memberId: string;
  memberName: string;
  totalSpent: number;
  billCount: number;
}

// ── getDailySummary ───────────────────────────────────────────────────────────
// Returns daily recharge and billing summary for a date range.
// Uses two parallel aggregation pipelines, then merges by date.

export async function getDailySummary(
  from: Date,
  to: Date
): Promise<ReportSummary> {
  // ── Recharge Aggregation ──────────────────────────────────────────────────
  // $dateToString converts the Date field to a "YYYY-MM-DD" string.
  // This becomes the _id, so every document on the same day collapses into one row.
  const rechargeAgg = Recharge.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    {
      $group: {
        _id:   { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // ── Bill Aggregation ──────────────────────────────────────────────────────
  const billAgg = Bill.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    {
      $group: {
        _id:   { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        total: { $sum: "$totalAmount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Run both pipelines in parallel
  const [rechargeResult, billResult] = await Promise.all([rechargeAgg, billAgg]);

  // Build maps by date for O(1) merge
  const rechargeMap = new Map(rechargeResult.map((r: { _id: string; total: number; count: number }) => [r._id, r]));
  const billMap     = new Map(billResult.map((b: { _id: string; total: number; count: number })     => [b._id, b]));

  // Collect all unique dates from both results
  const allDates = Array.from(new Set([...rechargeMap.keys(), ...billMap.keys()])).sort();

  const daily: DailySummaryRow[] = allDates.map((date) => {
    const r = rechargeMap.get(date) as { total: number; count: number } | undefined;
    const b = billMap.get(date)     as { total: number; count: number } | undefined;
    return {
      date,
      rechargeCount: r?.count ?? 0,
      rechargeTotal: r?.total ?? 0,
      billCount:     b?.count ?? 0,
      billTotal:     b?.total ?? 0,
      netFlow:       (r?.total ?? 0) - (b?.total ?? 0),
    };
  });

  const totalRechargeAmount = daily.reduce((sum, d) => sum + d.rechargeTotal, 0);
  const totalBillAmount     = daily.reduce((sum, d) => sum + d.billTotal,     0);

  return {
    totalRecharges:      daily.reduce((sum, d) => sum + d.rechargeCount, 0),
    totalRechargeAmount,
    totalBills:          daily.reduce((sum, d) => sum + d.billCount, 0),
    totalBillAmount,
    netFlow:             totalRechargeAmount - totalBillAmount,
    daily,
  };
}

// ── getTopMembers ─────────────────────────────────────────────────────────────

// Replace the getTopMembers function:
export async function getTopMembers(
  from: Date,
  to: Date
): Promise<TopMemberRow[]> {
  // Type the aggregation result so $in query gets ObjectId[], not unknown[]
  interface TopMemberAgg {
    _id: mongoose.Types.ObjectId;
    totalSpent: number;
    billCount: number;
  }

  const result = await Bill.aggregate<TopMemberAgg>([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    {
      $group: {
        _id:        "$memberId",
        totalSpent: { $sum: "$totalAmount" },
        billCount:  { $sum: 1 },
      },
    },
    { $sort: { totalSpent: -1 } },
    { $limit: 10 },
  ]);

  if (result.length === 0) return [];

  const memberIds = result.map((r) => r._id);  // ← now ObjectId[], not unknown[]
  const members   = await Member.find({ _id: { $in: memberIds } });
  const memberMap = new Map(members.map((m) => [m._id.toString(), m.fullName]));

  return result.map((r) => ({
    memberId:   r._id.toString(),
    memberName: memberMap.get(r._id.toString()) ?? "Unknown",
    totalSpent: r.totalSpent,
    billCount:  r.billCount,
  }));
}