"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { clearSession, getSession, saveSession } from "@/lib/auth-storage";
import type { SessionData } from "@/types";

interface UseAuthSessionResult {
  session: SessionData | null;
  isVerifying: boolean;
  logout: () => Promise<void>;
}

// The JWT lives only in an httpOnly cookie now, so the browser attaches it to
// same-origin requests automatically — we never build an Authorization header
// here. `getSession()` is only a cached copy of the *staff profile* (not a
// credential) used to paint the UI instantly on load while we re-verify the
// real session against the server in the background.

export function useAuthSession(): UseAuthSessionResult {
  const router = useRouter();

  const [session, setSession] = useState<SessionData | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function verifySession(): Promise<void> {
      const cached = getSession();

      if (cached && isMounted) {
        setSession(cached);
        setIsVerifying(false);
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch("/api/auth/me", {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          clearSession();
          if (isMounted) {
            setSession(null);
            setIsVerifying(false);
          }
          router.replace("/login");
          return;
        }

        const result = await response.json();
        const freshSession: SessionData = { staff: result.data };

        saveSession(freshSession);

        if (isMounted) {
          setSession(freshSession);
          setIsVerifying(false);
        }
      } catch {
        // Network hiccup, not an auth failure. If we already have a cached
        // profile on screen, leave it there rather than bouncing the user to
        // /login for a connectivity blip. If we have nothing cached, we
        // genuinely can't confirm the session, so send them to log in.
        if (!cached && isMounted) {
          setIsVerifying(false);
          router.replace("/login");
        }
      }
    }

    void verifySession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      // No Authorization header to attach — the cookie identifies the
      // session, and the server clears it via Set-Cookie on this response.
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Best-effort: even if the network call fails, clear local state below
      // so the UI doesn't strand the user in a logged-in-looking screen.
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
