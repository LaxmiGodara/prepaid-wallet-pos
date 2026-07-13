import { NextResponse, type NextRequest } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";

// ─── Route protection at the edge ───────────────────────────────────────────
// Every protected page previously relied entirely on a client-side check
// (SessionProvider → useAuthSession, running in a useEffect after mount) to
// redirect unauthenticated visitors to /login. That meant the protected
// page's JS bundle and initial shell were still served — and briefly
// rendered — to anyone who requested the URL directly, before the client-
// side redirect kicked in.
//
// This middleware runs before any of that, at the edge, and redirects on
// the *presence* of the auth cookie only — it does not verify the JWT's
// signature or expiry here. That's intentional: `jsonwebtoken`'s `verify()`
// needs Node's `crypto` module, and doing "real" verification on every
// request at the edge would mean either pulling in an edge-compatible JWT
// library or forcing this middleware onto the Node.js runtime. The actual,
// authoritative check — signature, expiry, tokenVersion, staff status —
// still happens in requireAuth() on every single API route, exactly as
// before. This middleware is a UX/defense-in-depth improvement (no more
// flash of protected content, no more protected HTML shipped to a crawler
// with no cookie at all), not a replacement for server-side auth.

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/staff",
  "/members",
  "/cards",
  "/wallets",
  "/recharges",
  "/debits",
  "/products",
  "/billing",
  "/transactions",
  "/stock",
  "/reports",
  "/account",
];

const AUTH_ONLY_PAGES = ["/login", "/setup"];

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const isAuthenticated = Boolean(
    request.cookies.get(AUTH_COOKIE_NAME)?.value,
  );

  const isProtectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Signed-in users hitting /login or /setup get sent straight to the
  // dashboard instead of seeing a login form they don't need.
  if (AUTH_ONLY_PAGES.includes(pathname) && isAuthenticated) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/staff/:path*",
    "/members/:path*",
    "/cards/:path*",
    "/wallets/:path*",
    "/recharges/:path*",
    "/debits/:path*",
    "/products/:path*",
    "/billing/:path*",
    "/transactions/:path*",
    "/stock/:path*",
    "/reports/:path*",
    "/account/:path*",
    "/login",
    "/setup",
  ],
};
