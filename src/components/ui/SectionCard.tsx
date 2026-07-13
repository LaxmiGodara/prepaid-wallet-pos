// src/components/ui/SectionCard.tsx
// Container component used on every page to group related content.
// Provides a white card with optional title and optional action buttons slot.

import React from "react";

// ─── Props Interface ──────────────────────────────────────────────────────────

interface SectionCardProps {
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode; // buttons or links placed in the card header
  className?: string;
  noPadding?: boolean; // disables body padding for full-bleed content (tables)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SectionCard({
  title,
  children,
  actions,
  className = "",
  noPadding = false,
}: SectionCardProps) {
  const hasHeader = title || actions;

  return (
    <div
      className={`bg-[var(--color-surface)] rounded-2xl border border-[var(--color-line)] shadow-[0_1px_2px_rgba(20,16,10,0.04)] ${className}`}
    >
      {/* Card header - only renders when title or actions are provided */}
      {hasHeader && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-line)]">
          {/* Title slot - empty span preserves flex layout when no title */}
          {title ? (
            <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--color-text-muted)]">
              {title}
            </h2>
          ) : (
            <span />
          )}

          {/* Actions slot - any ReactNode (buttons, links) */}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Card body */}
      <div className={noPadding ? "" : "p-6"}>{children}</div>
    </div>
  );
}
