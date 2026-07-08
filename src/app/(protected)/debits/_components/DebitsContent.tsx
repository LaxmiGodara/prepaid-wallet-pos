"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, PageHeader, SectionCard } from "@/components/ui";
import { getAuthorizationHeader } from "@/lib/auth-storage";
import { PAGINATION, RECORD_STATUS } from "@/lib/constants";
import type { PaginationMeta } from "@/types";

interface DebitRecord {
  id: string; memberId: string; memberName: string; walletId: string;
  amount: number; reason: string;
  walletBalanceBefore?: number; walletBalanceAfter?: number;
  createdAt: string;
}

interface MemberSearchResult {
  id: string; fullName: string; mobileNumber: string | null;
  walletBalance: number; status: string;
}

const INITIAL_META: PaginationMeta = { page: 1, limit: PAGINATION.DEFAULT_LIMIT, total: 0, totalPages: 0 };
function formatCurrency(n: number) { return `₹${n.toLocaleString("en-IN")}`; }
function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function DebitsContent() {
  const [list,        setList]        = useState<DebitRecord[]>([]);
  const [meta,        setMeta]        = useState<PaginationMeta>(INITIAL_META);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading,   setIsLoading]   = useState(true);
  const [listError,   setListError]   = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [showCreate,       setShowCreate]       = useState(false);
  const [memberQuery,      setMemberQuery]      = useState("");
  const [memberResults,    setMemberResults]    = useState<MemberSearchResult[]>([]);
  const [selectedMember,   setSelectedMember]   = useState<MemberSearchResult | null>(null);
  const [isSearchingMember, setIsSearchingMember] = useState(false);
  const [amount,           setAmount]           = useState("");
  const [reason,           setReason]           = useState("");
  const [formErrors,       setFormErrors]       = useState<Record<string, string>>({});
  const [createErr,        setCreateErr]        = useState("");
  const [isCreating,       setIsCreating]       = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchQuery); setCurrentPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (!memberQuery.trim() || memberQuery.length < 2) { setMemberResults([]); return; }
    const t = setTimeout(async () => {
      setIsSearchingMember(true);
      try {
        const auth = getAuthorizationHeader();
        const p = new URLSearchParams({ search: memberQuery, limit: "5", page: "1", status: RECORD_STATUS.ACTIVE });
        const res = await fetch(`/api/members?${p}`, { headers: auth ? { Authorization: auth } : {} });
        const r = await res.json();
        if (r.success) setMemberResults(r.data as MemberSearchResult[]);
      } catch {} finally { setIsSearchingMember(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [memberQuery]);

  const fetchList = useCallback(async (page: number, search: string) => {
    setIsLoading(true); setListError("");
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(PAGINATION.DEFAULT_LIMIT) });
      if (search) p.set("search", search);
      const auth = getAuthorizationHeader();
      const res = await fetch(`/api/debits?${p}`, { headers: auth ? { Authorization: auth } : {} });
      const r = await res.json();
      if (!r.success) { setListError(r.message ?? "Failed to load debits."); return; }
      setList(r.data as DebitRecord[]);
      if (r.meta) setMeta(r.meta as PaginationMeta);
    } catch { setListError("Unable to reach the server."); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { void fetchList(currentPage, debouncedSearch); }, [currentPage, debouncedSearch, fetchList]);

  function resetForm() {
    setMemberQuery(""); setMemberResults([]); setSelectedMember(null);
    setAmount(""); setReason(""); setFormErrors({}); setCreateErr("");
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!selectedMember) errs.memberId = "Please select a member.";
    if (!amount || Number(amount) <= 0) errs.amount = "Amount must be greater than zero.";
    if (!reason.trim()) errs.reason = "Reason is required.";
    if (selectedMember && Number(amount) > selectedMember.walletBalance) {
      errs.amount = `Cannot deduct more than current balance (${formatCurrency(selectedMember.walletBalance)}).`;
    }
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

    setIsCreating(true); setCreateErr("");
    try {
      const auth = getAuthorizationHeader();
      const res = await fetch("/api/debits", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) },
        body: JSON.stringify({ memberId: selectedMember!.id, amount: Number(amount), reason }),
      });
      const r = await res.json();
      if (!r.success) {
        if (r.errors?.length > 0) {
          const be: Record<string, string> = {};
          (r.errors as Array<{ field: string; message: string }>).forEach((err) => { be[err.field] = err.message; });
          setFormErrors(be);
        } else { setCreateErr(r.message ?? "Debit failed."); }
        return;
      }
      setShowCreate(false); resetForm();
      void fetchList(1, ""); setCurrentPage(1);
    } catch { setCreateErr("Unable to reach the server."); }
    finally { setIsCreating(false); }
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <PageHeader
        title="Manual Debits"
        subtitle={meta.total > 0 ? `${meta.total} debit${meta.total !== 1 ? "s" : ""}` : "Manual wallet deductions"}
        actions={!showCreate ? <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>New Debit</Button> : undefined}
      />

      <div className="flex-1 min-w-[200px] max-w-xs">
        <input type="search" placeholder="Search by member name..." value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-blue-400 focus:ring-blue-100 bg-white transition-all" />
      </div>

      {showCreate && (
        <SectionCard title="New Manual Debit">
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-sm text-amber-800 font-medium">Admin Action</p>
            <p className="text-xs text-amber-700 mt-0.5">Manual debits deduct from a member's wallet without billing. A reason is required for the audit trail.</p>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4" noValidate>
            {/* Member search */}
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Member <span className="text-red-500">*</span></label>
              {selectedMember ? (
                <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{selectedMember.fullName}</p>
                    <p className="text-xs text-slate-500">Current balance: <strong>{formatCurrency(selectedMember.walletBalance)}</strong></p>
                  </div>
                  <button type="button" onClick={() => { setSelectedMember(null); setMemberQuery(""); }}
                    className="text-xs text-amber-600 hover:text-amber-700 font-medium ml-3">Change</button>
                </div>) : (
<div className="relative">
<input type="text" placeholder="Type member name..." value={memberQuery}
onChange={(e) => { setMemberQuery(e.target.value); setFormErrors((p) => ({ ...p, memberId: "" })); }}
className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-blue-400 focus:ring-blue-100 bg-white transition-all" />
{(memberResults.length > 0 || isSearchingMember) && (
<div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
{isSearchingMember && <p className="px-4 py-3 text-xs text-slate-400">Searching...</p>}
{memberResults.map((m) => (
<button key={m.id} type="button"
onClick={() => { setSelectedMember(m); setMemberQuery(""); setMemberResults([]); setFormErrors((p) => ({ ...p, memberId: "" })); }}
className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
<p className="text-sm font-medium text-slate-800">{m.fullName}</p>
<p className="text-xs text-slate-400">{m.mobileNumber ?? "No mobile"} · Balance: {formatCurrency(m.walletBalance)}</p>
</button>
))}
</div>
)}
</div>
)}
{formErrors.memberId && <p className="text-xs font-medium text-red-600">{formErrors.memberId}</p>}
</div>
{/* Amount */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Amount (₹) <span className="text-red-500">*</span></label>
          <input type="number" min="1" step="1" placeholder="Enter amount" value={amount}
            onChange={(e) => { setAmount(e.target.value); setFormErrors((p) => ({ ...p, amount: "" })); }}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-blue-400 focus:ring-blue-100 bg-white transition-all" />
          {formErrors.amount && <p className="text-xs font-medium text-red-600">{formErrors.amount}</p>}
        </div>

        {/* Reason */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Reason <span className="text-red-500">*</span></label>
          <input type="text" placeholder="e.g. Correction, Refund adjustment..." value={reason}
            onChange={(e) => { setReason(e.target.value); setFormErrors((p) => ({ ...p, reason: "" })); }}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-blue-400 focus:ring-blue-100 bg-white transition-all" />
          {formErrors.reason && <p className="text-xs font-medium text-red-600">{formErrors.reason}</p>}
        </div>

        <div className="col-span-2 flex flex-col gap-3">
          {createErr && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{createErr}</div>}
          <div className="flex gap-3">
            <Button type="submit" variant="danger" isLoading={isCreating}>{isCreating ? "Processing..." : "Process Debit"}</Button>
            <Button type="button" variant="secondary" onClick={() => { setShowCreate(false); resetForm(); }} disabled={isCreating}>Cancel</Button>
          </div>
        </div>
      </form>
    </SectionCard>
  )}

  {/* List */}
  <SectionCard title="Debit History" noPadding
    actions={<Button variant="secondary" size="sm" onClick={() => void fetchList(currentPage, debouncedSearch)} disabled={isLoading}>{isLoading ? "Loading..." : "Refresh"}</Button>}>
    {isLoading && (
      <div className="flex items-center justify-center py-16 gap-2">
        <span className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:300ms]" />
        </span>
        <span className="text-sm text-slate-400">Loading...</span>
      </div>
    )}
    {!isLoading && listError && (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-sm text-red-500">{listError}</p>
        <Button variant="secondary" size="sm" onClick={() => { setListError(""); void fetchList(currentPage, debouncedSearch); }}>Try Again</Button>
      </div>
    )}
    {!isLoading && !listError && list.length === 0 && (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm font-medium text-slate-500">No manual debits recorded yet.</p>
      </div>
    )}
    {!isLoading && !listError && list.length > 0 && (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[680px]">
          <thead>
            <tr>
              {["Member", "Amount", "Reason", "Balance Change", "Date"].map((h) => (
                <th key={h} className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/80 border-b border-slate-100 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {list.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-slate-800">{d.memberName}</td>
                <td className="px-6 py-4 text-sm font-bold text-red-600">-{formatCurrency(d.amount)}</td>
                <td className="px-6 py-4 text-sm text-slate-600 max-w-[200px] truncate">{d.reason}</td>
                <td className="px-6 py-4 text-xs text-slate-500">
                  {d.walletBalanceBefore !== undefined && d.walletBalanceAfter !== undefined
                    ? <>{formatCurrency(d.walletBalanceBefore)} → <strong className="text-slate-700">{formatCurrency(d.walletBalanceAfter)}</strong></>
                    : "Not available"}
                </td>
                <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">{formatDate(d.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
    {!isLoading && !listError && meta.totalPages > 1 && (
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
        <p className="text-xs text-slate-500">
          Showing <span className="font-medium text-slate-700">{(currentPage - 1) * meta.limit + 1}</span>
          {" – "}<span className="font-medium text-slate-700">{Math.min(currentPage * meta.limit, meta.total)}</span>
          {" of "}<span className="font-medium text-slate-700">{meta.total}</span>
        </p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>Previous</Button>
          <span className="text-xs text-slate-500 min-w-[80px] text-center">Page {currentPage} of {meta.totalPages}</span>
          <Button variant="secondary" size="sm" disabled={currentPage === meta.totalPages} onClick={() => setCurrentPage((p) => Math.min(meta.totalPages, p + 1))}>Next</Button>
        </div>
      </div>
    )}
  </SectionCard>
</div>
  );
}
