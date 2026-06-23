import type { Metadata } from "next";
import ModulePlaceholder from "@/components/layout/ModulePlaceholder";

export const metadata: Metadata = { title: "Recharges" };

export default function RechargesPage() {
  return (
    <ModulePlaceholder
      title="Recharges"
      description="Add credit to member wallets via cash, UPI, or card payment."
      comingOn="Day 26"
    />
  );
}
