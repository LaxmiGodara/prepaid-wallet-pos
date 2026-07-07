import type { Metadata } from "next";
import StockContent from "./_components/StockContent";
export const metadata: Metadata = { title: "Stock" };
export default function StockPage() { return <StockContent />; }