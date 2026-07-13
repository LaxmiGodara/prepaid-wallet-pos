

import { type NextRequest, NextResponse } from "next/server";

import { buildErrorResponse, buildSuccessResponse } from "@/lib/api-response";
import { setAuthCookie } from "@/lib/auth-cookie";
import { validateRuntimeConfig } from "@/lib/config";
import { connectDB } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { loginStaff } from "@/lib/services/auth.service";

// 10 attempts per 15 minutes per IP. Generous enough that a real user who
// mistypes their password a few times is never affected, tight enough to
// make brute-forcing a password impractical (10 guesses / 15 min caps an
// attacker at 960/day against a single IP, versus effectively unlimited).
const LOGIN_RATE_LIMIT = 10;
const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Config and DB checks run before any database operation
    validateRuntimeConfig();

    const clientIp = getClientIp(request);
    const { allowed, retryAfterSeconds } = checkRateLimit(
      `login:${clientIp}`,
      LOGIN_RATE_LIMIT,
      LOGIN_RATE_WINDOW_MS,
    );

    if (!allowed) {
      return NextResponse.json(
        buildErrorResponse(
          "Too many login attempts. Please wait a few minutes and try again.",
        ),
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds) },
        },
      );
    }

    await connectDB();

    // Parse the request body - throws if body is invalid JSON
    const body = await request.json();

    // All credential verification and token creation lives in the service
    const sessionData = await loginStaff(body);

    // 200 OK - authentication was successful
    // Note: some APIs use 201 for login but 200 is more semantically correct
    // (we are not creating a permanent resource - just issuing a token)
    //
    // The JWT itself is set as an httpOnly cookie below and deliberately left
    // out of the JSON body — client-side JS (Session context, forms) never
    // sees or stores the raw token, only the `staff` profile.
    const response = NextResponse.json(
      buildSuccessResponse("Login successful. Welcome back.", {
        staff: sessionData.staff,
      }),
      { status: 200 },
    );

    setAuthCookie(response, sessionData.token);

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}