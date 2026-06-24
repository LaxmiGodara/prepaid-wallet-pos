

import type { Metadata } from "next";

import StaffContent from "./_components/StaffContent";

export const metadata: Metadata = {
  title: "Staff",
};

export default function StaffPage() {
  return <StaffContent />;
}