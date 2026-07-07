import { PAGINATION } from "@/lib/constants";
import { Member, Transaction } from "@/lib/models";

export interface TransactionRecord {
  id: string;
  memberId: string;
  memberName: string;
  type: string;
  amount: number;
  walletBalanceBefore: number;
  walletBalanceAfter: number;
  referenceModel: string;
  referenceId: string;
  createdAt: string;
}

interface ListTransactionsInput {
  page: number;
  limit: number;
  search: string | null;
  type: string | null;
}

function getTransactionReference(t: InstanceType<typeof Transaction>): { referenceModel: string; referenceId: string } {
  if (t.rechargeId) return { referenceModel: "Recharge", referenceId: t.rechargeId.toString() };
  if (t.billId) return { referenceModel: "Bill", referenceId: t.billId.toString() };
  if (t.debitId) return { referenceModel: "Debit", referenceId: t.debitId.toString() };
  return { referenceModel: "Wallet", referenceId: "" };
}

export async function listTransactions(
  input: ListTransactionsInput
): Promise<{ transactionList: TransactionRecord[]; total: number }> {
  const page  = Math.max(1, input.page);
  const limit = Math.min(Math.max(1, input.limit), PAGINATION.MAX_LIMIT);
  const skip  = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (input.type) filter.type = input.type;

  if (input.search) {
    const safe = input.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matchingMembers = await Member.find({
      isDeleted: false,
      fullName: { $regex: safe, $options: "i" },
    }).select("_id");
    filter.memberId = { $in: matchingMembers.map((m) => m._id) };
  }

  const [transactions, total] = await Promise.all([
    Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Transaction.countDocuments(filter),
  ]);

  const memberIds = transactions.map((t) => t.memberId);
  const members   = await Member.find({ _id: { $in: memberIds } });
  const memberMap = new Map(members.map((m) => [m._id.toString(), m.fullName]));

  const transactionList: TransactionRecord[] = transactions.map((t) => {
    const reference = getTransactionReference(t);

    return {
      id:                  t._id.toString(),
      memberId:            t.memberId.toString(),
      memberName:          memberMap.get(t.memberId.toString()) ?? "Unknown",
      type:                t.type,
      amount:              t.amount,
      walletBalanceBefore: t.balanceBefore,
      walletBalanceAfter:  t.balanceAfter,
      referenceModel:      reference.referenceModel,
      referenceId:         reference.referenceId,
      createdAt:           t.createdAt.toISOString(),
    };
  });

  return { transactionList, total };
}
