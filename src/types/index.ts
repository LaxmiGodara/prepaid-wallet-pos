// src/types/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Global TypeScript types and interfaces shared across the entire app.
//
// WHY THIS FILE EXISTS:
// Every API Route Handler returns a response. Every frontend component reads
// that response. If each file defines its own response shape differently,
// nothing is predictable. This file defines the standard response shape once.
// Every route and every component imports from here and gets the same contract.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Standard API Response ───────────────────────────────────────────────────
// This is the shape of every single API response in the system.
// success: whether the request worked or not
// message: human-readable description of what happened
// data: the actual result - a generic type T so it can hold any shape
// meta: pagination information for list responses
// errors: field-level validation error messages

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
  meta: PaginationMeta | null;
  errors: FieldError[] | null;
}

// ─── Pagination Meta ─────────────────────────────────────────────────────────
// Included in list responses so the frontend knows how many pages exist.

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Field Error ─────────────────────────────────────────────────────────────
// A single validation error tied to a specific form field.
// field: which input failed (e.g. "username", "amount")
// message: what was wrong (e.g. "Username must be at least 3 characters")

export interface FieldError {
  field: string;
  message: string;
}

// ─── App Error ───────────────────────────────────────────────────────────────
// Custom error class with HTTP status code and structured errors.
// Thrown from service functions and caught in Route Handlers.

export class AppError extends Error {
  statusCode: number;
  errors: FieldError[];

  constructor(message: string, statusCode: number, errors: FieldError[] = []) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

// ─── Auth Types ──────────────────────────────────────────────────────────────
// Shape of the decoded JWT token payload.
// This is what we read from the token when verifying a session.

export interface JwtPayload {
  staffId: string;
  role: string;
  username: string;
  tokenVersion: number;
  // Present and true only for tokens issued by the /api/auth/demo-login
  // route. Read by requireAuth() to flip AsyncLocalStorage demo context for
  // the rest of the request (see src/lib/demo-context.ts) so every model
  // call transparently targets the isolated demo database instead of
  // production. Absent/false for every normal login.
  isDemo?: boolean;
}

// ─── Session Data ────────────────────────────────────────────────────────────
// What the client caches (in localStorage, for a fast initial paint) after a
// successful login. This deliberately does NOT include the JWT itself — the
// token lives only in an httpOnly cookie set by the server (see
// src/lib/auth-cookie.ts) and is never readable by client-side JavaScript.
// This cache is a UI convenience, not a credential.

export interface SessionData {
  staff: {
    id: string;
    fullName: string;
    username: string;
    role: string;
    status: string;
    // True only when this session was created via the "Explore Demo"
    // button. Drives the "Demo Mode" badge and dashboard banner.
    isDemo?: boolean;
  };
}

// ─── Issued Session ──────────────────────────────────────────────────────────
// Server-internal shape returned by loginStaff/changeOwnPassword: it carries
// the raw JWT so the route handler can set it as an httpOnly cookie via
// setAuthCookie(). This type must never be sent to the client as JSON — route
// handlers deliberately destructure `{ staff }` out of it for the response
// body and pass `token` only to setAuthCookie(). See src/lib/auth-cookie.ts.

export interface IssuedSession {
  token: string;
  staff: SessionData["staff"];
}
