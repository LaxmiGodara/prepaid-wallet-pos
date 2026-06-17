import { type NextRequest, NextResponse } from "next/server";

import { buildSuccessResponse } from "@/lib/api-response";
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

    return NextResponse.json(
      buildSuccessResponse("Logged out successfully.", null),
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}