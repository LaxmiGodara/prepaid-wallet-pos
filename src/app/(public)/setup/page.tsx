// src/app/(public)/setup/page.tsx
// First-time setup page - styled placeholder using real UI components.
// API connection and submission logic added on Day 6.

import type { Metadata } from "next";

import { Button, Input, SectionCard } from "@/components/ui";

export const metadata: Metadata = {
  title: "First-Time Setup",
};

export default function SetupPage() {
  return (
    <div className="w-full max-w-md">
      <SectionCard title="Create Super Admin Account">
        {/* Setup description */}
        <p className="text-sm text-slate-500 mb-6">
          This step runs only once. The account created here becomes the system
          administrator with full control.
        </p>

        <form className="flex flex-col gap-5">
          {/* Full name */}
          <Input
            label="Full Name"
            name="fullName"
            type="text"
            placeholder="Enter your full name"
            required
          />

          {/* Username */}
          <Input
            label="Username"
            name="username"
            type="text"
            placeholder="Choose a username (min 3 characters)"
            hint="Use lowercase letters and numbers only. This cannot be changed later."
            required
          />

          {/* Password fields side by side */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="Min 8 characters"
              required
            />
            <Input
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              placeholder="Repeat password"
              required
            />
          </div>

          {/* Submit */}
          <Button type="submit" variant="primary" size="lg" fullWidth>
            Create Account
          </Button>
        </form>
      </SectionCard>

      <p className="text-center text-xs text-slate-400 mt-4">
        API connection added on Day 6
      </p>
    </div>
  );
}
