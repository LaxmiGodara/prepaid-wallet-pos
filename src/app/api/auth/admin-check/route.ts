import { type NextRequest, NextResponse } from "next/server";

import { buildSuccessResponse } from "@/lib/api-response";
import { requireAuth, requireRole } from "@/lib/auth-middleware";
import { STAFF_ROLES } from "@/lib/constants";
import { validateRuntimeConfig } from "@/lib/config";
import { connectDB } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    validateRuntimeConfig();
    await connectDB();

    const staff = await requireAuth(request);

    requireRole(staff, [STAFF_ROLES.SUPER_ADMIN, STAFF_ROLES.ADMIN]);

    return NextResponse.json(
      buildSuccessResponse("You have Admin-level access.", {
        role: staff.role,
      }),
      { status: 200 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
