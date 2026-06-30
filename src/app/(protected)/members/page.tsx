

import type { Metadata } from "next";

import MembersContent from "./_components/MembersContent";

export const metadata: Metadata = {
  title: "Members",
};

export default function MembersPage() {
  return <MembersContent />;
}