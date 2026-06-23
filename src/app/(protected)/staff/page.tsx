// src/app/(protected)/staff/page.tsx
// Placeholder - Staff Management module builds from Day 12.

import type { Metadata } from "next";
import ModulePlaceholder from "@/components/layout/ModulePlaceholder";

export const metadata: Metadata = { title: "Staff" };

export default function StaffPage() {
  return (
    <ModulePlaceholder
      title="Staff Management"
      description="Create and manage staff accounts with role-based access control."
      comingOn="Day 12"
    />
  );
}