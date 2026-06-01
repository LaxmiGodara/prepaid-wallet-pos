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
}

// ─── Session Data ────────────────────────────────────────────────────────────
// What we store in browser localStorage after a successful login.

export interface SessionData {
  token: string;
  staff: {
    id: string;
    fullName: string;
    username: string;
    role: string;
    status: string;
  };
}
