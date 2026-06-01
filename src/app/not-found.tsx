

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
};

export default function NotFoundPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center max-w-md px-6">

        {/* 404 number */}
        <p className="text-8xl font-bold text-slate-200">404</p>

        {/* Message */}
        <h1 className="text-xl font-semibold text-slate-700 mt-4">
          Page not found
        </h1>
        <p className="text-slate-400 text-sm mt-2">
          The page you are looking for does not exist or has been moved.
        </p>

        {/* Navigation */}
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Go back home
        </Link>

      </div>
    </main>
  );
}