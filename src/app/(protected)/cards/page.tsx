import type { Metadata } from "next";
import ModulePlaceholder from "@/components/layout/ModulePlaceholder";

export const metadata: Metadata = { title: "Cards" };

export default function CardsPage() {
  return (
    <ModulePlaceholder
      title="Cards"
      description="Assign and manage physical cards linked to member wallets."
      comingOn="Day 21"
    />
  );
}
