// src/components/ui/PageHeader.tsx
// Page header shown at the top of every protected page.
// Contains the page title, optional subtitle, and optional action buttons.

import React from "react";

// ─── Props Interface ──────────────────────────────────────────────────────────

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PageHeader({
  title,
  subtitle,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      {/* Title and subtitle group */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-text)] font-display">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {/* Actions slot - primary and secondary action buttons */}
      {actions && (
        <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>
      )}
    </div>
  );
}
