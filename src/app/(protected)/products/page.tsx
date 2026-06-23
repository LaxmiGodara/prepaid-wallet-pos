import type { Metadata } from "next";
import ModulePlaceholder from "@/components/layout/ModulePlaceholder";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return (
    <ModulePlaceholder
      title="Products"
      description="Set up products available for billing at the counter."
      comingOn="Day 31"
    />
  );
}
