import { type NextRequest, NextResponse } from "next/server";

import { buildSuccessResponse } from "@/lib/api-response";
import { requireAuth, requireRole } from "@/lib/auth-middleware";
import { validateRuntimeConfig } from "@/lib/config";
import { STAFF_ROLES } from "@/lib/constants";
import { connectDB } from "@/lib/db";
import { handleApiError } from "@/lib/error-handler";
import { getMembersStats } from "@/lib/services/member.service";
import { getDailySummary, getTopMembers } from "@/lib/services/report.service";
import { getStockAlerts } from "@/lib/services/stock.service";
import { getWalletsSummary } from "@/lib/services/wallet.service";

// ─── GET /api/dashboard/summary ─────────────────────────────────────────────
// Single aggregate endpoint that powers the dashboard's business overview:
// member counts, money currently held in wallets, today's recharge/billing
// activity, low-stock alerts, and the top members over the last 30 days.
// Admin and Super Admin only — Cashiers see a simpler dashboard client-side.

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    validateRuntimeConfig();
    await connectDB();

    const actor = await requireAuth(request);
    requireRole(actor, [STAFF_ROLES.SUPER_ADMIN, STAFF_ROLES.ADMIN]);

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    startOfMonth.setHours(0, 0, 0, 0);

    const [members, wallets, today, week, stockAlerts, topMembers] =
      await Promise.all([
        getMembersStats(),
        getWalletsSummary(),
        getDailySummary(startOfToday, now),
        getDailySummary(startOfWeek, now),
        getStockAlerts(),
        getTopMembers(startOfMonth, now),
      ]);

    return NextResponse.json(
      buildSuccessResponse("Dashboard summary generated.", {
        members,
        wallets,
        today,
        week,
        stockAlerts,
        topMembers: topMembers.slice(0, 5),
      }),
      { status: 200 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
