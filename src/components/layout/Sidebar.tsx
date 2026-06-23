"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge, getRoleVariant } from "@/components/ui";
import { useSession } from "@/contexts/SessionContext";
import { APP_NAME } from "@/lib/constants";
import { NAV_ITEMS } from "@/lib/navigation";

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
      className="flex flex-col h-screen bg-slate-900 text-white overflow-y-auto"
      style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3 mb-5">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600 text-white font-bold text-xs tracking-widest flex-shrink-0">
            POS
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">
              {APP_NAME}
            </p>
            <p className="text-xs text-slate-500 leading-tight mt-0.5">
              Billing System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-500/30 flex items-center justify-center text-blue-300 font-semibold text-sm flex-shrink-0">
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
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">
          Modules
        </p>

        <ul className="flex flex-col gap-0.5">
          {visibleNavItems.map((item) => {
            const active = isActive(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={[
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-blue-600/20 text-white border border-blue-500/30"
                      : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span>{item.label}</span>

                  {active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        className="px-3 pb-5 pt-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Link
          href="/account"
          className={[
            "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 mb-1",
            isActive("/account")
              ? "bg-blue-600/20 text-white border border-blue-500/30"
              : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          My Account
        </Link>

        <button
          type="button"
          onClick={() => void logout()}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent transition-all duration-150"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
