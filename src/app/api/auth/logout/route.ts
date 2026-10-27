import { type NextRequest, NextResponse } from "next/server";

import { buildSuccessResponse } from "@/lib/api-response";
import { clearAuthCookie } from "@/lib/auth-cookie";
import { requireAuth } from "@/lib/auth-middleware";
import { validateRuntimeConfig } from "@/lib/config";
import { connectDB } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { logoutStaff } from "@/lib/services/auth.service";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    validateRuntimeConfig();
    await connectDB();

    const { staffId } = await requireAuth(request);

    await logoutStaff(staffId);

    const response = NextResponse.json(
      buildSuccessResponse("Logged out successfully.", null),
      { status: 200 },
    );

    clearAuthCookie(response);

    return response;
  } catch (error) {
    // Even if the token is expired or invalid (so requireAuth throws), still
    // clear the cookie. Otherwise a dead cookie stays in the browser, the
    // proxy keeps treating the user as logged in, and they loop between
    // /login and /dashboard.
    const response = handleApiError(error);
    clearAuthCookie(response);
    return response;
  }
}