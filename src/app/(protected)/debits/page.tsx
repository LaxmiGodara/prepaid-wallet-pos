import type { Metadata } from "next";
import DebitsContent from "./_components/DebitsContent";

export const metadata: Metadata = { title: "Debits" };
export default function DebitsPage() { return <DebitsContent />; }