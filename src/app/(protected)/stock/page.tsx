import type { Metadata } from "next";
import ModulePlaceholder from "@/components/layout/ModulePlaceholder";

export const metadata: Metadata = { title: "Stock" };

export default function StockPage() {
  return (
    <ModulePlaceholder
      title="Stock"
      description="Track product inventory levels and record stock movements."
      comingOn="Day 32"
    />
  );
}
