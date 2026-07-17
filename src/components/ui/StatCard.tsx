// src/components/ui/StatCard.tsx
// Compact KPI card used on the dashboard and inside modules (Members, Stock, ...)
// to surface a single business figure with an icon and optional trend/tone.

import React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type StatTone = "neutral" | "positive" | "negative" | "warning";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: StatTone;
  hint?: string;
  className?: string;
  // Optional destination — when set, the whole card becomes a link to the
  // module the figure came from (e.g. "Active Members" → /members), so a
  // business-overview number acts as a shortcut instead of a dead end.
  href?: string;
}

const toneStyles: Record<StatTone, { fg: string; bg: string }> = {
  neutral: { fg: "var(--color-text)", bg: "var(--color-accent-soft)" },
  positive: { fg: "#1f7a4d", bg: "#e3f3ea" },
  negative: { fg: "#b8412f", bg: "#fbe8e4" },
  warning: { fg: "var(--color-accent-strong)", bg: "var(--color-accent-soft)" },
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  hint,
  className = "",
  href,
}: StatCardProps) {
  const { fg, bg } = toneStyles[tone];

  const content = (
    <>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 truncate">
          {label}
        </p>
        <p
          className="text-2xl font-bold font-price leading-tight"
          style={{ color: fg === "var(--color-text)" ? undefined : fg }}
        >
          {value}
        </p>
        {hint && (
          <p className="text-xs text-[var(--color-text-muted)] mt-1">{hint}</p>
        )}
      </div>

      {Icon && (
        <span
          className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
          style={{ background: bg, color: fg }}
        >
          <Icon size={18} strokeWidth={2} />
        </span>
      )}
    </>
  );

  const cardClassName = `bg-[var(--color-surface)] rounded-2xl border border-[var(--color-line)] px-5 py-4 flex items-start justify-between gap-3 hover:shadow-[0_4px_14px_rgba(20,16,10,0.06)] hover:-translate-y-0.5 transition-all duration-200 ${href ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2" : ""} ${className}`;

  if (href) {
    return (
      <Link href={href} className={cardClassName}>
        {content}
      </Link>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}

