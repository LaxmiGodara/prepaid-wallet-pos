import { type NextRequest, NextResponse } from "next/server";

import { buildErrorResponse, buildSuccessResponse } from "@/lib/api-response";
import { setAuthCookie } from "@/lib/auth-cookie";
import { validateRuntimeConfig } from "@/lib/config";
import {
  DEMO_USER_PASSWORD,
  DEMO_USER_USERNAME,
} from "@/lib/demo-account";
import { enterDemoContext } from "@/lib/demo-context";
import { connectDemoDB } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { loginStaff } from "@/lib/services/auth.service";
import { seedDemoDatabaseIfNeeded } from "@/lib/services/demo-seed.service";

// Same shape as the real login endpoint's throttle — "Explore Demo" is a
// single button with no credentials to guess, but it still triggers a
// bcrypt compare and a DB round trip per click, so it's worth capping.
const DEMO_LOGIN_RATE_LIMIT = 20;
const DEMO_LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    validateRuntimeConfig();

    const clientIp = getClientIp(request);
    const { allowed, retryAfterSeconds } = checkRateLimit(
      `demo-login:${clientIp}`,
      DEMO_LOGIN_RATE_LIMIT,
      DEMO_LOGIN_RATE_WINDOW_MS,
    );

    if (!allowed) {
      return NextResponse.json(
        buildErrorResponse(
          "Too many demo login attempts. Please wait a few minutes and try again.",
        ),
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds) },
        },
      );
    }

    // Every model call from here on (inside loginStaff, and inside
    // seedDemoDatabaseIfNeeded below) is routed to the demo database by
    // this one call — see src/lib/demo-context.ts and
    // src/lib/models/index.ts.
    enterDemoContext(true);
    await connectDemoDB();

    // No credentials are read from the request at all: the client never
    // sends or sees a username/password for this account. This is exactly
    // "authenticate internally without revealing credentials."
    const demoCredentials = {
      username: DEMO_USER_USERNAME,
      password: DEMO_USER_PASSWORD,
    };

    let sessionData;
    try {
      // Reuses the *exact* existing authentication service — same bcrypt
      // verification, same JWT signing, same IssuedSession shape as a real
      // login. Nothing about credential handling is duplicated here.
      sessionData = await loginStaff(demoCredentials, { isDemo: true });
    } catch {
      // First-ever demo login on a fresh deploy: the demo database has no
      // Staff document yet, so loginStaff() reports "invalid credentials."
      // Seed the demo database on the fly and retry once, so a recruiter
      // never has to know a seeding step exists.
      await seedDemoDatabaseIfNeeded();
      sessionData = await loginStaff(demoCredentials, { isDemo: true });
    }

    const response = NextResponse.json(
      buildSuccessResponse(
        "Demo login successful. Explore away — nothing here touches production data.",
        { staff: sessionData.staff },
      ),
      { status: 200 },
    );

    setAuthCookie(response, sessionData.token);

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
