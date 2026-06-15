

import { type NextRequest, NextResponse } from "next/server";

import { buildSuccessResponse } from "@/lib/api-response";
import { validateRuntimeConfig } from "@/lib/config";
import { connectDB } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { loginStaff } from "@/lib/services/auth.service";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Config and DB checks run before any database operation
    validateRuntimeConfig();
    await connectDB();

    // Parse the request body - throws if body is invalid JSON
    const body = await request.json();

    // All credential verification and token creation lives in the service
    const sessionData = await loginStaff(body);

    // 200 OK - authentication was successful
    // Note: some APIs use 201 for login but 200 is more semantically correct
    // (we are not creating a permanent resource - just issuing a token)
    return NextResponse.json(
      buildSuccessResponse("Login successful. Welcome back.", sessionData),
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}