
import { type NextRequest, NextResponse } from "next/server";

import { buildSuccessResponse } from "@/lib/api-response";
import { requireAuth, requireRole } from "@/lib/auth-middleware";
import { validateRuntimeConfig } from "@/lib/config";
import { STAFF_ROLES } from "@/lib/constants";
import { connectDB } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { getMembersStats } from "@/lib/services/member.service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    validateRuntimeConfig();
    await connectDB();

    const actor = await requireAuth(request);
    requireRole(actor, [STAFF_ROLES.SUPER_ADMIN, STAFF_ROLES.ADMIN]);

    const stats = await getMembersStats();

    return NextResponse.json(
      buildSuccessResponse("Member stats fetched successfully.", stats),
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}