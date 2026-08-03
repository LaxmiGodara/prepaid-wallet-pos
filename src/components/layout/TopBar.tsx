"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Sparkles, UserCircle } from "lucide-react";

import { useSession } from "@/contexts/SessionContext";

export default function TopBar() {
  const { session, logout } = useSession();
  const pathname = usePathname();
  const isAccountActive = pathname === "/account";

  return (
    <header
      className="flex items-center justify-end gap-2 px-6 py-3 border-b"
      style={{
        borderColor: "var(--color-line)",
        background: "var(--color-surface)",
      }}
    >
      {session.staff.isDemo && (
        <span
          title="You are exploring a demonstration version. All changes are limited to demo data."
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-200 cursor-default"
        >
          Demo Mode
        </span>
      )}

      <Link
        href="/account"
        className={[
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150",
          isAccountActive
            ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]"
            : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-paper)]",
        ].join(" ")}
      >
        <UserCircle size={16} strokeWidth={2} />
        My Account
      </Link>

      <button
        type="button"
        onClick={() => void logout()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 transition-colors duration-150"
      >
        <LogOut size={16} strokeWidth={2} />
        Logout
      </button>
    </header>
  );
}
