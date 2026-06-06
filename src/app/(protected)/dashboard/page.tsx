import type { Metadata } from "next";

import {
  Badge,
  Button,
  PageHeader,
  SectionCard,
  getStatusVariant,
  getRoleVariant,
  Input,
} from "@/components/ui";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Dashboard",
};

const SAMPLE_BADGES = [
  { label: "Active", variant: getStatusVariant("Active") },
  { label: "Inactive", variant: getStatusVariant("Inactive") },
  { label: "Replaced", variant: getStatusVariant("Replaced") },
  { label: "Expired", variant: getStatusVariant("Expired") },
  { label: "Confirmed", variant: getStatusVariant("Confirmed") },
  { label: "Voided", variant: getStatusVariant("Voided") },
];

const ROLE_BADGES = [
  { label: "Super Admin", variant: getRoleVariant("Super Admin") },
  { label: "Admin", variant: getRoleVariant("Admin") },
  { label: "Cashier", variant: getRoleVariant("Cashier") },
];

export default function DashboardPage() {
  return (
    // Temporary layout - replaced by full sidebar shell on Day 11
    <div className="max-w-4xl mx-auto p-8 flex flex-col gap-6">
      {/* Page header */}
      <PageHeader
        title="Dashboard"
        subtitle={APP_NAME}
        actions={
          <Button variant="secondary" size="sm">
            Logout
          </Button>
        }
      />

      {/* Component showcase - verifies all components render correctly */}
      <SectionCard title="UI Component Preview">
        <div className="flex flex-col gap-6">
          {/* Buttons */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Buttons
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="primary" isLoading>
                Loading
              </Button>
              <Button variant="primary" disabled>
                Disabled
              </Button>
            </div>
          </div>

          {/* Status badges */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Status Badges
            </p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_BADGES.map((badge) => (
                <Badge
                  key={badge.label}
                  label={badge.label}
                  variant={badge.variant}
                />
              ))}
            </div>
          </div>

          {/* Role badges */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Role Badges
            </p>
            <div className="flex flex-wrap gap-2">
              {ROLE_BADGES.map((badge) => (
                <Badge
                  key={badge.label}
                  label={badge.label}
                  variant={badge.variant}
                />
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Input showcase */}
      <SectionCard title="Input States">
        <div className="grid grid-cols-2 gap-6">
          <Input label="Normal Input" placeholder="Type something..." />
          <Input
            label="Required Input"
            placeholder="This field is required"
            required
          />
          <Input
            label="Input with Hint"
            placeholder="Enter username"
            hint="Lowercase letters and numbers only."
          />
          <Input
            label="Input with Error"
            placeholder="Enter username"
            value="ab"
            error="Username must be at least 3 characters."
          />
          <Input
            label="Disabled Input"
            placeholder="Cannot be edited"
            disabled
          />
          <Input label="Read-Only Input" value="read-only value" readOnly />
        </div>
      </SectionCard>

      {/* Status note */}
      <div className="text-center">
        <Badge label="Day 5 Components Verified" variant="success" />
        <p className="text-xs text-slate-400 mt-2">
          Full dashboard with sidebar navigation builds on Day 11
        </p>
      </div>
    </div>
  );
}
