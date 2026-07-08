"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  clearSession,
  getAuthorizationHeader,
  getSession,
  saveSession,
} from "@/lib/auth-storage";
import type { SessionData } from "@/types";

interface UseAuthSessionResult {
  session: SessionData | null;
  isVerifying: boolean;
  logout: () => Promise<void>;
}

export function useAuthSession(): UseAuthSessionResult {
  const router = useRouter();

  const [session, setSession] = useState<SessionData | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function verifySession(): Promise<void> {
      const stored = getSession();

      if (!stored?.token) {
        if (isMounted) setIsVerifying(false);
        router.replace("/login");
        return;
      }

      if (isMounted) {
        setSession(stored);
        setIsVerifying(false);
      }

      try {
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${stored.token}`,
          },
        });

        if (!response.ok) {
          clearSession();
          if (isMounted) router.replace("/login");
          return;
        }

        const result = await response.json();

        const freshSession: SessionData = {
          token: stored.token,
          staff: result.data,
        };

        saveSession(freshSession);

        if (isMounted) setSession(freshSession);
      } catch {
        if (isMounted) setSession(stored);
      }
    }

    void verifySession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const logout = useCallback(async (): Promise<void> => {
    const authHeader = getAuthorizationHeader();

    try {
      if (authHeader) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: authHeader,
          },
        });
      }
    } catch {
    } finally {
      clearSession();
      setSession(null);
      router.replace("/login");
    }
  }, [router]);

  return {
    session,
    isVerifying,
    logout,
  };
}
