"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, UserCheck, UserX } from "lucide-react";

import {
  Badge,
  Button,
  Input,
  PageHeader,
  SectionCard,
  StatCard,
  getStatusVariant,
} from "@/components/ui";
import { getAuthorizationHeader } from "@/lib/auth-storage";
import { PAGINATION, RECORD_STATUS } from "@/lib/constants";
import type { PaginationMeta } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemberRecord {
  id: string;
  fullName: string;
  mobileNumber: string | null;
  referenceDetails: string | null;
  status: string;
  walletId: string;
  walletBalance: number;
  isReady: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MembersStats {
  total: number;
  active: number;
  inactive: number;
}

interface ReadinessChecks {
  memberActive: boolean;
  walletExists: boolean;
  walletActive: boolean;
  cardAssigned: boolean;
  cardActive: boolean;
  cardNotExpired: boolean;
}

interface ReadinessStatus {
  isReady: boolean;
  checks: ReadinessChecks;
}

interface MemberDetailRecord {
  id: string;
  fullName: string;
  mobileNumber: string | null;
  referenceDetails: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  wallet: { id: string; currentBalance: number; status: string } | null;
  card: {
    id: string;
    cardNumber: string;
    status: string;
    expiresAt: string;
  } | null;
  readiness: ReadinessStatus;
}

interface CreateFormData {
  fullName: string;
  mobileNumber: string;
  referenceDetails: string;
}

interface EditFormData {
  fullName: string;
  mobileNumber: string;
  referenceDetails: string;
}

type CreateFormErrors = Partial<Record<keyof CreateFormData, string>>;
type EditFormErrors = Partial<Record<keyof EditFormData, string>>;

// ─── Readiness Check Config  ────────────────────────────────────

interface ReadinessCheckItem {
  key: keyof ReadinessChecks;
  label: string;
  failureHint: string;
}

const READINESS_ITEMS: ReadinessCheckItem[] = [
  {
    key: "memberActive",
    label: "Member is active",
    failureHint: "Reactivate this member account",
  },
  {
    key: "walletExists",
    label: "Wallet exists",
    failureHint: "Contact system administrator",
  },
  {
    key: "walletActive",
    label: "Wallet is active",
    failureHint: "Activate the wallet in the Wallets module",
  },
  {
    key: "cardAssigned",
    label: "Card assigned",
    failureHint: "Assign a card in the Cards module",
  },
  {
    key: "cardActive",
    label: "Card is active",
    failureHint: "Activate the card in the Cards module",
  },
  {
    key: "cardNotExpired",
    label: "Card is not expired",
    failureHint: "Issue a replacement card",
  },
];

// ─── Validation ───────────────────────────────────────────────────────────────

function validateCreateForm(data: CreateFormData): CreateFormErrors {
  const errors: CreateFormErrors = {};
  if (!data.fullName.trim()) errors.fullName = "Full name is required.";
  else if (data.fullName.trim().length < 2)
    errors.fullName = "At least 2 characters.";
  if (
    data.mobileNumber.trim() &&
    !/^[6-9]\d{9}$/.test(data.mobileNumber.trim())
  ) {
    errors.mobileNumber = "Enter a valid 10-digit mobile number.";
  }
  if (data.referenceDetails.trim().length > 300)
    errors.referenceDetails = "Max 300 characters.";
  return errors;
}

function validateEditForm(data: EditFormData): EditFormErrors {
  const errors: EditFormErrors = {};
  if (!data.fullName.trim()) errors.fullName = "Full name cannot be empty.";
  else if (data.fullName.trim().length < 2)
    errors.fullName = "At least 2 characters.";
  if (
    data.mobileNumber.trim() &&
    !/^[6-9]\d{9}$/.test(data.mobileNumber.trim())
  ) {
    errors.mobileNumber = "Enter a valid 10-digit mobile number.";
  }
  if (data.referenceDetails.trim().length > 300)
    errors.referenceDetails = "Max 300 characters.";
  return errors;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

const INITIAL_CREATE_DATA: CreateFormData = {
  fullName: "",
  mobileNumber: "",
  referenceDetails: "",
};
const INITIAL_META: PaginationMeta = {
  page: 1,
  limit: PAGINATION.DEFAULT_LIMIT,
  total: 0,
  totalPages: 0,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function MembersContent() {
  // ── 1. List State ─────────────────────────────────────────────────────────
  const [memberList, setMemberList] = useState<MemberRecord[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(INITIAL_META);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState("");

  // ── 2. Search + Filter ────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // ── 3. Create Form ────────────────────────────────────────────────────────
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createData, setCreateData] =
    useState<CreateFormData>(INITIAL_CREATE_DATA);
  const [createErrors, setCreateErrors] = useState<CreateFormErrors>({});
  const [createRequestError, setCreateRequestError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // ── 4. Edit Form ──────────────────────────────────────────────────────────
  const [editingMember, setEditingMember] = useState<MemberRecord | null>(null);
  const [editData, setEditData] = useState<EditFormData>({
    fullName: "",
    mobileNumber: "",
    referenceDetails: "",
  });
  const [editErrors, setEditErrors] = useState<EditFormErrors>({});
  const [editRequestError, setEditRequestError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // ── 5. Status Toggle ──────────────────────────────────────────────────────
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── 6. Detail Panel ───────────────────────────────────────────────────────
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MemberDetailRecord | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [stats, setStats] = useState<MembersStats | null>(null);

  // ── Debounce ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Fetch Stats - NEW ON DAY 20 ───────────────────────────────────────────
  const fetchStats = useCallback(async (): Promise<void> => {
    try {
      const authHeader = getAuthorizationHeader();
      const response = await fetch("/api/members/stats", {
        headers: authHeader ? { Authorization: authHeader } : {},
      });
      const result = await response.json();
      if (result.success) setStats(result.data as MembersStats);
    } catch {
      // Stats failing is non-critical - the page still works without them
    }
  }, []);

  // ── Fetch List ────────────────────────────────────────────────────────────
  const fetchMembers = useCallback(
    async (page: number, search: string, status: string): Promise<void> => {
      setIsLoading(true);
      setListError("");
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(PAGINATION.DEFAULT_LIMIT));
        if (search) params.set("search", search);
        if (status) params.set("status", status);
        const authHeader = getAuthorizationHeader();
        const response = await fetch(`/api/members?${params.toString()}`, {
          headers: authHeader ? { Authorization: authHeader } : {},
        });
        const result = await response.json();
        if (!result.success) {
          setListError(result.message ?? "Failed to load members.");
          return;
        }
        setMemberList(result.data as MemberRecord[]);
        if (result.meta) setMeta(result.meta as PaginationMeta);
      } catch {
        setListError("Unable to reach the server.");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Fetch stats once on mount, fetch list whenever filters change
  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);
  useEffect(() => {
    void fetchMembers(currentPage, debouncedSearch, statusFilter);
  }, [currentPage, debouncedSearch, statusFilter, fetchMembers]);

  // ── Fetch Detail ──────────────────────────────────────────────────────────
  const fetchDetail = useCallback(async (memberId: string): Promise<void> => {
    setIsDetailLoading(true);
    setDetailError("");
    setDetail(null);
    try {
      const authHeader = getAuthorizationHeader();
      const response = await fetch(`/api/members/${memberId}`, {
        headers: authHeader ? { Authorization: authHeader } : {},
      });
      const result = await response.json();
      if (!result.success) {
        setDetailError(result.message ?? "Failed to load member detail.");
        return;
      }
      console.log(result);
      setDetail(result.data as MemberDetailRecord);
    } catch {
      setDetailError("Unable to reach the server.");
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedMemberId) void fetchDetail(selectedMemberId);
    else {
      setDetail(null);
      setDetailError("");
    }
  }, [selectedMemberId, fetchDetail]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const hasActiveFilters = Boolean(searchQuery || statusFilter);

  function handleClearFilters(): void {
    setSearchQuery("");
    setStatusFilter("");
    setCurrentPage(1);
  }

  function closeAllPanels(): void {
    setShowCreateForm(false);
    setCreateData(INITIAL_CREATE_DATA);
    setCreateErrors({});
    setCreateRequestError("");
    setEditingMember(null);
    setEditData({ fullName: "", mobileNumber: "", referenceDetails: "" });
    setEditErrors({});
    setEditRequestError("");
  }

  function handleRowClick(member: MemberRecord): void {
    setSelectedMemberId((prev) => (prev === member.id ? null : member.id));
  }

  // ── Create Handlers ───────────────────────────────────────────────────────
  function handleCreateChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void {
    const { name, value } = e.target;
    setCreateData((prev) => ({ ...prev, [name]: value }));
    if (createErrors[name as keyof CreateFormData])
      setCreateErrors((prev) => ({ ...prev, [name]: "" }));
    if (createRequestError) setCreateRequestError("");
  }

  async function handleCreateSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    e.preventDefault();
    const errors = validateCreateForm(createData);
    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }
    setIsCreating(true);
    setCreateRequestError("");
    try {
      const authHeader = getAuthorizationHeader();
      const response = await fetch("/api/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({
          fullName: createData.fullName,
          mobileNumber: createData.mobileNumber || undefined,
          referenceDetails: createData.referenceDetails || undefined,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        if (result.errors?.length > 0) {
          const be: CreateFormErrors = {};
          (result.errors as Array<{ field: string; message: string }>).forEach(
            (err) => {
              be[err.field as keyof CreateFormData] = err.message;
            },
          );
          setCreateErrors(be);
        } else {
          setCreateRequestError(result.message ?? "Failed to enrol member.");
        }
        return;
      }
      closeAllPanels();
      handleClearFilters();
      void fetchMembers(1, "", "");
      void fetchStats(); // refresh counts after new enrolment
    } catch {
      setCreateRequestError("Unable to reach the server.");
    } finally {
      setIsCreating(false);
    }
  }

  // ── Edit Handlers ─────────────────────────────────────────────────────────
  function handleOpenEdit(member: MemberRecord): void {
    closeAllPanels();
    setEditingMember(member);
    setEditData({
      fullName: member.fullName,
      mobileNumber: member.mobileNumber ?? "",
      referenceDetails: member.referenceDetails ?? "",
    });
  }

  function handleEditChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
    if (editErrors[name as keyof EditFormData])
      setEditErrors((prev) => ({ ...prev, [name]: "" }));
    if (editRequestError) setEditRequestError("");
  }

  async function handleEditSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    e.preventDefault();
    if (!editingMember) return;
    const errors = validateEditForm(editData);
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }
    setIsEditing(true);
    setEditRequestError("");
    try {
      const authHeader = getAuthorizationHeader();
      const response = await fetch(`/api/members/${editingMember.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({
          fullName: editData.fullName,
          mobileNumber: editData.mobileNumber,
          referenceDetails: editData.referenceDetails,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        if (result.errors?.length > 0) {
          const be: EditFormErrors = {};
          (result.errors as Array<{ field: string; message: string }>).forEach(
            (err) => {
              be[err.field as keyof EditFormData] = err.message;
            },
          );
          setEditErrors(be);
        } else {
          setEditRequestError(result.message ?? "Failed to update member.");
        }
        return;
      }
      const updated = result.data as MemberRecord;
      setMemberList((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m)),
      );
      if (selectedMemberId === updated.id) void fetchDetail(updated.id);
      closeAllPanels();
    } catch {
      setEditRequestError("Unable to reach the server.");
    } finally {
      setIsEditing(false);
    }
  }

  // ── Toggle Handler ────────────────────────────────────────────────────────
  async function handleToggleStatus(member: MemberRecord): Promise<void> {
    setTogglingId(member.id);
    try {
      const authHeader = getAuthorizationHeader();
      const response = await fetch(`/api/members/${member.id}/status`, {
        method: "PATCH",
        headers: authHeader ? { Authorization: authHeader } : {},
      });
      const result = await response.json();
      if (!result.success) {
        setListError(result.message ?? "Failed to update status.");
        return;
      }
      const updated = result.data as MemberRecord;
      setMemberList((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m)),
      );
      if (selectedMemberId === updated.id) void fetchDetail(updated.id);
      void fetchStats(); // refresh active/inactive counts after status change
    } catch {
      setListError("Unable to reach the server.");
    } finally {
      setTogglingId(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 flex flex-col gap-6">
      <PageHeader
        title="Members"
        subtitle={
          meta.total > 0
            ? `${meta.total} member${meta.total !== 1 ? "s" : ""} enrolled`
            : "Enrol and manage members"
        }
        actions={
          !showCreateForm && !editingMember ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                closeAllPanels();
                setShowCreateForm(true);
              }}
            >
              New Member
            </Button>
          ) : undefined
        }
      />

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Total Enrolled"
            value={stats.total}
            icon={Users}
            tone="neutral"
          />
          <StatCard
            label="Active"
            value={stats.active}
            icon={UserCheck}
            tone="positive"
          />
          <StatCard
            label="Inactive"
            value={stats.inactive}
            icon={UserX}
            tone="negative"
          />
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <input
            type="search"
            placeholder="Search by name or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-[var(--color-accent)] focus:ring-[var(--color-accent-soft)] bg-white transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:border-[var(--color-accent)] focus:ring-[var(--color-accent-soft)] transition-all cursor-pointer"
        >
          <option value="">All Status</option>
          <option value={RECORD_STATUS.ACTIVE}>Active</option>
          <option value={RECORD_STATUS.INACTIVE}>Inactive</option>
        </select>
        {hasActiveFilters && (
          <Button variant="secondary" size="sm" onClick={handleClearFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <SectionCard title="Enrol New Member">
          <p className="text-sm text-slate-500 mb-4">
            A wallet with ₹0 balance is created automatically.
          </p>
          <form
            onSubmit={handleCreateSubmit}
            className="grid grid-cols-2 gap-4"
            noValidate
          >
            <Input
              label="Full Name"
              name="fullName"
              type="text"
              placeholder="Enter full name"
              value={createData.fullName}
              onChange={handleCreateChange}
              error={createErrors.fullName}
              required
              autoComplete="off"
            />
            <Input
              label="Mobile Number"
              name="mobileNumber"
              type="text"
              placeholder="10-digit number (optional)"
              value={createData.mobileNumber}
              onChange={handleCreateChange}
              error={createErrors.mobileNumber}
              hint="Optional."
              autoComplete="off"
            />
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                Reference Details
              </label>
              <textarea
                name="referenceDetails"
                placeholder="Employee ID, department, or any reference note (optional)"
                value={createData.referenceDetails}
                onChange={handleCreateChange}
                rows={2}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-[var(--color-accent)] focus:ring-[var(--color-accent-soft)] bg-white transition-all resize-none"
              />
              {createErrors.referenceDetails && (
                <p className="text-xs font-medium text-red-600">
                  {createErrors.referenceDetails}
                </p>
              )}
            </div>
            <div className="col-span-2 flex flex-col gap-3">
              {createRequestError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {createRequestError}
                </div>
              )}
              <div className="flex gap-3">
                <Button type="submit" variant="primary" isLoading={isCreating}>
                  {isCreating ? "Enrolling..." : "Enrol Member"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeAllPanels}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </SectionCard>
      )}

      {/* Edit Form */}
      {editingMember && (
        <SectionCard title={`Edit: ${editingMember.fullName}`}>
          <form
            onSubmit={handleEditSubmit}
            className="grid grid-cols-2 gap-4"
            noValidate
          >
            <Input
              label="Full Name"
              name="fullName"
              type="text"
              placeholder="Enter full name"
              value={editData.fullName}
              onChange={handleEditChange}
              error={editErrors.fullName}
              required
              autoComplete="off"
            />
            <Input
              label="Mobile Number"
              name="mobileNumber"
              type="text"
              placeholder="Leave blank to clear"
              value={editData.mobileNumber}
              onChange={handleEditChange}
              error={editErrors.mobileNumber}
              hint="Leave blank to remove."
              autoComplete="off"
            />
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                Reference Details
              </label>
              <textarea
                name="referenceDetails"
                placeholder="Leave blank to clear"
                value={editData.referenceDetails}
                onChange={handleEditChange}
                rows={2}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-[var(--color-accent)] focus:ring-[var(--color-accent-soft)] bg-white transition-all resize-none"
              />
              {editErrors.referenceDetails && (
                <p className="text-xs font-medium text-red-600">
                  {editErrors.referenceDetails}
                </p>
              )}
            </div>
            <div className="col-span-2 flex flex-col gap-3">
              {editRequestError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {editRequestError}
                </div>
              )}
              <div className="flex gap-3">
                <Button type="submit" variant="primary" isLoading={isEditing}>
                  {isEditing ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeAllPanels}
                  disabled={isEditing}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </SectionCard>
      )}

      <div
        className={selectedMemberId ? "grid gap-4 items-start" : ""}
        style={selectedMemberId ? { gridTemplateColumns: "1fr 320px" } : {}}
      >
        <SectionCard
          title="All Members"
          noPadding
          actions={
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                void fetchMembers(currentPage, debouncedSearch, statusFilter)
              }
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Refresh"}
            </Button>
          }
        >
          {isLoading && (
            <div className="flex items-center justify-center py-16 gap-2">
              <span className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:300ms]" />
              </span>
              <span className="text-sm text-slate-400">Loading members...</span>
            </div>
          )}
          {!isLoading && listError && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-sm text-red-500">{listError}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setListError("");
                  void fetchMembers(currentPage, debouncedSearch, statusFilter);
                }}
              >
                Try Again
              </Button>
            </div>
          )}
          {!isLoading && !listError && memberList.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              {hasActiveFilters ? (
                <>
                  <p className="text-sm font-medium text-slate-500">
                    No members match your current filters.
                  </p>
                  <div className="mt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleClearFilters}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-500">
                    No members enrolled yet.
                  </p>
                  <p className="text-xs text-slate-400">
                    Use the New Member button to enrol the first member.
                  </p>
                </>
              )}
            </div>
          )}
          {!isLoading && !listError && memberList.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[760px]">
                <thead>
                  <tr>
                    {[
                      "Member",
                      "Mobile",
                      "Balance",
                      "Readiness",
                      "Status",
                      "Enrolled",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-[var(--color-paper)] border-b border-slate-100 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {memberList.map((member) => {
                    const isSelected = selectedMemberId === member.id;
                    return (
                      <tr
                        key={member.id}
                        onClick={() => handleRowClick(member)}
                        className={[
                          "cursor-pointer transition-colors duration-100",
                          isSelected
                            ? "bg-[var(--color-accent-soft)]/40/60 hover:bg-[var(--color-accent-soft)]/40/80"
                            : "hover:bg-slate-50/50",
                        ].join(" ")}
                      >
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-slate-800 leading-tight">
                            {member.fullName}
                          </p>
                          {member.referenceDetails && (
                            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[160px]">
                              {member.referenceDetails}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                          {member.mobileNumber ?? (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-slate-700">
                            {formatCurrency(member.walletBalance)}
                          </span>
                        </td>

                        {/* Readiness column - NEW ON DAY 20 */}
                        <td className="px-6 py-4">
                          <span
                            className={[
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                              member.isReady
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700",
                            ].join(" ")}
                          >
                            <span
                              className={[
                                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                member.isReady
                                  ? "bg-green-500"
                                  : "bg-amber-500",
                              ].join(" ")}
                            />
                            {member.isReady ? "Ready" : "Not ready"}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <Badge
                            label={member.status}
                            variant={getStatusVariant(member.status)}
                          />
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                          {formatDate(member.createdAt)}
                        </td>
                        <td
                          className="px-6 py-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(member)}
                              disabled={!!togglingId}
                              className="text-xs font-medium text-[var(--color-accent-strong)] hover:text-[var(--color-accent-strong)] disabled:opacity-40 transition-colors"
                            >
                              Edit
                            </button>
                            <span className="text-slate-200">|</span>
                            <button
                              type="button"
                              onClick={() => void handleToggleStatus(member)}
                              disabled={togglingId === member.id}
                              className={[
                                "text-xs font-medium transition-colors disabled:opacity-40",
                                member.status === RECORD_STATUS.ACTIVE
                                  ? "text-red-500 hover:text-red-600"
                                  : "text-green-600 hover:text-green-700",
                              ].join(" ")}
                            >
                              {togglingId === member.id
                                ? "Updating..."
                                : member.status === RECORD_STATUS.ACTIVE
                                  ? "Deactivate"
                                  : "Activate"}
                            </button>
                          </div>
                        </td>
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
                Showing{" "}
                <span className="font-medium text-slate-700">
                  {(currentPage - 1) * meta.limit + 1}
                </span>
                {" – "}
                <span className="font-medium text-slate-700">
                  {Math.min(currentPage * meta.limit, meta.total)}
                </span>
                {" of "}
                <span className="font-medium text-slate-700">{meta.total}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-xs text-slate-500 min-w-[80px] text-center">
                  Page {currentPage} of {meta.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage === meta.totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(meta.totalPages, p + 1))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Detail Panel (Days 18-19, unchanged) */}
        {selectedMemberId && (
          <aside className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                Member Details
              </h3>
              <button
                type="button"
                onClick={() => setSelectedMemberId(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors text-lg leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            {isDetailLoading && (
              <div className="flex items-center justify-center py-12 gap-2">
                <span className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            )}
            {!isDetailLoading && detailError && (
              <div className="px-5 py-6 flex flex-col items-center gap-3">
                <p className="text-sm text-red-500 text-center">
                  {detailError}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void fetchDetail(selectedMemberId)}
                >
                  Retry
                </Button>
              </div>
            )}
            {!isDetailLoading && !detailError && detail && (
              <div className="px-5 py-5 flex flex-col gap-5">
                {/* Identity */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center text-[var(--color-accent-strong)] font-bold text-base flex-shrink-0">
                    {detail.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 break-words">
                      {detail.fullName}
                    </p>
                    {detail.mobileNumber && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {detail.mobileNumber}
                      </p>
                    )}
                    {detail.referenceDetails && (
                      <p className="text-xs text-slate-400 mt-0.5 break-words">
                        {detail.referenceDetails}
                      </p>
                    )}
                  </div>
                </div>
                <Badge
                  label={detail.status}
                  variant={getStatusVariant(detail.status)}
                />
                <div className="border-t border-slate-100" />

                {/* Wallet */}
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Wallet
                  </p>
                  {detail.wallet ? (
                    <div className="bg-slate-50 rounded-xl px-4 py-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Balance</span>
                        <span className="text-base font-bold text-[var(--color-text)] font-price">
                          {formatCurrency(detail.wallet.currentBalance)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Status</span>
                        <Badge
                          label={detail.wallet.status}
                          variant={getStatusVariant(detail.wallet.status)}
                        />
                      </div>
                      <div>
                        <span className="text-xs text-slate-400">ID: </span>
                        <span className="text-xs font-mono text-slate-500 break-all">
                          {detail.wallet.id}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 rounded-xl px-4 py-3">
                      <p className="text-xs text-amber-700">No wallet found.</p>
                    </div>
                  )}
                </div>
                <div className="border-t border-slate-100" />

                {/* Card */}
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Card
                  </p>
                  {detail.card ? (
                    <div className="bg-slate-50 rounded-xl px-4 py-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          Card Number
                        </span>
                        <span className="text-xs font-mono font-medium text-slate-700">
                          {detail.card.cardNumber}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Status</span>
                        <Badge
                          label={detail.card.status}
                          variant={getStatusVariant(detail.card.status)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Expires</span>
                        <span className="text-xs text-slate-600">
                          {formatDate(detail.card.expiresAt)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-4 text-center">
                      <p className="text-xs font-medium text-slate-400">
                        No card assigned yet
                      </p>
                      <p className="text-xs text-slate-300 mt-1">
                        Cards are assigned in the Cards module
                      </p>
                    </div>
                  )}
                </div>
                <div className="border-t border-slate-100" />

                {/* Readiness */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Billing Readiness
                    </p>
                    <span
                      className={[
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
                        detail.readiness.isReady
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700",
                      ].join(" ")}
                    >
                      {detail.readiness.isReady ? "✓ Ready" : "⚠ Not ready"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {READINESS_ITEMS.map(({ key, label, failureHint }) => {
                      const passed = detail.readiness.checks[key];
                      return (
                        <div key={key} className="flex items-start gap-2">
                          <span
                            className={[
                              "flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold mt-0.5",
                              passed
                                ? "bg-green-100 text-green-600"
                                : "bg-red-100 text-red-500",
                            ].join(" ")}
                          >
                            {passed ? "✓" : "✗"}
                          </span>
                          <div className="min-w-0">
                            <p
                              className={[
                                "text-xs font-medium",
                                passed ? "text-slate-600" : "text-slate-500",
                              ].join(" ")}
                            >
                              {label}
                            </p>
                            {!passed && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                {failureHint}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="border-t border-slate-100" />

                {/* Dates */}
                <dl className="flex flex-col gap-2">
                  <div>
                    <dt className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">
                      Enrolled
                    </dt>
                    <dd className="text-xs text-slate-600">
                      {formatDateTime(detail.createdAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">
                      Last Updated
                    </dt>
                    <dd className="text-xs text-slate-600">
                      {formatDateTime(detail.updatedAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">
                      Member ID
                    </dt>
                    <dd className="text-xs font-mono text-slate-500 break-all">
                      {detail.id}
                    </dd>
                  </div>
                </dl>

                {/* Quick Actions */}
                <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Quick Actions
                  </p>
                  {(() => {
                    const listMember = memberList.find(
                      (m) => m.id === detail.id,
                    );
                    if (!listMember) return null;
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(listMember)}
                          className="w-full text-left text-xs font-medium text-[var(--color-accent-strong)] hover:text-[var(--color-accent-strong)] py-1 transition-colors"
                        >
                          Edit member profile →
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleToggleStatus(listMember)}
                          disabled={togglingId === detail.id}
                          className={[
                            "w-full text-left text-xs font-medium py-1 transition-colors disabled:opacity-40",
                            detail.status === RECORD_STATUS.ACTIVE
                              ? "text-red-500 hover:text-red-600"
                              : "text-green-600 hover:text-green-700",
                          ].join(" ")}
                        >
                          {togglingId === detail.id
                            ? "Updating..."
                            : detail.status === RECORD_STATUS.ACTIVE
                              ? "Deactivate member →"
                              : "Activate member →"}
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
