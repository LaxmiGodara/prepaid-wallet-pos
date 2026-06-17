"use client";

import {
  Badge,
  Button,
  PageHeader,
  SectionCard,
  getRoleVariant,
} from "@/components/ui";
import { useAuthSession } from "@/hooks/useAuthSession";
import { APP_NAME } from "@/lib/constants";

export default function DashboardContent() {
  const { session, isVerifying, logout } = useAuthSession();

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3">
          <span className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
          </span>
          <span className="text-sm text-slate-400">
            Verifying session...
          </span>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto p-8 flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        subtitle={APP_NAME}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void logout()}
          >
            Logout
          </Button>
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
            <p className="text-sm text-slate-500">
              @{session.staff.username}
            </p>
          </div>

          <div className="ml-auto">
            <Badge
              label={session.staff.role}
              variant={getRoleVariant(session.staff.role)}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Day 8 Verification">
        <ul className="text-sm text-slate-600 flex flex-col gap-2">
          <li> Token verified server-side via GET /api/auth/me</li>
          <li> Staff status confirmed Active in the database</li>
          <li>
             tokenVersion matched - session has not been invalidated
          </li>
          <li>
             Logout button calls POST /api/auth/logout and increments
            tokenVersion
          </li>
        </ul>
      </SectionCard>

      <p className="text-center text-xs text-slate-400">
        Full sidebar navigation and module switching build on Day 11.
      </p>
    </div>
  );
}