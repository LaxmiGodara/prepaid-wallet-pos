

import { type NextRequest, NextResponse } from "next/server";

import { buildSuccessResponse } from "@/lib/api-response";
import { setAuthCookie } from "@/lib/auth-cookie";
import { requireAuth } from "@/lib/auth-middleware";
import { validateRuntimeConfig } from "@/lib/config";
import { connectDB } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { changeOwnPassword } from "@/lib/services/auth.service";

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    validateRuntimeConfig();
    await connectDB();

    const { staffId } = await requireAuth(request);
    const body = await request.json();

    const sessionData = await changeOwnPassword(staffId, body);

    // Changing the password bumps tokenVersion, which invalidates the JWT
    // in the caller's existing cookie. Without reissuing the cookie here,
    // the very next request would fail with "Session has been invalidated"
    // immediately after a successful password change. The raw token is
    // deliberately left out of the JSON body — same rule as /api/auth/login
    // — so it's never readable by client-side JavaScript.
    const response = NextResponse.json(
      buildSuccessResponse("Password updated successfully.", {
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