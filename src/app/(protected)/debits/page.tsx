import type { Metadata } from "next";
import ModulePlaceholder from "@/components/layout/ModulePlaceholder";

export const metadata: Metadata = { title: "Debits" };

export default function DebitsPage() {
  return (
    <ModulePlaceholder
      title="Debits"
      description="Process manual wallet deductions with justification and audit trail."
      comingOn="Day 28"
    />
  );
}
