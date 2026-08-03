import { type NextRequest, NextResponse } from "next/server";

import { buildSuccessResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-middleware";
import { validateRuntimeConfig } from "@/lib/config";
import { connectDB } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { getCurrentStaff, updateOwnProfile } from "@/lib/services/auth.service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    validateRuntimeConfig();
    await connectDB();

    const { staffId, isDemo } = await requireAuth(request);
    const profile = await getCurrentStaff(staffId);

    return NextResponse.json(
      buildSuccessResponse("Staff profile fetched successfully.", {
        ...profile,
        isDemo,
      }),
      { status: 200 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    validateRuntimeConfig();
    await connectDB();

    const { staffId } = await requireAuth(request);
    const body = await request.json();

    const profile = await updateOwnProfile(staffId, body);

    return NextResponse.json(
      buildSuccessResponse("Profile updated successfully.", profile),
      { status: 200 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
