import { type NextRequest, NextResponse } from "next/server";

import { buildSuccessResponse } from "@/lib/api-response";
import { requireAuth, requireRole } from "@/lib/auth-middleware";
import { validateRuntimeConfig } from "@/lib/config";
import { STAFF_ROLES } from "@/lib/constants";
import { connectDB } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { resetStaffPassword } from "@/lib/services/staff.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    validateRuntimeConfig();
    await connectDB();

    const actor = await requireAuth(request);
    requireRole(actor, [STAFF_ROLES.SUPER_ADMIN, STAFF_ROLES.ADMIN]);

    const { id } = await params;
    const body = await request.json();

    const updated = await resetStaffPassword(
      id,
      body,
      actor.staffId,
      actor.role,
    );

    return NextResponse.json(
      buildSuccessResponse(
        `Password for ${updated.fullName} has been reset successfully. They must log in with the new password.`,
        updated,
      ),
      { status: 200 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
