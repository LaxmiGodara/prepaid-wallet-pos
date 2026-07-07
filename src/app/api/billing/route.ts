import { type NextRequest, NextResponse } from "next/server";
import { buildSuccessResponse } from "@/lib/api-response";
import { requireAuth, requireRole } from "@/lib/auth-middleware";
import { validateRuntimeConfig } from "@/lib/config";
import { PAGINATION, STAFF_ROLES } from "@/lib/constants";
import { connectDB } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { createBill, listBills } from "@/lib/services/billing.service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    validateRuntimeConfig(); await connectDB();
    const actor = await requireAuth(request);
    requireRole(actor, [STAFF_ROLES.SUPER_ADMIN, STAFF_ROLES.ADMIN, STAFF_ROLES.CASHIER]);
    const sp = request.nextUrl.searchParams;
    const page   = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
    const limit  = Math.min(Math.max(1, parseInt(sp.get("limit") ?? String(PAGINATION.DEFAULT_LIMIT), 10)), 100);
    const search = sp.get("search") || null;
    const { billList, total } = await listBills({ page, limit, search });
    return NextResponse.json(buildSuccessResponse("Bills fetched.", billList, { page, limit, total, totalPages: Math.ceil(total / limit) }), { status: 200 });
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    validateRuntimeConfig(); await connectDB();
    const actor = await requireAuth(request);
    requireRole(actor, [STAFF_ROLES.SUPER_ADMIN, STAFF_ROLES.ADMIN, STAFF_ROLES.CASHIER]);
    const body = await request.json();
    const bill = await createBill(body, actor.staffId);
    return NextResponse.json(buildSuccessResponse("Bill processed successfully.", bill), { status: 201 });
  } catch (error) { return handleApiError(error); }
}