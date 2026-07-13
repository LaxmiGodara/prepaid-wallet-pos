// ─── Rate limiting ───────────────────────────────────────────────────────────
// A minimal in-memory, fixed-window rate limiter. It exists to close the most
// obvious gap for a financial app: /api/auth/login and /api/auth/setup had no
// throttling at all, making credential-stuffing/brute-force trivial against
// an unlimited login endpoint.
//
// IMPORTANT LIMITATION — read before relying on this in a real deployment:
// this counter lives in a plain in-memory Map, scoped to a single Node.js
// process. That's fine for a single-instance deployment (e.g. one Vercel
// serverless function staying warm, or a single traditional server process),
// but it does NOT share state across multiple instances/regions/cold starts.
// On a horizontally-scaled or serverless-per-request deployment, each
// instance gets its own counter, which weakens (but doesn't eliminate) the
// protection. For production at scale, replace this with a shared store —
// Upstash Redis + @upstash/ratelimit is the standard choice for Vercel
// deployments — while keeping the same checkRateLimit() call sites.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodically forget old buckets so this Map can't grow unbounded over the
// life of a long-running process. Cheap and safe to run on every check.
function pruneExpired(now: number): void {
  if (buckets.size < 5000) return; // only bother once it's actually large
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

// key: something like `login:<ip>` — callers namespace their own keys so
// different endpoints don't share a budget.
// limit: max requests allowed within windowMs.
// windowMs: fixed window size in milliseconds.
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  pruneExpired(now);

  const existing = buckets.get(key);

  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

// Best-effort client IP extraction. Behind a proxy/CDN (Vercel, nginx, etc.)
// the real client IP arrives in x-forwarded-for; we take the first (left-
// most, i.e. original client) entry. Falls back to "unknown" so callers can
// still rate-limit (pooling all unidentified clients together) rather than
// skipping the check entirely when the header is missing.
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}
