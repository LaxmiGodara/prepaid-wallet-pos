import type { Metadata } from "next";
import ModulePlaceholder from "@/components/layout/ModulePlaceholder";

export const metadata: Metadata = { title: "Transactions" };

export default function TransactionsPage() {
  return (
    <ModulePlaceholder
      title="Transactions"
      description="Complete wallet ledger with credit and debit history per member."
      comingOn="Day 30"
    />
  );
}
