

import type { Metadata } from "next";
import { APP_NAME, APP_VERSION } from "@/lib/constants";

export const metadata: Metadata = {
  title: "System Status",
};

export default function RootPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center max-w-md px-6">

        {/* Brand badge */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white font-bold text-xl mb-6">
          POS
        </div>

        {/* App name and version */}
        <h1 className="text-2xl font-bold text-slate-800">{APP_NAME}</h1>
        <p className="text-slate-400 text-sm mt-1">Version {APP_VERSION}</p>

        {/* Status indicator */}
        <div className="mt-8 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-slate-500">System is online</span>
        </div>

        {/* Health check link */}
        <div className="mt-6">
          
         <a href="/api/health"
            className="text-xs text-blue-500 hover:text-blue-600 underline underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            View API Health Check →
          </a>
        </div>

      </div>
    </main>
  );
}