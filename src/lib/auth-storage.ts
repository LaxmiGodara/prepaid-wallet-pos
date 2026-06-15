
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



export function getAuthorizationHeader(): string | null {
  const session = getSession();
  if (!session?.token) return null;
  return `Bearer ${session.token}`;
}