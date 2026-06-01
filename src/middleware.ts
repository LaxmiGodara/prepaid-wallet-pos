import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// middleware runs on every request matching the config.matcher pattern below.
// For now it simply passes every request through unchanged.
export function middleware(request: NextRequest): NextResponse {
  // Pass the request through without modification.
  // Route protection logic will be added here on Day 9.
  return NextResponse.next();
}

// config.matcher defines which URLs this middleware runs on.
// Excluding static files and API health check keeps performance optimal.
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Public files in /public
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
