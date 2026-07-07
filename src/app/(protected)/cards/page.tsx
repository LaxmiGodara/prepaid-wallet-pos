import type { Metadata } from "next";
import CardsContent from "./_components/CardsContent";

export const metadata: Metadata = { title: "Cards" };
export default function CardsPage() { return <CardsContent />; }