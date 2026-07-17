"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, PageHeader, SectionCard, getStatusVariant } from "@/components/ui";
import { getAuthorizationHeader } from "@/lib/auth-storage";
import { PAGINATION, RECORD_STATUS } from "@/lib/constants";
import type { PaginationMeta } from "@/types";

interface WalletRecord {
  id: string;
  memberId: string;
  memberName: string;
  currentBalance: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const INITIAL_META: PaginationMeta = { page: 1, limit: PAGINATION.DEFAULT_LIMIT, total: 0, totalPages: 0 };

export default function WalletsContent() {
  const [walletList,   setWalletList]   = useState<WalletRecord[]>([]);
  const [meta,         setMeta]         = useState<PaginationMeta>(INITIAL_META);
  const [currentPage,  setCurrentPage]  = useState(1);
  const [isLoading,    setIsLoading]    = useState(true);
  const [listError,    setListError]    = useState("");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [togglingId,   setTogglingId]   = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchQuery); setCurrentPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchWallets = useCallback(async (page: number, search: string, status: string) => {
    setIsLoading(true); setListError("");
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(PAGINATION.DEFAULT_LIMIT) });
      if (search) p.set("search", search);
      if (status) p.set("status", status);
      const auth = getAuthorizationHeader();
      const res = await fetch(`/api/wallets?${p}`, { headers: auth ? { Authorization: auth } : {} });
      const r = await res.json();
      if (!r.success) { setListError(r.message ?? "Failed to load wallets."); return; }
      setWalletList(r.data as WalletRecord[]);
      if (r.meta) setMeta(r.meta as PaginationMeta);
    } catch { setListError("Unable to reach the server."); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { void fetchWallets(currentPage, debouncedSearch, statusFilter); },
    [currentPage, debouncedSearch, statusFilter, fetchWallets]);

  const hasActiveFilters = Boolean(searchQuery || statusFilter);

  async function handleToggle(wallet: WalletRecord) {
    setTogglingId(wallet.id);
    try {
      const auth = getAuthorizationHeader();
      const res = await fetch(`/api/wallets/${wallet.id}/status`, {
        method: "PATCH",
        headers: auth ? { Authorization: auth } : {},
      });
      const r = await res.json();
      if (!r.success) { setListError(r.message ?? "Failed to update status."); return; }
      setWalletList((prev) => prev.map((w) => w.id === wallet.id ? r.data as WalletRecord : w));
    } catch { setListError("Unable to reach the server."); }
    finally { setTogglingId(null); }
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <PageHeader title="Wallets" subtitle={meta.total > 0 ? `${meta.total} wallet${meta.total !== 1 ? "s" : ""}` : "Member wallet balances"} />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <input type="search" placeholder="Search by member name or mobile..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-[var(--color-accent)] focus:ring-[var(--color-accent-soft)] bg-white transition-all" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:border-[var(--color-accent)] focus:ring-[var(--color-accent-soft)] transition-all cursor-pointer">
          <option value="">All Status</option>
          <option value={RECORD_STATUS.ACTIVE}>Active</option>
          <option value={RECORD_STATUS.INACTIVE}>Inactive</option>
        </select>
        {hasActiveFilters && <Button variant="secondary" size="sm" onClick={() => { setSearchQuery(""); setStatusFilter(""); setCurrentPage(1); }}>Clear Filters</Button>}
      </div>

      <SectionCard title="All Wallets" noPadding
        actions={<Button variant="secondary" size="sm" onClick={() => void fetchWallets(currentPage, debouncedSearch, statusFilter)} disabled={isLoading}>{isLoading ? "Loading..." : "Refresh"}</Button>}>
        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-2">
            <span className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:300ms]" />
            </span>
            <span className="text-sm text-slate-400">Loading wallets...</span>
          </div>
        )}
        {!isLoading && listError && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-red-500">{listError}</p>
            <Button variant="secondary" size="sm" onClick={() => { setListError(""); void fetchWallets(currentPage, debouncedSearch, statusFilter); }}>Try Again</Button>
          </div>
        )}
        {!isLoading && !listError && walletList.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm font-medium text-slate-500">{hasActiveFilters ? "No wallets match your filters." : "No wallets found."}</p>
          </div>
        )}
        {!isLoading && !listError && walletList.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[560px]">
              <thead>
                <tr>
                  {["Member", "Balance", "Status", "Last Updated", "Actions"].map((h) => (
                    <th key={h} className={`${h === "Actions" ? "text-center" : "text-left"} px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-[var(--color-paper)] border-b border-slate-100 whitespace-nowrap`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {walletList.map((wallet) => (
                  <tr key={wallet.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{wallet.memberName}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-700">₹{wallet.currentBalance.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-4"><Badge label={wallet.status} variant={getStatusVariant(wallet.status)} /></td>
                    <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                      {new Date(wallet.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button type="button" onClick={() => void handleToggle(wallet)} disabled={togglingId === wallet.id}
                        className={["text-xs font-medium transition-colors disabled:opacity-40", wallet.status === RECORD_STATUS.ACTIVE ? "text-red-500 hover:text-red-600" : "text-green-600 hover:text-green-700"].join(" ")}>
                        {togglingId === wallet.id ? "Updating..." : wallet.status === RECORD_STATUS.ACTIVE ? "Deactivate" : "Activate"}
                      </button>
                    </td>
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