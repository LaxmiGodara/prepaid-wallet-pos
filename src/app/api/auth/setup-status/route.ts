import { NextResponse } from "next/server";

import { buildSuccessResponse } from "@/lib/api-response";
import { validateRuntimeConfig } from "@/lib/config";
import { connectDB } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { getSetupStatus } from "@/lib/services/auth.service";

export async function GET(): Promise<NextResponse> {
  try {
    // Validate config and connect DB before any database operation
    validateRuntimeConfig();
    await connectDB();

    // Delegate to service - route handler has no business logic
    const data = await getSetupStatus();

    return NextResponse.json(
      buildSuccessResponse("Setup status fetched successfully.", data),
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}