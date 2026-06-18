

import { type NextRequest, NextResponse } from "next/server";

import { buildSuccessResponse } from "@/lib/api-response";
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

    return NextResponse.json(
      buildSuccessResponse("Password updated successfully.", sessionData),
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}