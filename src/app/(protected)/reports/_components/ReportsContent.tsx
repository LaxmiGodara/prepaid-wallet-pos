"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, PageHeader, SectionCard } from "@/components/ui";
import { getAuthorizationHeader } from "@/lib/auth-storage";

interface DailySummaryRow {
  date: string; rechargeCount: number; rechargeTotal: number;
  billCount: number; billTotal: number; netFlow: number;
}

interface ReportSummary {
  totalRecharges: number; totalRechargeAmount: number;
  totalBills: number; totalBillAmount: number; netFlow: number;
  daily: DailySummaryRow[];
}

interface TopMemberRow {
  memberId: string; memberName: string; totalSpent: number; billCount: number;
}

interface ReportData {
  summary: ReportSummary;
  topMembers: TopMemberRow[];
}

function formatCurrency(n: number) { return `₹${n.toLocaleString("en-IN")}`; }
function formatDisplayDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// Preset ranges
const PRESETS = [
  { label: "Last 7 days",  days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

function getDatesForDays(days: number) {
  const to = new Date();
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return {
    from: from.toISOString().split("T")[0],
    to:   to.toISOString().split("T")[0],
  };
}

export default function ReportsContent() {
  const defaultDates = getDatesForDays(30);
  const [fromDate,   setFromDate]   = useState(defaultDates.from);
  const [toDate,     setToDate]     = useState(defaultDates.to);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState("");

  const fetchReport = useCallback(async (from: string, to: string) => {
    setIsLoading(true); setError("");
    try {
      const auth = getAuthorizationHeader();
      const p = new URLSearchParams({ from, to });
      const res = await fetch(`/api/reports?${p}`, { headers: auth ? { Authorization: auth } : {} });
      const r = await res.json();
      if (!r.success) { setError(r.message ?? "Failed to generate report."); return; }
      setReportData(r.data as ReportData);
    } catch { setError("Unable to reach the server."); }
    finally { setIsLoading(false); }
  }, []);

  // Fetch on mount with default range
  useEffect(() => { void fetchReport(fromDate, toDate); }, []);  // eslint-disable-line

  function handlePreset(days: number) {
    const { from, to } = getDatesForDays(days);
    setFromDate(from); setToDate(to);
    void fetchReport(from, to);
  }

  const inputClass = "rounded-xl border border-slate-300 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:border-blue-400 focus:ring-blue-100 transition-all";

  return (
    <div className="p-6 flex flex-col gap-6">
      <PageHeader title="Reports" subtitle="Financial summary and analytics" />

      {/* Date Range Controls */}
      <SectionCard title="Date Range">
        <div className="flex items-center gap-3 flex-wrap">
          {PRESETS.map((p) => (
            <button key={p.days} type="button" onClick={() => handlePreset(p.days)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all">
              {p.label}
            </button>
          ))}
          <div className="flex items-center gap-2 ml-auto">
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputClass} />
            <span className="text-slate-400 text-sm">to</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputClass} />
            <Button variant="primary" size="sm" onClick={() => void fetchReport(fromDate, toDate)} isLoading={isLoading}>
              {isLoading ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </SectionCard>

      {reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Recharges",     value: formatCurrency(reportData.summary.totalRechargeAmount), sub: `${reportData.summary.totalRecharges} transactions`, color: "text-green-700" },
              { label: "Total Billed",         value: formatCurrency(reportData.summary.totalBillAmount),     sub: `${reportData.summary.totalBills} bills`,           color: "text-red-600"   },
              { label: "Net Flow",             value: formatCurrency(reportData.summary.netFlow),             sub: "Recharges minus bills",                            color: reportData.summary.netFlow >= 0 ? "text-blue-700" : "text-amber-700" },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-200 px-5 py-5">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-slate-400 mt-1">{sub}</p>
              </div>
            ))}
          </div>

          {/* Daily Breakdown */}
          <SectionCard title="Daily Breakdown" noPadding>
            {reportData.summary.daily.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-slate-400">No transactions in this date range.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[640px]">
                  <thead>
                    <tr>
                      {["Date", "Recharges", "Recharge Amount", "Bills", "Billed Amount", "Net Flow"].map((h) => (
                        <th key={h} className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/80 border-b border-slate-100 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {reportData.summary.daily.map((row) => (
                      <tr key={row.date} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-slate-700">{formatDisplayDate(row.date)}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{row.rechargeCount}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-green-700">{formatCurrency(row.rechargeTotal)}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{row.billCount}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-red-600">{formatCurrency(row.billTotal)}</td>
                        <td className={["px-6 py-4 text-sm font-semibold", row.netFlow >= 0 ? "text-blue-700" : "text-amber-600"].join(" ")}>
                          {row.netFlow >= 0 ? "+" : ""}{formatCurrency(row.netFlow)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals row */}
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td className="px-6 py-3 text-xs font-bold text-slate-600 uppercase">Total</td>
                      <td className="px-6 py-3 text-sm font-bold text-slate-700">{reportData.summary.totalRecharges}</td>
                      <td className="px-6 py-3 text-sm font-bold text-green-700">{formatCurrency(reportData.summary.totalRechargeAmount)}</td>
                      <td className="px-6 py-3 text-sm font-bold text-slate-700">{reportData.summary.totalBills}</td>
                      <td className="px-6 py-3 text-sm font-bold text-red-600">{formatCurrency(reportData.summary.totalBillAmount)}</td>
                      <td className={["px-6 py-3 text-sm font-bold", reportData.summary.netFlow >= 0 ? "text-blue-700" : "text-amber-600"].join(" ")}>
                        {reportData.summary.netFlow >= 0 ? "+" : ""}{formatCurrency(reportData.summary.netFlow)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Top Members */}
          {reportData.topMembers.length > 0 && (
            <SectionCard title="Top Members by Spending" noPadding>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>{["Rank", "Member", "Total Spent", "Bills"].map((h) => <th key={h} className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/80 border-b border-slate-100">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {reportData.topMembers.map((member, idx) => (
                      <tr key={member.memberId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className={["w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold", idx === 0 ? "bg-amber-100 text-amber-700" : idx === 1 ? "bg-slate-100 text-slate-600" : idx === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-50 text-slate-400"].join(" ")}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-800">{member.memberName}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">{formatCurrency(member.totalSpent)}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{member.billCount} bill{member.billCount !== 1 ? "s" : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}