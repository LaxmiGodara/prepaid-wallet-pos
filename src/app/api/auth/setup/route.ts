import { type NextRequest, NextResponse } from "next/server";

import { buildSuccessResponse } from "@/lib/api-response";
import { validateRuntimeConfig } from "@/lib/config";
import { connectDB } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { createSuperAdmin } from "@/lib/services/auth.service";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    validateRuntimeConfig();
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
