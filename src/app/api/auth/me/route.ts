import { type NextRequest, NextResponse } from "next/server";

import { buildSuccessResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-middleware";
import { validateRuntimeConfig } from "@/lib/config";
import { connectDB } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { getCurrentStaff } from "@/lib/services/auth.service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    validateRuntimeConfig();
    await connectDB();

    const { staffId } = await requireAuth(request);

    const profile = await getCurrentStaff(staffId);

    return NextResponse.json(
      buildSuccessResponse("Staff profile fetched successfully.", profile),
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}