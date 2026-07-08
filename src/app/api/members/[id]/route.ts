import { type NextRequest, NextResponse } from "next/server";

import { buildSuccessResponse } from "@/lib/api-response";
import { requireAuth, requireRole } from "@/lib/auth-middleware";
import { validateRuntimeConfig } from "@/lib/config";
import { STAFF_ROLES } from "@/lib/constants";
import { connectDB } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { getMemberDetail, updateMember } from "@/lib/services/member.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    validateRuntimeConfig();
    await connectDB();

    const actor = await requireAuth(request);
    requireRole(actor, [STAFF_ROLES.SUPER_ADMIN, STAFF_ROLES.ADMIN]);

    const { id } = await params;
    const detail = await getMemberDetail(id);

    return NextResponse.json(
      buildSuccessResponse("Member detail fetched successfully.", detail),
      { status: 200 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

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
    const updated = await updateMember(id, body, actor.staffId);

    return NextResponse.json(
      buildSuccessResponse("Member updated successfully.", updated),
      { status: 200 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
