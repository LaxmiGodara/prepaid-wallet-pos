import type { Metadata } from "next";
import ModulePlaceholder from "@/components/layout/ModulePlaceholder";

export const metadata: Metadata = { title: "Members" };

export default function MembersPage() {
  return (
    <ModulePlaceholder
      title="Members"
      description="Enrol and manage members linked to prepaid wallets."
      comingOn="Day 16"
    />
  );
}
