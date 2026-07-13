"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Input, PageHeader, SectionCard, getStatusVariant } from "@/components/ui";
import { getAuthorizationHeader } from "@/lib/auth-storage";
import { CARD_STATUS, PAGINATION, RECORD_STATUS } from "@/lib/constants";
import type { PaginationMeta } from "@/types";

interface CardRecord {
  id: string;
  cardNumber: string;
  memberId: string;
  memberName: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

interface MemberSearchResult {
  id: string;
  fullName: string;
  mobileNumber: string | null;
  walletBalance: number;
}

type CardStatusFilter = "" | "Active" | "Inactive" | "Replaced" | "Expired";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}


function getCardStatusVariant(status: string): "success" | "warning" | "danger" {
  if (status === CARD_STATUS.ACTIVE)   return "success";
  if (status === CARD_STATUS.INACTIVE) return "warning";
  return "danger"; 
}
const INITIAL_META: PaginationMeta = { page: 1, limit: PAGINATION.DEFAULT_LIMIT, total: 0, totalPages: 0 };

function formatDateInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getDefaultExpiryDate(): string {
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 1);
  return formatDateInput(expiry);
}

export default function CardsContent() {
  // List state
  const [cardList,    setCardList]    = useState<CardRecord[]>([]);
  const [meta,        setMeta]        = useState<PaginationMeta>(INITIAL_META);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading,   setIsLoading]   = useState(true);
  const [listError,   setListError]   = useState("");

  // Filter state
  const [searchQuery,    setSearchQuery]    = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter,   setStatusFilter]   = useState<CardStatusFilter>("");

  // Create form state
  const [showCreate,    setShowCreate]    = useState(false);
  const [expiresAt,     setExpiresAt]     = useState("");
  const [expiresAtErr,  setExpiresAtErr]  = useState("");
  const [createErr,     setCreateErr]     = useState("");
  const [isCreating,    setIsCreating]    = useState(false);

  // Member search for create form
  const [memberQuery,   setMemberQuery]   = useState("");
  const [memberResults, setMemberResults] = useState<MemberSearchResult[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberSearchResult | null>(null);
  const [memberErr,     setMemberErr]     = useState("");
  const [isSearchingMember, setIsSearchingMember] = useState(false);

  // Toggle state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchQuery); setCurrentPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Debounce member search
  useEffect(() => {
    if (!memberQuery.trim() || memberQuery.length < 2) { setMemberResults([]); return; }
    const t = setTimeout(async () => {
      setIsSearchingMember(true);
      try {
        const auth = getAuthorizationHeader();
        const p = new URLSearchParams({ search: memberQuery, limit: "5", page: "1" });
        const res = await fetch(`/api/members?${p}`, { headers: auth ? { Authorization: auth } : {} });
        const r = await res.json();
        if (r.success) setMemberResults(r.data as MemberSearchResult[]);
      } catch {} finally { setIsSearchingMember(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [memberQuery]);

  const fetchCards = useCallback(async (page: number, search: string, status: string) => {
    setIsLoading(true); setListError("");
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(PAGINATION.DEFAULT_LIMIT) });
      if (search) p.set("search", search);
      if (status) p.set("status", status);
      const auth = getAuthorizationHeader();
      const res = await fetch(`/api/cards?${p}`, { headers: auth ? { Authorization: auth } : {} });
      const r = await res.json();
      if (!r.success) { setListError(r.message ?? "Failed to load cards."); return; }
      setCardList(r.data as CardRecord[]);
      if (r.meta) setMeta(r.meta as PaginationMeta);
    } catch { setListError("Unable to reach the server."); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { void fetchCards(currentPage, debouncedSearch, statusFilter); },
    [currentPage, debouncedSearch, statusFilter, fetchCards]);

  const hasActiveFilters = Boolean(searchQuery || statusFilter);

  function handleClearFilters() { setSearchQuery(""); setStatusFilter(""); setCurrentPage(1); }

  function handleOpenCreate() {
    setShowCreate(true); setExpiresAt(getDefaultExpiryDate()); setExpiresAtErr(""); setCreateErr("");
    setMemberQuery(""); setMemberResults([]); setSelectedMember(null); setMemberErr("");
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    let hasError = false;
    if (!selectedMember) { setMemberErr("Please select a member."); hasError = true; }
    if (!expiresAt) { setExpiresAtErr("Expiry date is required."); hasError = true; }
    if (hasError) return;

    setIsCreating(true); setCreateErr("");
    try {
      const auth = getAuthorizationHeader();
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) },
        body: JSON.stringify({ memberId: selectedMember!.id, expiresAt }),
      });
      const r = await res.json();
      if (!r.success) { setCreateErr(r.message ?? "Failed to assign card."); return; }
      setShowCreate(false);
      void fetchCards(1, "", "");
      setCurrentPage(1);
    } catch { setCreateErr("Unable to reach the server."); }
    finally { setIsCreating(false); }
  }

  async function handleToggle(card: CardRecord) {
    setTogglingId(card.id);
    try {
      const auth = getAuthorizationHeader();
      const res = await fetch(`/api/cards/${card.id}/status`, {
        method: "PATCH",
        headers: auth ? { Authorization: auth } : {},
      });
      const r = await res.json();
      if (!r.success) { setListError(r.message ?? "Failed to update status."); return; }
      setCardList((prev) => prev.map((c) => c.id === card.id ? r.data as CardRecord : c));
    } catch { setListError("Unable to reach the server."); }
    finally { setTogglingId(null); }
  }

  // Minimum expiry date: tomorrow
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = formatDateInput(minDate);

  return (
    <div className="p-6 flex flex-col gap-6">
      <PageHeader
        title="Cards"
        subtitle={meta.total > 0 ? `${meta.total} card${meta.total !== 1 ? "s" : ""} total` : "Manage member cards"}
        actions={!showCreate ? <Button variant="primary" size="sm" onClick={handleOpenCreate}>Assign Card</Button> : undefined}
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <input type="search" placeholder="Search by card number..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-[var(--color-accent)] focus:ring-[var(--color-accent-soft)] bg-white transition-all" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as CardStatusFilter); setCurrentPage(1); }}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:border-[var(--color-accent)] focus:ring-[var(--color-accent-soft)] transition-all cursor-pointer">
          <option value="">All Status</option>
          <option value={CARD_STATUS.ACTIVE}>Active</option>
          <option value={CARD_STATUS.INACTIVE}>Inactive</option>
          <option value={CARD_STATUS.REPLACED}>Replaced</option>
          <option value={CARD_STATUS.EXPIRED}>Expired</option>
        </select>
        {hasActiveFilters && <Button variant="secondary" size="sm" onClick={handleClearFilters}>Clear Filters</Button>}
      </div>

      {/* Assign Card Form */}
      {showCreate && (
        <SectionCard title="Assign New Card">
          <p className="text-sm text-slate-500 mb-4">
            A unique card number is generated automatically. If the member already has an active card, it will be marked as "Replaced".
          </p>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4" noValidate>
            {/* Member search */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Member <span className="text-red-500">*</span></label>
              {selectedMember ? (
                <div className="flex items-center justify-between rounded-xl border border-[var(--color-accent-soft-line)] bg-[var(--color-accent-soft)]/40 px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{selectedMember.fullName}</p>
                    {selectedMember.mobileNumber && <p className="text-xs text-slate-500">{selectedMember.mobileNumber}</p>}
                    <p className="text-xs text-slate-400">Balance: ₹{selectedMember.walletBalance.toLocaleString("en-IN")}</p>
                  </div>
                  <button type="button" onClick={() => { setSelectedMember(null); setMemberQuery(""); setMemberErr(""); }}
                    className="text-xs text-[var(--color-accent-strong)] hover:text-[var(--color-accent-strong)] font-medium ml-3">Change</button>
                </div>
              ) : (
                <div className="relative">
                  <input type="text" placeholder="Type member name or mobile..." value={memberQuery}
                    onChange={(e) => { setMemberQuery(e.target.value); setMemberErr(""); }}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-[var(--color-accent)] focus:ring-[var(--color-accent-soft)] bg-white transition-all" />
                  {(memberResults.length > 0 || isSearchingMember) && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                      {isSearchingMember && <p className="px-4 py-3 text-xs text-slate-400">Searching...</p>}
                      {memberResults.map((m) => (
                        <button key={m.id} type="button"
                          onClick={() => { setSelectedMember(m); setMemberQuery(""); setMemberResults([]); setMemberErr(""); }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                          <p className="text-sm font-medium text-slate-800">{m.fullName}</p>
                          <p className="text-xs text-slate-400">{m.mobileNumber ?? "No mobile"} · ₹{m.walletBalance.toLocaleString("en-IN")}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {memberErr && <p className="text-xs font-medium text-red-600">{memberErr}</p>}
            </div>

            {/* Expiry date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Expiry Date <span className="text-red-500">*</span></label>
              <input type="date" value={expiresAt} min={minDateStr}
                onChange={(e) => { setExpiresAt(e.target.value); setExpiresAtErr(""); }}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:border-[var(--color-accent)] focus:ring-[var(--color-accent-soft)] bg-white transition-all" />
              {expiresAtErr && <p className="text-xs font-medium text-red-600">{expiresAtErr}</p>}
            </div>

            <div className="col-span-2 flex flex-col gap-3">
              {createErr && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{createErr}</div>}
              <div className="flex gap-3">
                <Button type="submit" variant="primary" isLoading={isCreating}>{isCreating ? "Assigning..." : "Assign Card"}</Button>
                <Button type="button" variant="secondary" onClick={() => setShowCreate(false)} disabled={isCreating}>Cancel</Button>
              </div>
            </div>
          </form>
        </SectionCard>
      )}

      {/* Cards Table */}
      <SectionCard title="All Cards" noPadding
        actions={<Button variant="secondary" size="sm" onClick={() => void fetchCards(currentPage, debouncedSearch, statusFilter)} disabled={isLoading}>{isLoading ? "Loading..." : "Refresh"}</Button>}>
        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-2">
            <span className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:300ms]" />
            </span>
            <span className="text-sm text-slate-400">Loading cards...</span>
          </div>
        )}
        {!isLoading && listError && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-red-500">{listError}</p>
            <Button variant="secondary" size="sm" onClick={() => { setListError(""); void fetchCards(currentPage, debouncedSearch, statusFilter); }}>Try Again</Button>
          </div>
        )}
        {!isLoading && !listError && cardList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            {hasActiveFilters
              ? <><p className="text-sm font-medium text-slate-500">No cards match your filters.</p><div className="mt-2"><Button variant="secondary" size="sm" onClick={handleClearFilters}>Clear Filters</Button></div></>
              : <><p className="text-sm font-medium text-slate-500">No cards assigned yet.</p><p className="text-xs text-slate-400">Use the Assign Card button above.</p></>}
          </div>
        )}
        {!isLoading && !listError && cardList.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[680px]">
              <thead>
                <tr>
                  {["Member", "Card Number", "Status", "Expires", "Assigned", "Actions"].map((h) => (
                    <th key={h} className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-[var(--color-paper)] border-b border-slate-100 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {cardList.map((card) => (
                  <tr key={card.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{card.memberName}</td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-700">{card.cardNumber}</td>
                    <td className="px-6 py-4"><Badge label={card.status} variant={getCardStatusVariant(card.status)} /></td>
                    <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">{formatDate(card.expiresAt)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">{formatDate(card.createdAt)}</td>
                    <td className="px-6 py-4">
                      {(card.status === CARD_STATUS.ACTIVE || card.status === CARD_STATUS.INACTIVE) ? (
                        <button type="button" onClick={() => void handleToggle(card)} disabled={togglingId === card.id}
                          className={["text-xs font-medium transition-colors disabled:opacity-40", card.status === CARD_STATUS.ACTIVE ? "text-red-500 hover:text-red-600" : "text-green-600 hover:text-green-700"].join(" ")}>
                          {togglingId === card.id ? "Updating..." : card.status === CARD_STATUS.ACTIVE ? "Deactivate" : "Activate"}
                        </button>
                      ) : <span className="text-xs text-slate-300">—</span>}
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
