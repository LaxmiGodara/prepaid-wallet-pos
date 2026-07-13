"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  IdCard,
  CreditCard,
  Wallet,
  RefreshCcw,
  ArrowDownCircle,
  Package,
  Receipt,
  ArrowLeftRight,
  Boxes,
  BarChart3,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";

import { Badge, SectionCard, StatCard, getRoleVariant } from "@/components/ui";
import { useSession } from "@/contexts/SessionContext";
import { NAV_ITEMS } from "@/lib/navigation";
import { STAFF_ROLES } from "@/lib/constants";
import { getAuthorizationHeader } from "@/lib/auth-storage";

const MODULE_ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/staff": Users,
  "/members": IdCard,
  "/cards": CreditCard,
  "/wallets": Wallet,
  "/recharges": RefreshCcw,
  "/debits": ArrowDownCircle,
  "/products": Package,
  "/billing": Receipt,
  "/transactions": ArrowLeftRight,
  "/stock": Boxes,
  "/reports": BarChart3,
};

function formatCurrency(n: number): string {
  return `₹${Number.isFinite(n) ? n.toLocaleString("en-IN") : "0"}`;
}

interface DailyRow {
  date: string;
  rechargeTotal: number;
  billTotal: number;
  netFlow: number;
}

interface DashboardSummary {
  members: { total: number; active: number; inactive: number };
  wallets: {
    totalBalance: number;
    activeCount: number;
    inactiveCount: number;
  };
  today: {
    totalRechargeAmount: number;
    totalBillAmount: number;
    netFlow: number;
    totalRecharges: number;
    totalBills: number;
  };
  week: { daily: DailyRow[] };
  stockAlerts: { outOfStockCount: number; lowStockCount: number };
  topMembers: {
    memberId: string;
    memberName: string;
    totalSpent: number;
    billCount: number;
  }[];
}

export default function DashboardContent() {
  const { session, hasRole } = useSession();

  const accessibleModules = NAV_ITEMS.filter((item) =>
    hasRole(item.allowedRoles),
  );

  const canSeeBusinessStats = hasRole([
    STAFF_ROLES.SUPER_ADMIN,
    STAFF_ROLES.ADMIN,
  ]);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(canSeeBusinessStats);

  const fetchSummary = useCallback(async (): Promise<void> => {
    try {
      const auth = getAuthorizationHeader();
      const response = await fetch("/api/dashboard/summary", {
        headers: auth ? { Authorization: auth } : {},
      });
      const result = await response.json();
      if (result.success) setSummary(result.data as DashboardSummary);
    } catch {
      // Business stats are non-critical — dashboard still works without them.
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    if (canSeeBusinessStats) void fetchSummary();
  }, [canSeeBusinessStats, fetchSummary]);

  const firstName = session.staff.fullName.split(" ")[0];
  const now = new Date();
  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const chartData =
    summary?.week.daily.map((d) => ({
      date: new Date(d.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      Recharges: d.rechargeTotal,
      Billing: d.billTotal,
    })) ?? [];

  const netToday = summary?.today.netFlow ?? 0;

  return (
    <div className="p-6 flex flex-col gap-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-text)] font-display">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          {dateLabel} · Here is your system overview.
        </p>
      </div>

      {/* Account hero — styled after a physical prepaid / membership card */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 sm:p-7 text-white animate-rise-in"
        style={{
          background:
            "radial-gradient(120% 160% at 100% 0%, #2a2313 0%, transparent 55%), linear-gradient(135deg, var(--color-ink) 0%, var(--color-ink-soft) 100%)",
        }}
      >
        <Wallet
          className="absolute -right-6 -bottom-8 opacity-[0.07] pointer-events-none"
          size={180}
          strokeWidth={1}
        />

        <div className="relative flex items-start justify-between gap-4">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/40">
            Account
          </p>
          <Badge
            label={session.staff.role}
            variant={getRoleVariant(session.staff.role)}
          />
        </div>

        <div className="relative flex items-center gap-4 mt-6">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl flex-shrink-0"
            style={{
              background:
                "linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-strong) 100%)",
              color: "#14100a",
            }}
          >
            {session.staff.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-lg text-white leading-tight font-display">
              {session.staff.fullName}
            </p>
            <p className="text-sm text-white/40 mt-0.5">
              @{session.staff.username}
            </p>
          </div>
        </div>
      </div>

      {/* Business overview — Admin / Super Admin only */}
      {canSeeBusinessStats && (
        <>
          <div>
            <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--color-text-muted)] mb-3">
              Business Overview
            </h2>

            {loadingSummary ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-line)] animate-pulse"
                  />
                ))}
              </div>
            ) : summary ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 animate-rise-in">
                <StatCard
                  label="Active Members"
                  value={summary.members.active}
                  hint={`${summary.members.total} total enrolled`}
                  icon={IdCard}
                  tone="neutral"
                />
                <StatCard
                  label="Wallet Balance"
                  value={formatCurrency(summary.wallets.totalBalance)}
                  hint={`${summary.wallets.activeCount} active wallets`}
                  icon={Wallet}
                  tone="positive"
                />
                <StatCard
                  label="Today's Recharges"
                  value={formatCurrency(summary.today.totalRechargeAmount)}
                  hint={`${summary.today.totalRecharges} transaction${summary.today.totalRecharges !== 1 ? "s" : ""}`}
                  icon={RefreshCcw}
                  tone="positive"
                />
                <StatCard
                  label="Today's Billing"
                  value={formatCurrency(summary.today.totalBillAmount)}
                  hint={`${summary.today.totalBills} bill${summary.today.totalBills !== 1 ? "s" : ""}`}
                  icon={Receipt}
                  tone="neutral"
                />
                <StatCard
                  label="Net Flow Today"
                  value={formatCurrency(Math.abs(netToday))}
                  hint={netToday >= 0 ? "More in than out" : "More out than in"}
                  icon={netToday >= 0 ? TrendingUp : TrendingDown}
                  tone={netToday >= 0 ? "positive" : "negative"}
                />
                <StatCard
                  label="Stock Alerts"
                  value={
                    summary.stockAlerts.outOfStockCount +
                    summary.stockAlerts.lowStockCount
                  }
                  hint={`${summary.stockAlerts.outOfStockCount} out · ${summary.stockAlerts.lowStockCount} low`}
                  icon={AlertTriangle}
                  tone={
                    summary.stockAlerts.outOfStockCount > 0
                      ? "negative"
                      : summary.stockAlerts.lowStockCount > 0
                        ? "warning"
                        : "positive"
                  }
                />
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">
                Business stats aren&apos;t available right now.
              </p>
            )}
          </div>

          {summary && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* 7-day trend */}
              <SectionCard
                title="Last 7 Days — Recharges vs. Billing"
                className="lg:col-span-2"
              >
                {chartData.length > 0 ? (
                  <div className="h-64 -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={chartData}
                        margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="rechargeFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="var(--color-accent)"
                              stopOpacity={0.35}
                            />
                            <stop
                              offset="95%"
                              stopColor="var(--color-accent)"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="billFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#8a8f98"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#8a8f98"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--color-line)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(value: ValueType | undefined) =>
                            formatCurrency(
                              typeof value === "number" ? value : Number(value) || 0,
                            )
                          }
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid var(--color-line)",
                            fontSize: 12,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="Recharges"
                          stroke="var(--color-accent-strong)"
                          fill="url(#rechargeFill)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="Billing"
                          stroke="#8a8f98"
                          fill="url(#billFill)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-text-muted)] py-8 text-center">
                    No activity in the last 7 days yet.
                  </p>
                )}
              </SectionCard>

              {/* Top members */}
              <SectionCard title="Top Members — Last 30 Days">
                {summary.topMembers.length > 0 ? (
                  <ul className="flex flex-col gap-1 -mx-2">
                    {summary.topMembers.map((m, i) => (
                      <li
                        key={m.memberId}
                        className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-[var(--color-paper)] transition-colors"
                      >
                        <span
                          className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold flex-shrink-0"
                          style={{
                            background:
                              i === 0
                                ? "var(--color-accent-soft)"
                                : "var(--color-paper)",
                            color:
                              i === 0
                                ? "var(--color-accent-strong)"
                                : "var(--color-text-muted)",
                          }}
                        >
                          {i === 0 ? <Trophy size={13} /> : i + 1}
                        </span>
                        <span className="text-sm font-medium text-[var(--color-text)] flex-1 truncate">
                          {m.memberName}
                        </span>
                        <span className="text-sm font-price text-[var(--color-text-muted)]">
                          {formatCurrency(m.totalSpent)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
                    No billing activity in the last 30 days.
                  </p>
                )}
              </SectionCard>
            </div>
          )}
        </>
      )}

      {/* Module grid */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--color-text-muted)]">
            Your Modules
          </h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            {accessibleModules.length} module
            {accessibleModules.length !== 1 ? "s" : ""} available
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {accessibleModules.map((item, index) => {
            const Icon = MODULE_ICONS[item.href] ?? LayoutDashboard;

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{ animationDelay: `${index * 30}ms` }}
                className="animate-rise-in group flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-accent-soft-line)] hover:shadow-[0_4px_14px_rgba(20,16,10,0.06)] hover:-translate-y-0.5 transition-all duration-200"
              >
                <span
                  className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 transition-colors duration-200"
                  style={{
                    background: "var(--color-accent-soft)",
                    color: "var(--color-accent-strong)",
                  }}
                >
                  <Icon size={17} strokeWidth={2} />
                </span>

                <span className="text-sm font-medium text-[var(--color-text)] flex-1">
                  {item.label}
                </span>

                <ArrowUpRight
                  size={16}
                  className="text-[var(--color-text-muted)]/40 group-hover:text-[var(--color-accent)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200"
                />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
