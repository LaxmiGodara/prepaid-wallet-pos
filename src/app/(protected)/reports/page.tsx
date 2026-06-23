import type { Metadata } from "next";
import ModulePlaceholder from "@/components/layout/ModulePlaceholder";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <ModulePlaceholder
      title="Reports"
      description="Sales, recharge, stock, and transaction reports for management."
      comingOn="Day 38"
    />
  );
}
