import { type NextRequest, NextResponse } from "next/server";

import { buildSuccessResponse } from "@/lib/api-response";
import { requireAuth, requireRole } from "@/lib/auth-middleware";
import { validateRuntimeConfig } from "@/lib/config";
import { PAGINATION, STAFF_ROLES } from "@/lib/constants";
import { connectDB } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { createStaff, listStaff } from "@/lib/services/staff.service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    validateRuntimeConfig();
    await connectDB();

    const actor = await requireAuth(request);
    requireRole(actor, [STAFF_ROLES.SUPER_ADMIN, STAFF_ROLES.ADMIN]);

    const sp = request.nextUrl.searchParams;

    const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));

    const limit = Math.min(
      Math.max(
        1,
        parseInt(sp.get("limit") ?? String(PAGINATION.DEFAULT_LIMIT), 10),
      ),
      PAGINATION.MAX_LIMIT,
    );

    const search = sp.get("search") || null;
    const role = sp.get("role") || null;
    const status = sp.get("status") || null;

    const { staffList, total } = await listStaff({
      page,
      limit,
      search,
      role,
      status,
    });

    return NextResponse.json(
      buildSuccessResponse("Staff list fetched successfully.", staffList, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }),
      { status: 200 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    validateRuntimeConfig();
    await connectDB();

    const actor = await requireAuth(request);
    requireRole(actor, [STAFF_ROLES.SUPER_ADMIN, STAFF_ROLES.ADMIN]);

    const body = await request.json();

    const newStaff = await createStaff(body, actor.staffId, actor.role);

    return NextResponse.json(
      buildSuccessResponse("Staff account created successfully.", newStaff),
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
