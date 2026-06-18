

"use client";

import { useRouter } from "next/navigation";

import { Badge, Button, PageHeader, SectionCard, getRoleVariant } from "@/components/ui";
import { useSession } from "@/contexts/SessionContext";
import { APP_NAME, STAFF_ROLES } from "@/lib/constants";

export default function DashboardContent() {
  const { session, logout, hasRole } = useSession();
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto p-8 flex flex-col gap-6">

      <PageHeader
        title="Dashboard"
        subtitle={APP_NAME}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push("/account")}
            >
              My Account
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void logout()}
            >
              Logout
            </Button>
          </>
        }
      />

      <SectionCard title="Session Verified">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
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

      {hasRole([STAFF_ROLES.SUPER_ADMIN, STAFF_ROLES.ADMIN]) && (
        <SectionCard title="Admin Tools">
          <p className="text-sm text-slate-500 mb-4">
            This panel is only visible to Admin and Super Admin roles.
            Staff management arrives in Week 3.
          </p>
          <Button variant="primary" size="sm" disabled>
            Manage Staff (coming Day 12)
          </Button>
        </SectionCard>
      )}

      <SectionCard title="Day 10 Verification">
        <ul className="text-sm text-slate-600 flex flex-col gap-2">
          <li> Profile updates sync instantly via updateSession()</li>
          <li> Password changes rotate the token via replaceSession()</li>
          <li> Current password required before any password change</li>
        </ul>
      </SectionCard>

      <p className="text-center text-xs text-slate-400">
        Full sidebar navigation and module switching build on Day 11.
      </p>

    </div>
  );
}