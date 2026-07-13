import type { NextResponse } from "next/server";

// ─── Auth cookie ─────────────────────────────────────────────────────────────
// The JWT now lives in an httpOnly cookie instead of localStorage, so client-
// side JavaScript (and therefore an XSS payload) can never read it. See
// README.md "Security notes" for the full rationale.

export const AUTH_COOKIE_NAME = "prepaid_wallet_token";

// Matches the default JWT_EXPIRES_IN ("8h"). If you change JWT_EXPIRES_IN,
// update this too — an expired-but-still-present cookie is harmless (the
// server rejects the expired JWT via jwt.verify), but keeping them roughly in
// sync avoids the cookie outliving the token by a confusing amount.
const COOKIE_MAX_AGE_SECONDS = 8 * 60 * 60;

export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // "strict" is intentionally stronger than the usual "lax" default: this
    // is an internal admin/POS tool with no legitimate cross-site linking
    // use case, so there's no UX cost to blocking the cookie on cross-site
    // requests entirely. This alone meaningfully mitigates classic CSRF for
    // the mutating (POST/PATCH) endpoints; a double-submit CSRF token would
    // be additional defense-in-depth but isn't implemented yet (see README).
    sameSite: "strict",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
