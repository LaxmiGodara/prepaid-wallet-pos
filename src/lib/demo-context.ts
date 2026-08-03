import { AsyncLocalStorage } from "node:async_hooks";

// ─── Demo Mode request context ──────────────────────────────────────────────
// Demo Mode needs every model call made during a demo-authenticated request
// (Staff.findOne, Member.create, Wallet.findOneAndUpdate, ...) to transparently
// hit the demo database instead of production, WITHOUT changing the ~15
// service files or ~30 API routes that call those models today.
//
// AsyncLocalStorage lets us stash "this request is a demo request" once, at
// the top of the request (inside requireAuth, right after the JWT is
// decoded), and have it be readable from anywhere further down the same
// async call chain — including the demo-aware model proxies in
// src/lib/models/index.ts — with no extra parameters anywhere in between.
//
// We use `enterWith()` rather than `run(callback)` deliberately: `run()`
// would only propagate the context to code called *synchronously inside*
// that same call, which does not include whatever the calling API route
// does after `await requireAuth(request)` resolves. `enterWith()` instead
// attaches the store to the current async execution and lets it flow
// through the rest of that request's awaits, which is exactly the
// call-requireAuth-then-keep-going shape every route handler already uses.
// This is safe per-request here because each Next.js route handler
// invocation is its own top-level async operation — there is no shared,
// long-lived synchronous context that a later, unrelated request could leak
// into.

interface DemoRequestStore {
  isDemo: boolean;
}

const demoStorage = new AsyncLocalStorage<DemoRequestStore>();

/**
 * Marks the rest of the current request as a Demo Mode request (or
 * explicitly not one). Call this exactly once, as early as possible —
 * normally from requireAuth() right after the JWT payload is decoded.
 */
export function enterDemoContext(isDemo: boolean): void {
  demoStorage.enterWith({ isDemo });
}

/**
 * Whether the current async call chain is running inside a Demo Mode
 * request. Defaults to false for any code path that never went through
 * enterDemoContext() (public routes, background scripts, tests, etc.) —
 * i.e. the safe default is always "use production."
 */
export function isDemoRequest(): boolean {
  return demoStorage.getStore()?.isDemo ?? false;
}
