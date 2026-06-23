import type { Metadata } from "next";
import ModulePlaceholder from "@/components/layout/ModulePlaceholder";

export const metadata: Metadata = { title: "Wallets" };

export default function WalletsPage() {
  return (
    <ModulePlaceholder
      title="Wallets"
      description="View and manage member wallet balances and status."
      comingOn="Day 23"
    />
  );
}
