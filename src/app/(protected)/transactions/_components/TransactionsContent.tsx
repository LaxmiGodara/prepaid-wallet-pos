"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Button, PageHeader, SectionCard } from "@/components/ui";
import { getAuthorizationHeader } from "@/lib/auth-storage";
import { PAGINATION, TRANSACTION_TYPES } from "@/lib/constants";
import type { PaginationMeta } from "@/types";

interface TransactionRecord {
  id: string;
  memberId: string;
  memberName: string;
  type: string;
  amount: number;
  walletBalanceBefore: number;
  walletBalanceAfter: number;
  referenceModel: string;
  referenceId: string;
  createdAt: string;
}

const INITIAL_META: PaginationMeta = { page: 1, limit: PAGINATION.DEFAULT_LIMIT, total: 0, totalPages: 0 };

function formatCurrency(n: number) { return `₹${n.toLocaleString("en-IN")}`; }
function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function TransactionsContent() {
  const [list,        setList]        = useState<TransactionRecord[]>([]);
  const [meta,        setMeta]        = useState<PaginationMeta>(INITIAL_META);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading,   setIsLoading]   = useState(true);
  const [listError,   setListError]   = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter,  setTypeFilter]  = useState("");

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchQuery); setCurrentPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchList = useCallback(async (page: number, search: string, type: string) => {
    setIsLoading(true); setListError("");
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(PAGINATION.DEFAULT_LIMIT) });
      if (search) p.set("search", search);
      if (type) p.set("type", type);
      const auth = getAuthorizationHeader();
      const res = await fetch(`/api/transactions?${p}`, { headers: auth ? { Authorization: auth } : {} });
      const r = await res.json();
      if (!r.success) { setListError(r.message ?? "Failed to load transactions."); return; }
      setList(r.data as TransactionRecord[]);
      if (r.meta) setMeta(r.meta as PaginationMeta);
    } catch { setListError("Unable to reach the server."); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    void fetchList(currentPage, debouncedSearch, typeFilter);
  }, [currentPage, debouncedSearch, typeFilter, fetchList]);

  const hasActiveFilters = Boolean(searchQuery || typeFilter);

  return (
    <div className="p-6 flex flex-col gap-6">
      <PageHeader
        title="Transactions"
        subtitle={meta.total > 0 ? `${meta.total} transaction${meta.total !== 1 ? "s" : ""}` : "Wallet transaction ledger"}
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <input type="search" placeholder="Search by member name..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-[var(--color-accent)] focus:ring-[var(--color-accent-soft)] bg-white transition-all" />
        </div>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:border-[var(--color-accent)] focus:ring-[var(--color-accent-soft)] transition-all cursor-pointer">
          <option value="">All Types</option>
          <option value={TRANSACTION_TYPES.CREDIT}>Credit</option>
          <option value={TRANSACTION_TYPES.DEBIT}>Debit</option>
        </select>
        {hasActiveFilters && (
          <Button variant="secondary" size="sm" onClick={() => { setSearchQuery(""); setTypeFilter(""); setCurrentPage(1); }}>
            Clear Filters
          </Button>
        )}
      </div>

      <SectionCard title="Transaction Ledger" noPadding
        actions={<Button variant="secondary" size="sm" onClick={() => void fetchList(currentPage, debouncedSearch, typeFilter)} disabled={isLoading}>{isLoading ? "Loading..." : "Refresh"}</Button>}>
        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-2">
            <span className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:300ms]" />
            </span>
            <span className="text-sm text-slate-400">Loading transactions...</span>
          </div>
        )}
        {!isLoading && listError && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-red-500">{listError}</p>
            <Button variant="secondary" size="sm" onClick={() => { setListError(""); void fetchList(currentPage, debouncedSearch, typeFilter); }}>Try Again</Button>
          </div>
        )}
        {!isLoading && !listError && list.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm font-medium text-slate-500">
              {hasActiveFilters ? "No transactions match your filters." : "No transactions recorded yet."}
            </p>
          </div>
        )}
        {!isLoading && !listError && list.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[760px]">
              <thead>
                <tr>
                  {["Member", "Type", "Amount", "Balance Change", "Source", "Date"].map((h) => (
                    <th key={h} className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-[var(--color-paper)] border-b border-slate-100 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {list.map((tx) => {
                  const isCredit = tx.type === TRANSACTION_TYPES.CREDIT;
                  return (
                    <tr key={tx.id} className="group hover:bg-[var(--color-paper)] border-l-2 border-l-transparent hover:border-l-[var(--color-accent)] transition-all">
                      <td className="px-6 py-4 text-sm font-medium text-slate-800">{tx.memberName}</td>
                      <td className="px-6 py-4">
                        <span className={[
                          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold",
                          isCredit ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600",
                        ].join(" ")}>
                          {isCredit ? <ArrowUpCircle size={12} /> : <ArrowDownCircle size={12} />}
                          {isCredit ? "Credit" : "Debit"}
                        </span>
                      </td>
                      <td className={["px-6 py-4 text-sm font-bold font-price", isCredit ? "text-green-700" : "text-red-600"].join(" ")}>
                        {isCredit ? "+" : "-"}{formatCurrency(tx.amount)}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-price">
                        {formatCurrency(tx.walletBalanceBefore)} → <strong className="text-slate-700">{formatCurrency(tx.walletBalanceAfter)}</strong>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">{tx.referenceModel}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">{formatDate(tx.createdAt)}</td>
                    </tr>
                  );
                })}
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