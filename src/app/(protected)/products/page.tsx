import type { Metadata } from "next";
import ProductsContent from "./_components/ProductsContent";
export const metadata: Metadata = { title: "Products" };
export default function ProductsPage() {
  return <ProductsContent />;
}
