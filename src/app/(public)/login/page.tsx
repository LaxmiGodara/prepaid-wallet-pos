// src/app/(public)/login/page.tsx
// Login page - styled placeholder using real UI components.
// API connection and form logic added on Day 7.
// The visual structure and component composition are complete today.

import type { Metadata } from "next";

import { Button, Input, SectionCard } from "@/components/ui";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    // max-w-md constrains the card width so it looks good in the right panel
    <div className="w-full max-w-md">
      <SectionCard title="Sign In to your account">
        <form className="flex flex-col gap-5">
          {/* Username field */}
          <Input
            label="Username"
            name="username"
            type="text"
            placeholder="Enter your username"
            autoComplete="username"
            required
          />

          {/* Password field */}
          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />

          {/* Submit button - fullWidth makes it span the card width */}
          <Button type="submit" variant="primary" size="lg" fullWidth>
            Sign In
          </Button>
        </form>
      </SectionCard>

      {/* Note visible during development */}
      <p className="text-center text-xs text-slate-400 mt-4">
        API connection added on Day 7
      </p>
    </div>
  );
}
