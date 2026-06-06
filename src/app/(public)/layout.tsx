// src/app/(public)/layout.tsx
// Layout for all public-facing pages: /login and /setup.
// Renders a dark left panel (brand + navigation) and a light right panel (page content).
// "use client" is required because usePathname reads the current URL in the browser.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

import { APP_NAME } from "@/lib/constants";

// ─── Props ────────────────────────────────────────────────────────────────────

interface PublicLayoutProps {
  children: React.ReactNode;
}

// ─── Navigation Links ─────────────────────────────────────────────────────────
// Defines the links shown in the left panel.
// More links (or fewer) will be controlled by setup state from Day 6 onwards.

const NAV_LINKS = [
  { href: "/login", label: "Staff Login" },
  { href: "/setup", label: "First-Time Setup" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PublicLayout({ children }: PublicLayoutProps) {
  // usePathname reads the current browser URL path.
  // Example: "/login", "/setup"
  const pathname = usePathname();

  return (
    // Outer grid: left panel fixed width, right panel fills remaining space
    <div className="min-h-screen grid grid-cols-[420px_1fr]">
      {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
      <aside className="flex flex-col justify-between p-10 bg-slate-900">
        {/* Brand section */}
        <div>
          {/* POS Badge */}
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-sm tracking-widest mb-6">
            POS
          </div>

          {/* App name */}
          <h1 className="text-2xl font-bold text-white leading-tight">
            {APP_NAME}
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Prepaid wallet billing system
          </p>
        </div>

        {/* Navigation links */}
        <nav className="flex flex-col gap-2">
          {NAV_LINKS.map((link) => {
            // Determine if this link is the currently active page
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  "px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-150 border",
                  isActive
                    ? "bg-white/10 text-white border-white/20" // active style
                    : "text-slate-400 border-transparent hover:text-white hover:bg-white/5", // inactive style
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer note */}
        <p className="text-slate-600 text-xs">
          &copy; {new Date().getFullYear()} {APP_NAME}
        </p>
      </aside>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────── */}
      {/* Centers the page content both horizontally and vertically */}
      <main className="flex items-center justify-center p-10 bg-slate-50">
        {children}
      </main>
    </div>
  );
}
