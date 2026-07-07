import { type NextRequest, NextResponse } from "next/server";
import { buildSuccessResponse } from "@/lib/api-response";
import { requireAuth, requireRole } from "@/lib/auth-middleware";
import { validateRuntimeConfig } from "@/lib/config";
import { STAFF_ROLES } from "@/lib/constants";
import { connectDB } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { getDailySummary, getTopMembers } from "@/lib/services/report.service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    validateRuntimeConfig(); await connectDB();
    const actor = await requireAuth(request);
    requireRole(actor, [STAFF_ROLES.SUPER_ADMIN, STAFF_ROLES.ADMIN]);

    const sp   = request.nextUrl.searchParams;
    const from = sp.get("from");
    const to   = sp.get("to");

    
    const toDate   = to   ? new Date(to   + "T23:59:59.999Z") : new Date();
    const fromDate = from ? new Date(from + "T00:00:00.000Z") : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json({ success: false, message: "Invalid date range." }, { status: 400 });
    }

    const [summary, topMembers] = await Promise.all([
      getDailySummary(fromDate, toDate),
      getTopMembers(fromDate, toDate),
    ]);

    return NextResponse.json(
      buildSuccessResponse("Report generated.", { summary, topMembers }),
      { status: 200 }
    );
  } catch (error) { return handleApiError(error); }
}