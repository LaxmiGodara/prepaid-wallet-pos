"use client";

import Link from "next/link";
import { Badge, SectionCard, getRoleVariant } from "@/components/ui";
import { useSession } from "@/contexts/SessionContext";
import { NAV_ITEMS } from "@/lib/navigation";

export default function DashboardContent() {
  const { session, hasRole } = useSession();

  const accessibleModules = NAV_ITEMS.filter((item) =>
    hasRole(item.allowedRoles),
  );

  return (
    <div className="p-6 flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Welcome back, {session.staff.fullName.split(" ")[0]}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Here is your system overview.
        </p>
      </div>

      <SectionCard title="Your Account">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
            {session.staff.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-800">
              {session.staff.fullName}
            </p>
            <p className="text-sm text-slate-500">@{session.staff.username}</p>
          </div>
          <div className="ml-auto">
            <Badge
              label={session.staff.role}
              variant={getRoleVariant(session.staff.role)}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Your Modules">
        <p className="text-sm text-slate-500 mb-4">
          You have access to {accessibleModules.length} module
          {accessibleModules.length !== 1 ? "s" : ""}.
        </p>

        <div className="grid grid-cols-3 gap-3">
          {accessibleModules.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-all duration-150 group"
            >
              <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">
                {item.label}
              </span>
              <span className="text-slate-300 group-hover:text-blue-400 text-lg leading-none">
                →
              </span>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
