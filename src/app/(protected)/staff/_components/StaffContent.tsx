"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  Badge,
  Button,
  Input,
  PageHeader,
  SectionCard,
  getRoleVariant,
  getStatusVariant,
} from "@/components/ui";
import { useSession } from "@/contexts/SessionContext";
import { getAuthorizationHeader } from "@/lib/auth-storage";
import { PAGINATION, RECORD_STATUS, STAFF_ROLES } from "@/lib/constants";
import type { PaginationMeta } from "@/types";

interface StaffRecord {
  id: string;
  fullName: string;
  username: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateFormData {
  fullName: string;
  username: string;
  password: string;
  confirmPassword: string;
  role: string;
}

interface EditFormData {
  fullName: string;
  role: string;
}

interface ResetFormData {
  newPassword: string;
  confirmNewPassword: string;
}

type CreateFormErrors = Partial<Record<keyof CreateFormData, string>>;
type EditFormErrors = Partial<Record<keyof EditFormData, string>>;
type ResetFormErrors = Partial<Record<keyof ResetFormData, string>>;

function validateCreateForm(data: CreateFormData): CreateFormErrors {
  const errors: CreateFormErrors = {};
  if (!data.fullName.trim()) errors.fullName = "Full name is required.";
  else if (data.fullName.trim().length < 2)
    errors.fullName = "At least 2 characters.";
  const username = data.username.trim().toLowerCase();
  if (!username) errors.username = "Username is required.";
  else if (username.length < 3) errors.username = "At least 3 characters.";
  else if (!/^[a-z0-9_]+$/.test(username))
    errors.username = "Lowercase letters, numbers, underscores only.";
  if (!data.password) errors.password = "Password is required.";
  else if (data.password.length < 8) errors.password = "At least 8 characters.";
  if (!data.confirmPassword)
    errors.confirmPassword = "Please confirm the password.";
  else if (data.password !== data.confirmPassword)
    errors.confirmPassword = "Passwords do not match.";
  if (!data.role) errors.role = "Role is required.";
  return errors;
}

function validateEditForm(data: EditFormData): EditFormErrors {
  const errors: EditFormErrors = {};
  if (!data.fullName.trim()) errors.fullName = "Full name cannot be empty.";
  else if (data.fullName.trim().length < 2)
    errors.fullName = "At least 2 characters.";
  if (!data.role) errors.role = "Role is required.";
  return errors;
}

function validateResetForm(data: ResetFormData): ResetFormErrors {
  const errors: ResetFormErrors = {};
  if (!data.newPassword) errors.newPassword = "New password is required.";
  else if (data.newPassword.length < 8)
    errors.newPassword = "At least 8 characters.";
  if (!data.confirmNewPassword)
    errors.confirmNewPassword = "Please confirm the password.";
  else if (data.newPassword !== data.confirmNewPassword)
    errors.confirmNewPassword = "Passwords do not match.";
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

const INITIAL_CREATE_DATA: CreateFormData = {
  fullName: "",
  username: "",
  password: "",
  confirmPassword: "",
  role: STAFF_ROLES.CASHIER,
};

const INITIAL_META: PaginationMeta = {
  page: 1,
  limit: PAGINATION.DEFAULT_LIMIT,
  total: 0,
  totalPages: 0,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function StaffContent() {
  const { session, hasRole } = useSession();

  // ── 1. List State ─────────────────────────────────────────────────────────
  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(INITIAL_META);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState("");

  // ── 2. Create Form State ──────────────────────────────────────────────────
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createData, setCreateData] =
    useState<CreateFormData>(INITIAL_CREATE_DATA);
  const [createErrors, setCreateErrors] = useState<CreateFormErrors>({});
  const [createRequestError, setCreateRequestError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // ── 3. Edit Form State ────────────────────────────────────────────────────
  const [editingStaff, setEditingStaff] = useState<StaffRecord | null>(null);
  const editFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingStaff && editFormRef.current) {
      editFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      const firstInput = editFormRef.current.querySelector("input:not([readonly])");
      if (firstInput instanceof HTMLInputElement) firstInput.focus();
    }
  }, [editingStaff]);
  const [editData, setEditData] = useState<EditFormData>({
    fullName: "",
    role: "",
  });
  const [editErrors, setEditErrors] = useState<EditFormErrors>({});
  const [editRequestError, setEditRequestError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // ── 4. Status Toggle State ────────────────────────────────────────────────
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── 5. Reset Password State ───────────────────────────────────────────────
  const [resetTarget, setResetTarget] = useState<StaffRecord | null>(null);
  const resetFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resetTarget && resetFormRef.current) {
      resetFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [resetTarget]);
  const [resetData, setResetData] = useState<ResetFormData>({
    newPassword: "",
    confirmNewPassword: "",
  });
  const [resetErrors, setResetErrors] = useState<ResetFormErrors>({});
  const [resetRequestError, setResetRequestError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // ── 6. Search + Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // ── 7. Detail Panel State
  const [selectedStaff, setSelectedStaff] = useState<StaffRecord | null>(null);

  // ── Debounce Effect
  // Waits 400ms after the last keystroke before updating debouncedSearch.
  // The cleanup function cancels the timer if searchQuery changes again
  // before the 400ms completes - this is what makes it a debounce.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      // Reset to page 1 when search term finally settles.
      // Done here (not in handleSearchChange) to avoid two page resets:
      // one when typing starts and one when debounce settles.
      setCurrentPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Fetch Staff ───────────────────────────────────────────────────────────
  // All filter values come in as parameters so the dependency array can
  // be empty - this function closes over nothing from external scope.
  const fetchStaff = useCallback(
    async (
      page: number,
      search: string,
      role: string,
      status: string,
    ): Promise<void> => {
      setIsLoading(true);
      setListError("");

      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(PAGINATION.DEFAULT_LIMIT));
        if (search) params.set("search", search);
        if (role) params.set("role", role);
        if (status) params.set("status", status);

        const authHeader = getAuthorizationHeader();
        const response = await fetch(`/api/staff?${params.toString()}`, {
          headers: authHeader ? { Authorization: authHeader } : {},
        });

        const result = await response.json();

        if (!result.success) {
          setListError(result.message ?? "Failed to load staff list.");
          return;
        }

        setStaffList(result.data as StaffRecord[]);
        if (result.meta) setMeta(result.meta as PaginationMeta);
      } catch {
        setListError("Unable to reach the server.");
      } finally {
        setIsLoading(false);
      }
    },
    [], // empty - all values come through parameters
  );

  useEffect(() => {
    void fetchStaff(currentPage, debouncedSearch, roleFilter, statusFilter);
  }, [currentPage, debouncedSearch, roleFilter, statusFilter, fetchStaff]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const hasActiveFilters = Boolean(searchQuery || roleFilter || statusFilter);

  function closeAllPanels(): void {
    setShowCreateForm(false);
    setCreateData(INITIAL_CREATE_DATA);
    setCreateErrors({});
    setCreateRequestError("");

    setEditingStaff(null);
    setEditData({ fullName: "", role: "" });
    setEditErrors({});
    setEditRequestError("");

    setResetTarget(null);
    setResetData({ newPassword: "", confirmNewPassword: "" });
    setResetErrors({});
    setResetRequestError("");
    setResetSuccess("");
  }

  function handleClearFilters(): void {
    setSearchQuery("");
    // debouncedSearch will clear via its useEffect
    setRoleFilter("");
    setStatusFilter("");
    setCurrentPage(1);
  }

  function canActOnStaff(staff: StaffRecord): boolean {
    if (staff.id === session.staff.id) return false;
    if (staff.role === STAFF_ROLES.SUPER_ADMIN) return false;
    if (
      session.staff.role === STAFF_ROLES.ADMIN &&
      staff.role === STAFF_ROLES.ADMIN
    )
      return false;
    return true;
  }

  const creatableRoles =
    session.staff.role === STAFF_ROLES.SUPER_ADMIN
      ? [STAFF_ROLES.ADMIN, STAFF_ROLES.CASHIER]
      : [STAFF_ROLES.CASHIER];

  const editableRoles =
    session.staff.role === STAFF_ROLES.SUPER_ADMIN
      ? [STAFF_ROLES.ADMIN, STAFF_ROLES.CASHIER]
      : [STAFF_ROLES.CASHIER];

  // ── Create Handlers ───────────────────────────────────────────────────────

  function handleCreateChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
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
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify(createData),
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
          setCreateRequestError(
            result.message ?? "Failed to create staff account.",
          );
        }
        return;
      }
      closeAllPanels();
      // Reset to page 1 and clear filters so the new record is visible
      handleClearFilters();
      void fetchStaff(1, "", "", "");
    } catch {
      setCreateRequestError("Unable to reach the server.");
    } finally {
      setIsCreating(false);
    }
  }

  // ── Edit Handlers ─────────────────────────────────────────────────────────

  function handleEditChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
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
    if (!editingStaff) return;
    const errors = validateEditForm(editData);
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }
    setIsEditing(true);
    setEditRequestError("");
    try {
      const authHeader = getAuthorizationHeader();
      const response = await fetch(`/api/staff/${editingStaff.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({
          fullName: editData.fullName,
          role: editData.role,
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
          setEditRequestError(result.message ?? "Failed to update.");
        }
        return;
      }
      const updated = result.data as StaffRecord;
      setStaffList((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s)),
      );
      // If this staff member is shown in the detail panel, update it too
      if (selectedStaff?.id === updated.id) setSelectedStaff(updated);
      closeAllPanels();
    } catch {
      setEditRequestError("Unable to reach the server.");
    } finally {
      setIsEditing(false);
    }
  }

  // ── Status Toggle Handler ─────────────────────────────────────────────────

  async function handleToggleStatus(staff: StaffRecord): Promise<void> {
    setTogglingId(staff.id);
    try {
      const authHeader = getAuthorizationHeader();
      const response = await fetch(`/api/staff/${staff.id}/status`, {
        method: "PATCH",
        headers: authHeader ? { Authorization: authHeader } : {},
      });
      const result = await response.json();
      if (!result.success) {
        setListError(result.message ?? "Failed to update status.");
        return;
      }
      const updated = result.data as StaffRecord;
      setStaffList((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s)),
      );
      if (selectedStaff?.id === updated.id) setSelectedStaff(updated);
    } catch {
      setListError("Unable to reach the server.");
    } finally {
      setTogglingId(null);
    }
  }

  // ── Reset Password Handlers ───────────────────────────────────────────────

  function handleResetChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const { name, value } = event.target;
    setResetData((prev) => ({ ...prev, [name]: value }));
    if (resetErrors[name as keyof ResetFormData]) {
      setResetErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (resetRequestError) setResetRequestError("");
    if (resetSuccess) setResetSuccess("");
  }

  async function handleResetSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (!resetTarget) return;
    const errors = validateResetForm(resetData);
    if (Object.keys(errors).length > 0) {
      setResetErrors(errors);
      return;
    }
    setIsResetting(true);
    setResetRequestError("");
    try {
      const authHeader = getAuthorizationHeader();
      const response = await fetch(`/api/staff/${resetTarget.id}/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify(resetData),
      });
      const result = await response.json();
      if (!result.success) {
        if (result.errors?.length > 0) {
          const be: ResetFormErrors = {};
          (result.errors as Array<{ field: string; message: string }>).forEach(
            (e) => {
              be[e.field as keyof ResetFormData] = e.message;
            },
          );
          setResetErrors(be);
        } else {
          setResetRequestError(result.message ?? "Failed to reset password.");
        }
        return;
      }
      setResetSuccess(
        `Password for ${resetTarget.fullName} has been reset. Share the new password with them securely.`,
      );
      setResetData({ newPassword: "", confirmNewPassword: "" });
      setTimeout(() => {
        setResetTarget(null);
        setResetSuccess("");
      }, 3000);
    } catch {
      setResetRequestError("Unable to reach the server.");
    } finally {
      setIsResetting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Page Header */}
      <PageHeader
        title="Staff Management"
        subtitle={
          meta.total > 0
            ? `${meta.total} staff member${meta.total !== 1 ? "s" : ""} total`
            : "Manage your team"
        }
        actions={
          !showCreateForm && !editingStaff && !resetTarget ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                closeAllPanels();
                setShowCreateForm(true);
              }}
            >
              New Staff
            </Button>
          ) : undefined
        }
      />

      {/* Search + Filter Bar - NEW ON DAY 15 */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search input */}
        <div className="flex-1 min-w-[200px] max-w-xs">
          <input
            type="search"
            placeholder="Search by name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-[var(--color-accent)] focus:ring-[var(--color-accent-soft)] bg-white transition-all"
          />
        </div>

        {/* Role filter */}
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:border-[var(--color-accent)] focus:ring-[var(--color-accent-soft)] transition-all cursor-pointer"
        >
          <option value="">All Roles</option>
          <option value={STAFF_ROLES.SUPER_ADMIN}>Super Admin</option>
          <option value={STAFF_ROLES.ADMIN}>Admin</option>
          <option value={STAFF_ROLES.CASHIER}>Cashier</option>
        </select>

        {/* Status filter */}
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

        {/* Clear filters - only shown when at least one filter is active */}
        {hasActiveFilters && (
          <Button variant="secondary" size="sm" onClick={handleClearFilters}>
            Clear Filters
          </Button>
        )}

        {/* Active filter count indicator */}
        {hasActiveFilters && (
          <span className="text-xs text-slate-500">
            {[searchQuery, roleFilter, statusFilter].filter(Boolean).length}{" "}
            filter
            {[searchQuery, roleFilter, statusFilter].filter(Boolean).length !==
            1
              ? "s"
              : ""}{" "}
            active
          </span>
        )}
      </div>

      {/* Create Form Panel */}
      {showCreateForm && (
        <SectionCard title="Create Staff Account">
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
              label="Username"
              name="username"
              type="text"
              placeholder="Choose a username"
              value={createData.username}
              onChange={handleCreateChange}
              error={createErrors.username}
              hint="Lowercase letters, numbers, underscores only."
              required
              autoComplete="off"
            />
            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="Min 8 characters"
              value={createData.password}
              onChange={handleCreateChange}
              error={createErrors.password}
              required
              autoComplete="new-password"
            />
            <Input
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              placeholder="Repeat password"
              value={createData.confirmPassword}
              onChange={handleCreateChange}
              error={createErrors.confirmPassword}
              required
              autoComplete="new-password"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                Role <span className="text-red-500 ml-0.5">*</span>
              </label>
              <select
                name="role"
                value={createData.role}
                onChange={handleCreateChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:border-[var(--color-accent)] focus:ring-[var(--color-accent-soft)] transition-all"
              >
                {creatableRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {createErrors.role && (
                <p className="text-xs font-medium text-red-600">
                  {createErrors.role}
                </p>
              )}
            </div>
            <div className="flex items-center">
              <p className="text-xs text-slate-400">
                {session.staff.role === STAFF_ROLES.SUPER_ADMIN
                  ? "You can create Admin and Cashier accounts."
                  : "You can create Cashier accounts."}
              </p>
            </div>
            <div className="col-span-2 flex flex-col gap-3">
              {createRequestError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {createRequestError}
                </div>
              )}
              <div className="flex gap-3">
                <Button type="submit" variant="primary" isLoading={isCreating}>
                  {isCreating ? "Creating..." : "Create Account"}
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

      {/* Edit Form Panel */}
      {editingStaff && (
        <div ref={editFormRef}>
        <SectionCard title={`Edit: ${editingStaff.fullName}`}>
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
              label="Username"
              type="text"
              value={editingStaff.username}
              readOnly
              hint="Username cannot be changed."
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                Role <span className="text-red-500 ml-0.5">*</span>
              </label>
              <select
                name="role"
                value={editData.role}
                onChange={handleEditChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:border-[var(--color-accent)] focus:ring-[var(--color-accent-soft)] transition-all"
              >
                {editableRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {editErrors.role && (
                <p className="text-xs font-medium text-red-600">
                  {editErrors.role}
                </p>
              )}
            </div>
            <div className="flex items-end pb-0.5">
              <p className="text-xs text-slate-400">
                Password changes are handled separately.
              </p>
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
        </div>
      )}

      {/* Reset Password Panel */}
      {resetTarget && (
        <div ref={resetFormRef}>
        <SectionCard title={`Reset Password: ${resetTarget.fullName}`}>
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-sm text-amber-800 font-medium">
              Security Action
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Setting a new password for{" "}
              <strong>@{resetTarget.username}</strong>. Their existing sessions
              will be invalidated immediately.
            </p>
          </div>
          <form
            onSubmit={handleResetSubmit}
            className="grid grid-cols-2 gap-4"
            noValidate
          >
            <Input
              label="New Password"
              name="newPassword"
              type="password"
              placeholder="Min 8 characters"
              value={resetData.newPassword}
              onChange={handleResetChange}
              error={resetErrors.newPassword}
              required
              autoComplete="new-password"
            />
            <Input
              label="Confirm New Password"
              name="confirmNewPassword"
              type="password"
              placeholder="Repeat new password"
              value={resetData.confirmNewPassword}
              onChange={handleResetChange}
              error={resetErrors.confirmNewPassword}
              required
              autoComplete="new-password"
            />
            <div className="col-span-2 flex flex-col gap-3">
              {resetRequestError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {resetRequestError}
                </div>
              )}
              {resetSuccess && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {resetSuccess}
                </div>
              )}
              <div className="flex gap-3">
                <Button type="submit" variant="danger" isLoading={isResetting}>
                  {isResetting ? "Resetting..." : "Reset Password"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeAllPanels}
                  disabled={isResetting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </SectionCard>
        </div>
      )}

      {/* Table + Detail Panel Layout - NEW ON DAY 15 */}
      {/* When a staff member is selected, the layout shifts to show the detail panel */}
      <div
        className={selectedStaff ? "grid gap-4 items-start" : ""}
        style={selectedStaff ? { gridTemplateColumns: "1fr 300px" } : {}}
      >
        {/* Staff Table */}
        <SectionCard
          title="All Staff"
          noPadding
          actions={
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                void fetchStaff(
                  currentPage,
                  debouncedSearch,
                  roleFilter,
                  statusFilter,
                )
              }
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Refresh"}
            </Button>
          }
        >
          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-16 gap-2">
              <span className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:300ms]" />
              </span>
              <span className="text-sm text-slate-400">Loading staff...</span>
            </div>
          )}

          {/* Error */}
          {!isLoading && listError && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-sm text-red-500">{listError}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setListError("");
                  void fetchStaff(
                    currentPage,
                    debouncedSearch,
                    roleFilter,
                    statusFilter,
                  );
                }}
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Empty State - differentiated - NEW ON DAY 15 */}
          {!isLoading && !listError && staffList.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              {hasActiveFilters ? (
                // Filtered empty - records exist but none match
                <>
                  <p className="text-sm font-medium text-slate-500">
                    No staff match your current filters.
                  </p>
                  <p className="text-xs text-slate-400">
                    Try adjusting or clearing the filters above.
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
                // Truly empty - no records at all
                <>
                  <p className="text-sm font-medium text-slate-500">
                    No staff accounts created yet.
                  </p>
                  <p className="text-xs text-slate-400">
                    Use the New Staff button to create the first account.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Table */}
          {!isLoading && !listError && staffList.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[640px]">
                <thead>
                  <tr>
                    {[
                      "Staff Member",
                      "Role",
                      "Status",
                      "Created",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className={`${h === "Actions" ? "text-center" : "text-left"} px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-[var(--color-paper)] border-b border-slate-100 whitespace-nowrap`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {staffList.map((staff) => {
                    const isSelected = selectedStaff?.id === staff.id;
                    return (
                      <tr
                        key={staff.id}
                        onClick={() =>
                          setSelectedStaff(isSelected ? null : staff)
                        }
                        className={[
                          "transition-colors duration-100 cursor-pointer",
                          isSelected
                            ? "bg-[var(--color-accent-soft)]/40/60 hover:bg-[var(--color-accent-soft)]/40/80"
                            : "hover:bg-slate-50/50",
                        ].join(" ")}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-slate-800 leading-tight">
                              {staff.fullName}
                              {staff.id === session.staff.id && (
                                <span className="ml-2 text-xs font-normal text-[var(--color-accent-strong)]">
                                  (you)
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              @{staff.username}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            label={staff.role}
                            variant={getRoleVariant(staff.role)}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            label={staff.status}
                            variant={getStatusVariant(staff.status)}
                          />
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                          {formatDate(staff.createdAt)}
                        </td>
                        <td
                          className="px-6 py-4 text-center"
                          onClick={(e) => e.stopPropagation()} // don't open detail when clicking actions
                        >
                          {canActOnStaff(staff) ? (
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  closeAllPanels();
                                  setEditingStaff(staff);
                                  setEditData({
                                    fullName: staff.fullName,
                                    role: staff.role,
                                  });
                                }}
                                disabled={!!togglingId}
                                className="text-xs font-medium text-[var(--color-accent-strong)] hover:text-[var(--color-accent-strong)] disabled:opacity-40 transition-colors"
                              >
                                Edit
                              </button>
                              <span className="text-slate-200">|</span>
                              <button
                                type="button"
                                onClick={() => {
                                  closeAllPanels();
                                  setResetTarget(staff);
                                }}
                                disabled={!!togglingId}
                                className="text-xs font-medium text-amber-600 hover:text-amber-700 disabled:opacity-40 transition-colors"
                              >
                                Reset PW
                              </button>
                              <span className="text-slate-200">|</span>
                              <button
                                type="button"
                                onClick={() => void handleToggleStatus(staff)}
                                disabled={togglingId === staff.id}
                                className={[
                                  "text-xs font-medium transition-colors disabled:opacity-40",
                                  staff.status === RECORD_STATUS.ACTIVE
                                    ? "text-red-500 hover:text-red-600"
                                    : "text-green-600 hover:text-green-700",
                                ].join(" ")}
                              >
                                {togglingId === staff.id
                                  ? "Updating..."
                                  : staff.status === RECORD_STATUS.ACTIVE
                                    ? "Deactivate"
                                    : "Activate"}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
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

        {/* Detail Panel - NEW ON DAY 15 */}
        {selectedStaff && (
          <aside className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                Staff Details
              </h3>
              <button
                type="button"
                onClick={() => setSelectedStaff(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors text-lg leading-none"
                aria-label="Close detail panel"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-5 flex flex-col gap-4">
              {/* Avatar + name */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center text-[var(--color-accent-strong)] font-bold text-base flex-shrink-0">
                  {selectedStaff.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {selectedStaff.fullName}
                    {selectedStaff.id === session.staff.id && (
                      <span className="ml-1 text-xs font-normal text-[var(--color-accent-strong)]">
                        (you)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">
                    @{selectedStaff.username}
                  </p>
                </div>
              </div>

              {/* Role + Status badges */}
              <div className="flex gap-2 flex-wrap">
                <Badge
                  label={selectedStaff.role}
                  variant={getRoleVariant(selectedStaff.role)}
                />
                <Badge
                  label={selectedStaff.status}
                  variant={getStatusVariant(selectedStaff.status)}
                />
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100" />

              {/* Details */}
              <dl className="flex flex-col gap-3">
                <div>
                  <dt className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">
                    Account ID
                  </dt>
                  <dd className="text-xs text-slate-600 font-mono break-all">
                    {selectedStaff.id}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">
                    Created
                  </dt>
                  <dd className="text-xs text-slate-600">
                    {formatDateTime(selectedStaff.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">
                    Last Updated
                  </dt>
                  <dd className="text-xs text-slate-600">
                    {formatDateTime(selectedStaff.updatedAt)}
                  </dd>
                </div>
              </dl>

              {/* Quick actions in detail panel - only for eligible staff */}
              {canActOnStaff(selectedStaff) && (
                <>
                  <div className="border-t border-slate-100" />
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Quick Actions
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        closeAllPanels();
                        setEditingStaff(selectedStaff);
                        setEditData({
                          fullName: selectedStaff.fullName,
                          role: selectedStaff.role,
                        });
                      }}
                      className="w-full text-left text-xs font-medium text-[var(--color-accent-strong)] hover:text-[var(--color-accent-strong)] py-1 transition-colors"
                    >
                      Edit profile →
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        closeAllPanels();
                        setResetTarget(selectedStaff);
                      }}
                      className="w-full text-left text-xs font-medium text-amber-600 hover:text-amber-700 py-1 transition-colors"
                    >
                      Reset password →
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggleStatus(selectedStaff)}
                      disabled={togglingId === selectedStaff.id}
                      className={[
                        "w-full text-left text-xs font-medium py-1 transition-colors disabled:opacity-40",
                        selectedStaff.status === RECORD_STATUS.ACTIVE
                          ? "text-red-500 hover:text-red-600"
                          : "text-green-600 hover:text-green-700",
                      ].join(" ")}
                    >
                      {togglingId === selectedStaff.id
                        ? "Updating..."
                        : selectedStaff.status === RECORD_STATUS.ACTIVE
                          ? "Deactivate account →"
                          : "Activate account →"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
