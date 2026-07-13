
import type { SessionData } from "@/types";

const SESSION_KEY = "prepaid-wallet-session";




export function saveSession(data: SessionData): void {
  // Guard: do nothing if running on the server
  if (typeof window === "undefined") return;

  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}


// Called on every page load to check if a session exists.
// Returns the parsed SessionData or null if no session is stored.
//
// try/catch around JSON.parse:
// If localStorage contains corrupted data (manually edited, old format),
// JSON.parse throws a SyntaxError. We catch it and clear the corrupted data.

export function getSession(): SessionData | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    // Corrupted or unrecognisable data - clear it so it does not cause future errors
    clearSession();
    return null;
  }
}


// Called on logout.
// Removes only the session key, not the entire localStorage.
// Other applications or libraries may also use localStorage on the same domain.

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}



// getAuthorizationHeader() previously returned a `Bearer <token>` header built
// from the token in localStorage. Auth now flows entirely through the
// httpOnly cookie set by the server (see src/lib/auth-cookie.ts), which the
// browser attaches to every same-origin request automatically — no client-
// side header is needed or possible, since client JS can no longer read the
// token at all.
//
// This function is kept (returning null) rather than removed so the ~15
// call sites across the app that do
//   const auth = getAuthorizationHeader();
//   fetch(url, { headers: auth ? { Authorization: auth } : {} })
// keep working unchanged — they now simply send no Authorization header,
// and the request is authenticated by the cookie instead. Cleaning up those
// call sites to drop the dead header logic entirely is tracked as follow-up
// work (see README "Security notes"), not done in this pass to avoid a wide,
// low-value mechanical diff across every module page.

export function getAuthorizationHeader(): string | null {
  return null;
}