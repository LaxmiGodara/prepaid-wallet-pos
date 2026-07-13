"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  IdCard,
  CreditCard,
  Wallet,
  RefreshCcw,
  ArrowDownCircle,
  Package,
  Receipt,
  ArrowLeftRight,
  Boxes,
  BarChart3,
  UserCircle,
  LogOut,
  type LucideIcon,
} from "lucide-react";

import { Badge, getRoleVariant } from "@/components/ui";
import { useSession } from "@/contexts/SessionContext";
import { APP_NAME } from "@/lib/constants";
import { NAV_ITEMS } from "@/lib/navigation";

const NAV_ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/staff": Users,
  "/members": IdCard,
  "/cards": CreditCard,
  "/wallets": Wallet,
  "/recharges": RefreshCcw,
  "/debits": ArrowDownCircle,
  "/products": Package,
  "/billing": Receipt,
  "/transactions": ArrowLeftRight,
  "/stock": Boxes,
  "/reports": BarChart3,
};

export default function Sidebar() {
  const { session, logout, hasRole } = useSession();
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === href || pathname.startsWith(href + "/");
  }

  const visibleNavItems = NAV_ITEMS.filter((item) =>
    hasRole(item.allowedRoles),
  );

  return (
    <aside
      className="flex flex-col h-screen text-white overflow-y-auto"
      style={{
        background:
          "linear-gradient(180deg, var(--color-ink) 0%, var(--color-ink-soft) 100%)",
        borderRight: "1px solid var(--color-ink-line)",
      }}
    >
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3 mb-5">
          <span
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl font-bold text-[11px] tracking-widest flex-shrink-0"
            style={{
              background:
                "linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-strong) 100%)",
              color: "#14100a",
            }}
          >
            POS
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight font-display">
              {APP_NAME}
            </p>
            <p className="text-xs text-white/40 leading-tight mt-0.5">
              Billing System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5 border border-white/5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0"
            style={{
              background: "var(--color-accent-soft)",
              color: "var(--color-accent-strong)",
            }}
          >
            {session.staff.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate leading-tight">
              {session.staff.fullName}
            </p>
            <div className="mt-0.5">
              <Badge
                label={session.staff.role}
                variant={getRoleVariant(session.staff.role)}
              />
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 pb-3">
        <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider px-2 mb-2">
          Modules
        </p>

        <ul className="flex flex-col gap-0.5">
          {visibleNavItems.map((item) => {
            const active = isActive(item.href);
            const Icon = NAV_ICONS[item.href] ?? LayoutDashboard;

            return (
              <li key={item.href} className="relative">
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full"
                    style={{ background: "var(--color-accent)" }}
                  />
                )}
                <Link
                  href={item.href}
                  className={[
                    "flex items-center gap-2.5 pl-4 pr-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-white/10 text-white"
                      : "text-white/50 hover:text-white hover:bg-white/5",
                  ].join(" ")}
                >
                  <Icon
                    size={17}
                    strokeWidth={2}
                    className={active ? "text-[var(--color-accent)]" : ""}
                  />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        className="px-3 pb-5 pt-3"
        style={{ borderTop: "1px solid var(--color-ink-line)" }}
      >
        <Link
          href="/account"
          className={[
            "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 mb-1",
            isActive("/account")
              ? "bg-white/10 text-white"
              : "text-white/50 hover:text-white hover:bg-white/5",
          ].join(" ")}
        >
          <UserCircle size={17} strokeWidth={2} />
          My Account
        </Link>

        <button
          type="button"
          onClick={() => void logout()}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
        >
          <LogOut size={17} strokeWidth={2} />
          Logout
        </button>
      </div>
    </aside>
  );
}
