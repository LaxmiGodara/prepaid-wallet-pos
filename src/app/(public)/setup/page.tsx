// src/app/(public)/setup/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Server component wrapper for the setup page.
//
// WHY THIS FILE IS A SERVER COMPONENT:
// Metadata (page title, description) can only be exported from server components.
// Interactive form logic requires "use client".
// You cannot have both in the same file.
//
// SOLUTION: This server component exports metadata and renders SetupForm,
// which is a client component that handles all the interactive logic.
//
// This is the standard Next.js pattern for pages that need both
// metadata AND client-side interactivity.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";

import SetupForm from "./_components/SetupForm";

export const metadata: Metadata = {
  title: "First-Time Setup",
};

// This server component has one job: render the client component
// All form logic, state, and API calls live in SetupForm
export default function SetupPage() {
  return <SetupForm />;
}