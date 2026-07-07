import type { Metadata } from "next";
import TransactionsContent from "./_components/TransactionsContent";

export const metadata: Metadata = { title: "Transactions" };
export default function TransactionsPage() { return <TransactionsContent />; }

