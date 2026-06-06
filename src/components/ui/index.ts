// src/components/ui/index.ts
// Barrel export for all shared UI components.
// Import from "@/components/ui" instead of individual file paths.

export { default as Button } from "./Button";
export { default as Input } from "./Input";
export { default as Badge, getStatusVariant, getRoleVariant } from "./Badge";
export type { BadgeVariant } from "./Badge";
export { default as SectionCard } from "./SectionCard";
export { default as PageHeader } from "./PageHeader";
