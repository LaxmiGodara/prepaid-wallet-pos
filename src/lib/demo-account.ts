import { AppError } from "@/types";

// ─── Reserved demo credentials ──────────────────────────────────────────────
// These are read server-side only, inside /api/auth/demo-login and the demo
// seeding routine. They are never sent to the browser: the "Explore Demo"
// button calls an endpoint that takes no username/password from the client
// at all — it authenticates using these on the server, exactly like a
// normal login, and only the resulting httpOnly cookie ever reaches the
// browser (see setAuthCookie in src/lib/auth-cookie.ts).
//
// Override DEMO_USER_USERNAME / DEMO_USER_PASSWORD in your deployment's
// environment variables if you want different reserved credentials; the
// defaults below match what's in the .env.example comments and only matter
// for a fresh, unseeded demo database (see demo-seed.service.ts).
export const DEMO_USER_USERNAME = (
  process.env.DEMO_USER_USERNAME ?? "demo"
)
  .trim()
  .toLowerCase();

export const DEMO_USER_PASSWORD = process.env.DEMO_USER_PASSWORD ?? "demo123";

export const DEMO_USER_FULL_NAME = "Demo Recruiter";

/**
 * Guards the single reserved demo account from actions that would break
 * Demo Mode for every future visitor — changing its password or turning it
 * off would lock everyone out of "Explore Demo" until someone reseeds it.
 * Everything else (Members, Wallets, Bills, other Staff accounts the demo
 * user creates, ...) remains fully editable, matching a real user.
 */
export function assertNotReservedDemoAccount(
  username: string,
  action: string,
): void {
  if (username.trim().toLowerCase() === DEMO_USER_USERNAME) {
    throw new AppError(
      `The reserved demo account can't ${action}. It needs to stay usable ` +
        "for the next person who clicks \"Explore Demo.\"",
      403,
    );
  }
}
