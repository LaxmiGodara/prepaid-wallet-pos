import type { Metadata } from "next";
import WalletsContent from "./_components/WalletsContent";

export const metadata: Metadata = { title: "Wallets" };
export default function WalletsPage() { return <WalletsContent />; }