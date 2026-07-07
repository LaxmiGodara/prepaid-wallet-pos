import type { Metadata } from "next";
import BillingContent from "./_components/BillingContent";
export const metadata: Metadata = { title: "Billing" };
export default function BillingPage() { return <BillingContent />; }