"use client";

import { createContext, useContext } from "react";

import { useAuthSession } from "@/hooks/useAuthSession";
import type { SessionData } from "@/types";

interface SessionContextValue {
  // session.staff is guaranteed to exist for any component reading this -
  // SessionProvider never renders children unless verification succeeded.
  session: SessionData;

  logout: () => Promise<void>;

  // Returns true if the current staff's role is in the provided list.
  hasRole: (allowedRoles: string[]) => boolean;
}

// Default value is null - this lets useSession() detect when it is
// called outside a Provider and throw a clear error instead of crashing
// later with a confusing "cannot read property of null" deep in a page.
const SessionContext = createContext<SessionContextValue | null>(null);

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const { session, isVerifying, logout } = useAuthSession();

  // Shown once, here, instead of separately on every page.
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3">
          <span className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
          </span>
          <span className="text-sm text-slate-400">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const verifiedSession = session;

  function hasRole(allowedRoles: string[]): boolean {
    return allowedRoles.includes(verifiedSession.staff.role);
  }

  return (
    <SessionContext.Provider
      value={{ session: verifiedSession, logout, hasRole }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error(
      "useSession must be used inside a <SessionProvider>. " +
        "Check that this component is rendered inside src/app/(protected)/layout.tsx.",
    );
  }

  return context;
}
