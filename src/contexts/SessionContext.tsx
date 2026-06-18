

"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { useAuthSession } from "@/hooks/useAuthSession";
import { saveSession } from "@/lib/auth-storage";
import type { SessionData } from "@/types";



interface SessionContextValue {
  session: SessionData;
  logout: () => Promise<void>;
  hasRole: (allowedRoles: string[]) => boolean;


  updateSession: (updates: Partial<SessionData["staff"]>) => void;

  replaceSession: (newSession: SessionData) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);


interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const { session: verifiedSession, isVerifying, logout } = useAuthSession();


  const [localSession, setLocalSession] = useState<SessionData | null>(null);


  useEffect(() => {
    if (verifiedSession) {
      setLocalSession(verifiedSession);
    }
  }, [verifiedSession]);

  if (isVerifying || !localSession) {
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


  const activeSession = localSession;

  function hasRole(allowedRoles: string[]): boolean {
    return allowedRoles.includes(activeSession.staff.role);
  }


  function updateSession(updates: Partial<SessionData["staff"]>): void {
    const next: SessionData = {
      token: activeSession.token,
      staff: { ...activeSession.staff, ...updates },
    };
    saveSession(next);
    setLocalSession(next);
  }


  function replaceSession(newSession: SessionData): void {
    saveSession(newSession);
    setLocalSession(newSession);
  }

  return (
    <SessionContext.Provider
      value={{
        session: activeSession,
        logout,
        hasRole,
        updateSession,
        replaceSession,
      }}
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
        "Check that this component is rendered inside src/app/(protected)/layout.tsx."
    );
  }

  return context;
}