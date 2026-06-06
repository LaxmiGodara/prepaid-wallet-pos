// src/components/ui/Badge.tsx
// Displays a coloured pill badge for statuses, roles, and labels.
// Used in data tables and detail views across all modules.

import React from "react";

// ─── Props Interface ──────────────────────────────────────────────────────────

// Variant maps to a colour scheme
// success  → green  (Active status)
// danger   → red    (Inactive status, errors)
// warning  → amber  (Expired, warnings)
// info     → blue   (informational)
// neutral  → grey   (Replaced, default/unknown)
// purple   → purple (Super Admin role)
// teal     → teal   (Cashier role)

export type BadgeVariant =
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "neutral"
  | "purple"
  | "teal";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

// ─── Variant Style Map ────────────────────────────────────────────────────────

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-green-100 text-green-800",
  danger:  "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-800",
  info:    "bg-blue-100 text-blue-800",
  neutral: "bg-slate-100 text-slate-600",
  purple:  "bg-purple-100 text-purple-800",
  teal:    "bg-teal-100 text-teal-800",
};

// ─── Helper: Map common values to variants automatically ──────────────────────
// Centralises the label-to-variant logic so it is consistent everywhere.

export function getStatusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    Active:     "success",
    Inactive:   "danger",
    Replaced:   "neutral",
    Expired:    "warning",
    Confirmed:  "success",
    Voided:     "danger",
  };
  return map[status] ?? "neutral";
}

export function getRoleVariant(role: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    "Super Admin": "purple",
    Admin:         "info",
    Cashier:       "teal",
  };
  return map[role] ?? "neutral";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Badge({ label, variant = "neutral" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variantStyles[variant]}`}
    >
      {label}
    </span>
  );
}