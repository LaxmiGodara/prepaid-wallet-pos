"use client";

import { useCallback, useEffect, useState } from "react";

import {
  Badge,
  Button,
  Input,
  PageHeader,
  SectionCard,
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
  createdAt: string;
  updatedAt: string;
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
  if (data.referenceDetails.trim().length > 300) {
    errors.referenceDetails = "Must not exceed 300 characters.";
  }
  return errors;
}

function validateEditForm(data: EditFormData): EditFormErrors {
  const errors: EditFormErrors = {};
  // fullName is always present in the edit form (pre-filled from existing)
  if (!data.fullName.trim()) errors.fullName = "Full name cannot be empty.";
  else if (data.fullName.trim().length < 2)
    errors.fullName = "At least 2 characters.";
  if (
    data.mobileNumber.trim() &&
    !/^[6-9]\d{9}$/.test(data.mobileNumber.trim())
  ) {
    errors.mobileNumber = "Enter a valid 10-digit mobile number.";
  }
  if (data.referenceDetails.trim().length > 300) {
    errors.referenceDetails = "Must not exceed 300 characters.";
  }
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

  // ── 2. Search + Filter State ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // ── 3. Create Form State ──────────────────────────────────────────────────
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createData, setCreateData] =
    useState<CreateFormData>(INITIAL_CREATE_DATA);
  const [createErrors, setCreateErrors] = useState<CreateFormErrors>({});
  const [createRequestError, setCreateRequestError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // ── 4. Edit Form State - NEW ──────────────────────────────────────────────
  const [editingMember, setEditingMember] = useState<MemberRecord | null>(null);
  const [editData, setEditData] = useState<EditFormData>({
    fullName: "",
    mobileNumber: "",
    referenceDetails: "",
  });
  const [editErrors, setEditErrors] = useState<EditFormErrors>({});
  const [editRequestError, setEditRequestError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // ── 5. Status Toggle State - NEW ─────────────────────────────────────────
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── Debounce ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Fetch Members ─────────────────────────────────────────────────────────
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

  useEffect(() => {
    void fetchMembers(currentPage, debouncedSearch, statusFilter);
  }, [currentPage, debouncedSearch, statusFilter, fetchMembers]);

  // ── Shared Helpers ────────────────────────────────────────────────────────

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

  // ── Create Handlers ───────────────────────────────────────────────────────

  function handleCreateChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void {
    const { name, value } = event.target;
    setCreateData((prev) => ({ ...prev, [name]: value }));
    if (createErrors[name as keyof CreateFormData]) {
      setCreateErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (createRequestError) setCreateRequestError("");
  }

  async function handleCreateSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
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
            (e) => {
              be[e.field as keyof CreateFormData] = e.message;
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
    } catch {
      setCreateRequestError("Unable to reach the server.");
    } finally {
      setIsCreating(false);
    }
  }

  // ── Edit Handlers  ───────────────────────────────────────────────────

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
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void {
    const { name, value } = event.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
    if (editErrors[name as keyof EditFormData]) {
      setEditErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (editRequestError) setEditRequestError("");
  }

  async function handleEditSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
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
          // Send the value even if empty - empty string means "clear this field"
          mobileNumber: editData.mobileNumber,
          referenceDetails: editData.referenceDetails,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        if (result.errors?.length > 0) {
          const be: EditFormErrors = {};
          (result.errors as Array<{ field: string; message: string }>).forEach(
            (e) => {
              be[e.field as keyof EditFormData] = e.message;
            },
          );
          setEditErrors(be);
        } else {
          setEditRequestError(result.message ?? "Failed to update member.");
        }
        return;
      }

      // Update this specific row in the list without a full re-fetch
      const updated = result.data as MemberRecord;
      setMemberList((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m)),
      );
      closeAllPanels();
    } catch {
      setEditRequestError("Unable to reach the server.");
    } finally {
      setIsEditing(false);
    }
  }

  // ── Status Toggle Handler  ───────────────────────────────────────────

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

      {/* Search + Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <input
            type="search"
            placeholder="Search by name or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-blue-400 focus:ring-blue-100 bg-white transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:border-blue-400 focus:ring-blue-100 transition-all cursor-pointer"
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

      {/* Create Form Panel */}
      {showCreateForm && (
        <SectionCard title="Enrol New Member">
          <p className="text-sm text-slate-500 mb-4">
            A wallet with ₹0 balance is created automatically for every new
            member.
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
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-blue-400 focus:ring-blue-100 bg-white transition-all resize-none"
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

      {/* Edit Form Panel - NEW */}
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
              placeholder="10-digit number (leave blank to clear)"
              value={editData.mobileNumber}
              onChange={handleEditChange}
              error={editErrors.mobileNumber}
              hint="Leave blank to remove the mobile number."
              autoComplete="off"
            />
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                Reference Details
              </label>
              <textarea
                name="referenceDetails"
                placeholder="Employee ID, department, or any reference note (leave blank to clear)"
                value={editData.referenceDetails}
                onChange={handleEditChange}
                rows={2}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-blue-400 focus:ring-blue-100 bg-white transition-all resize-none"
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

      {/* Members Table */}
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
            <table className="w-full border-collapse min-w-[720px]">
              <thead>
                <tr>
                  {[
                    "Member",
                    "Mobile",
                    "Wallet Balance",
                    "Status",
                    "Enrolled",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/80 border-b border-slate-100 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {memberList.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-slate-50/50 transition-colors duration-100"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-slate-800 leading-tight">
                          {member.fullName}
                        </p>
                        {member.referenceDetails && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[180px]">
                            {member.referenceDetails}
                          </p>
                        )}
                      </div>
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

                    <td className="px-6 py-4">
                      <Badge
                        label={member.status}
                        variant={getStatusVariant(member.status)}
                      />
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                      {formatDate(member.createdAt)}
                    </td>

                    {/* Actions - NEW */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(member)}
                          disabled={!!togglingId}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-40 transition-colors"
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
                ))}
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
    </div>
  );
}
