import type { NextConfig } from "next";

// ─── Security headers ───────────────────────────────────────────────────────
// This POS/billing app has zero security headers configured by default. The
// ones below are the well-understood, low-risk baseline that costs nothing
// functionally:
//   - X-Frame-Options / frame-ancestors: stops the app being embedded in an
//     <iframe> on another site (clickjacking a "Debit ₹500" button is a real
//     risk for a POS UI).
//   - X-Content-Type-Options: stops the browser from guessing/"sniffing" a
//     response's MIME type, closing a class of content-sniffing XSS.
//   - Referrer-Policy: avoids leaking full internal URLs (which could
//     contain member/bill IDs) to third-party sites via the Referer header.
//   - Strict-Transport-Security: tells browsers to only ever use HTTPS for
//     this origin, once it's actually served over HTTPS (harmless over local
//     HTTP dev, since browsers ignore HSTS on non-HTTPS responses).
//
// A full Content-Security-Policy is intentionally NOT included here — a
// correct CSP requires enumerating every real script/style/font/image
// source this app actually uses, and shipping a wrong/too-strict one breaks
// the app silently. That's tracked as follow-up work (see README "Security
// notes") rather than guessed at here.

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
