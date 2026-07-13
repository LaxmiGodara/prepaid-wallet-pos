import { type NextRequest, NextResponse } from "next/server";

import { buildSuccessResponse } from "@/lib/api-response";
import { validateRuntimeConfig } from "@/lib/config";
import { connectDB } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createSuperAdmin } from "@/lib/services/auth.service";
import { AppError } from "@/types";

// Setup is a one-time, first-run action (creating the initial Super Admin),
// but the endpoint itself has no other gate before that first account
// exists, so it gets the same throttling treatment as login.
const SETUP_RATE_LIMIT = 5;
const SETUP_RATE_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    validateRuntimeConfig();

    const clientIp = getClientIp(request);
    const { allowed } = checkRateLimit(
      `setup:${clientIp}`,
      SETUP_RATE_LIMIT,
      SETUP_RATE_WINDOW_MS,
    );

    if (!allowed) {
      throw new AppError(
        "Too many attempts. Please wait a few minutes and try again.",
        429,
      );
    }

    await connectDB();

    // request.json() reads and parses the request body as JSON
    // This is an async operation - the body arrives as a stream
    const body = await request.json();

    // All validation and creation logic lives in the service
    // This route handler's only job is HTTP: parse body → call service → send response
    const staff = await createSuperAdmin(body);

    // 201 Created - a new resource was created successfully
    return NextResponse.json(
      buildSuccessResponse(
        "Super Admin account created successfully. Please log in.",
        staff,
      ),
      { status: 201 },
    );
  } catch (error) {
    // handleApiError handles AppError (validation/conflict) and unexpected errors
    return handleApiError(error);
  }
}
