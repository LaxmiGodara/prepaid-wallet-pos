import { type NextRequest, NextResponse } from "next/server";
import { buildSuccessResponse } from "@/lib/api-response";
import { requireAuth, requireRole } from "@/lib/auth-middleware";
import { validateRuntimeConfig } from "@/lib/config";
import { STAFF_ROLES } from "@/lib/constants";
import { connectDB } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { getBillDetail } from "@/lib/services/billing.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    validateRuntimeConfig();
    await connectDB();
    const actor = await requireAuth(request);
    requireRole(actor, [
      STAFF_ROLES.SUPER_ADMIN,
      STAFF_ROLES.ADMIN,
      STAFF_ROLES.CASHIER,
    ]);
    const { id } = await params;
    const bill = await getBillDetail(id);
    return NextResponse.json(buildSuccessResponse("Bill fetched.", bill), {
      status: 200,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
