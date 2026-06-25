"use client";

import { useCallback, useEffect, useState } from "react";

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

type CreateFormErrors = Partial<Record<keyof CreateFormData, string>>;
type EditFormErrors = Partial<Record<keyof EditFormData, string>>;

function validateCreateForm(data: CreateFormData): CreateFormErrors {
  const errors: CreateFormErrors = {};
  if (!data.fullName.trim()) errors.fullName = "Full name is required.";
  else if (data.fullName.trim().length < 2) errors.fullName = "At least 2 characters.";

  const username = data.username.trim().toLowerCase();
  if (!username) errors.username = "Username is required.";
  else if (username.length < 3) errors.username = "At least 3 characters.";
  else if (!/^[a-z0-9_]+$/.test(username)) errors.username = "Lowercase letters, numbers, underscores only.";

  if (!data.password) errors.password = "Password is required.";
  else if (data.password.length < 8) errors.password = "At least 8 characters.";

  if (!data.confirmPassword) errors.confirmPassword = "Please confirm the password.";
  else if (data.password !== data.confirmPassword) errors.confirmPassword = "Passwords do not match.";

  if (!data.role) errors.role = "Role is required.";
  return errors;
}

function validateEditForm(data: EditFormData): EditFormErrors {
  const errors: EditFormErrors = {};
  if (!data.fullName.trim()) errors.fullName = "Full name cannot be empty.";
  else if (data.fullName.trim().length < 2) errors.fullName = "At least 2 characters.";
  if (!data.role) errors.role = "Role is required.";
  return errors;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

export default function StaffContent() {
  const { session, hasRole } = useSession();

  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(INITIAL_META);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createData, setCreateData] = useState<CreateFormData>(INITIAL_CREATE_DATA);
  const [createErrors, setCreateErrors] = useState<CreateFormErrors>({});
  const [createRequestError, setCreateRequestError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editingStaff, setEditingStaff] = useState<StaffRecord | null>(null);
  const [editData, setEditData] = useState<EditFormData>({ fullName: "", role: "" });
  const [editErrors, setEditErrors] = useState<EditFormErrors>({});
  const [editRequestError, setEditRequestError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchStaff = useCallback(async (page: number): Promise<void> => {
    setIsLoading(true);
    setListError("");
    try {
      const authHeader = getAuthorizationHeader();
      const response = await fetch(
        `/api/staff?page=${page}&limit=${PAGINATION.DEFAULT_LIMIT}`,
        { headers: authHeader ? { Authorization: authHeader } : {} }
      );
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
  }, []);

  useEffect(() => {
    void fetchStaff(currentPage);
  }, [currentPage, fetchStaff]);

  function handleCreateChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void {
    const { name, value } = event.target;
    setCreateData((prev) => ({ ...prev, [name]: value }));
    if (createErrors[name as keyof CreateFormData]) {
      setCreateErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (createRequestError) setCreateRequestError("");
  }

  function handleOpenCreateForm(): void {
    setEditingStaff(null);
    setEditErrors({});
    setEditRequestError("");
    setShowCreateForm(true);
    setCreateData(INITIAL_CREATE_DATA);
    setCreateErrors({});
    setCreateRequestError("");
  }

  function handleCancelCreate(): void {
    setShowCreateForm(false);
    setCreateData(INITIAL_CREATE_DATA);
    setCreateErrors({});
    setCreateRequestError("");
  }

  async function handleCreateSubmit(
    event: React.SubmitEvent<HTMLFormElement>
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
        if (result.errors && result.errors.length > 0) {
          const backendErrors: CreateFormErrors = {};
          (result.errors as Array<{ field: string; message: string }>).forEach(
            (err) => { backendErrors[err.field as keyof CreateFormData] = err.message; }
          );
          setCreateErrors(backendErrors);
        } else {
          setCreateRequestError(result.message ?? "Failed to create staff account.");
        }
        return;
      }
      handleCancelCreate();
      if (currentPage === 1) {
        void fetchStaff(1);
      } else {
        setCurrentPage(1);
      }
    } catch {
      setCreateRequestError("Unable to reach the server. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }

  function handleOpenEdit(staff: StaffRecord): void {
    setShowCreateForm(false);
    setCreateErrors({});
    setCreateRequestError("");
    setEditingStaff(staff);
    setEditData({ fullName: staff.fullName, role: staff.role });
    setEditErrors({});
    setEditRequestError("");
  }

  function handleCancelEdit(): void {
    setEditingStaff(null);
    setEditData({ fullName: "", role: "" });
    setEditErrors({});
    setEditRequestError("");
  }

  function handleEditChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void {
    const { name, value } = event.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
    if (editErrors[name as keyof EditFormData]) {
      setEditErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (editRequestError) setEditRequestError("");
  }

  async function handleEditSubmit(
    event: React.SubmitEvent<HTMLFormElement>
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
        if (result.errors && result.errors.length > 0) {
          const backendErrors: EditFormErrors = {};
          (result.errors as Array<{ field: string; message: string }>).forEach(
            (err) => { backendErrors[err.field as keyof EditFormData] = err.message; }
          );
          setEditErrors(backendErrors);
        } else {
          setEditRequestError(result.message ?? "Failed to update staff account.");
        }
        return;
      }

      const updatedRecord = result.data as StaffRecord;
      setStaffList((prev) =>
        prev.map((s) => (s.id === updatedRecord.id ? updatedRecord : s))
      );
      handleCancelEdit();
    } catch {
      setEditRequestError("Unable to reach the server. Please try again.");
    } finally {
      setIsEditing(false);
    }
  }

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
      const updatedRecord = result.data as StaffRecord;
      setStaffList((prev) =>
        prev.map((s) => (s.id === updatedRecord.id ? updatedRecord : s))
      );
    } catch {
      setListError("Unable to reach the server.");
    } finally {
      setTogglingId(null);
    }
  }

  const creatableRoles =
    session.staff.role === STAFF_ROLES.SUPER_ADMIN
      ? [STAFF_ROLES.ADMIN, STAFF_ROLES.CASHIER]
      : [STAFF_ROLES.CASHIER];

  const editableRoles =
    session.staff.role === STAFF_ROLES.SUPER_ADMIN
      ? [STAFF_ROLES.ADMIN, STAFF_ROLES.CASHIER]
      : [STAFF_ROLES.CASHIER];

  function canActOnStaff(staff: StaffRecord): boolean {
    if (staff.id === session.staff.id) return false;
    if (staff.role === STAFF_ROLES.SUPER_ADMIN) return false;
    if (
      session.staff.role === STAFF_ROLES.ADMIN &&
      staff.role === STAFF_ROLES.ADMIN
    ) return false;
    return true;
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <PageHeader
        title="Staff Management"
        subtitle={
          meta.total > 0
            ? `${meta.total} staff member${meta.total !== 1 ? "s" : ""} total`
            : "Manage your team"
        }
        actions={
          !showCreateForm && !editingStaff ? (
            <Button variant="primary" size="sm" onClick={handleOpenCreateForm}>
              New Staff
            </Button>
          ) : undefined
        }
      />

      {showCreateForm && (
        <SectionCard title="Create Staff Account">
          <form onSubmit={handleCreateSubmit} className="grid grid-cols-2 gap-4" noValidate>
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
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:border-blue-400 focus:ring-blue-100 transition-all duration-150"
              >
                {creatableRoles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {createErrors.role && (
                <p className="text-xs font-medium text-red-600">{createErrors.role}</p>
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
                <Button type="button" variant="secondary" onClick={handleCancelCreate} disabled={isCreating}>
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </SectionCard>
      )}

      {editingStaff && (
        <SectionCard title={`Edit: ${editingStaff.fullName}`}>
          <form onSubmit={handleEditSubmit} className="grid grid-cols-2 gap-4" noValidate>
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
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:border-blue-400 focus:ring-blue-100 transition-all duration-150"
              >
                {editableRoles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {editErrors.role && (
                <p className="text-xs font-medium text-red-600">{editErrors.role}</p>
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
                <Button type="button" variant="secondary" onClick={handleCancelEdit} disabled={isEditing}>
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </SectionCard>
      )}

      <SectionCard
        title="All Staff"
        noPadding
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void fetchStaff(currentPage)}
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
            <span className="text-sm text-slate-400">Loading staff...</span>
          </div>
        )}

        {!isLoading && listError && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-red-500">{listError}</p>
            <Button variant="secondary" size="sm" onClick={() => { setListError(""); void fetchStaff(currentPage); }}>
              Try Again
            </Button>
          </div>
        )}

        {!isLoading && !listError && staffList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-sm font-medium text-slate-500">No staff found.</p>
            <p className="text-xs text-slate-400">Create the first staff account above.</p>
          </div>
        )}

        {!isLoading && !listError && staffList.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[720px]">
              <thead>
                <tr>
                  {["Staff Member", "Role", "Status", "Created", "Actions"].map((h) => (
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
                {staffList.map((staff) => (
                  <tr
                    key={staff.id}
                    className="hover:bg-slate-50/50 transition-colors duration-100"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-slate-800 leading-tight">
                          {staff.fullName}
                          {staff.id === session.staff.id && (
                            <span className="ml-2 text-xs font-normal text-blue-500">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">@{staff.username}</p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <Badge label={staff.role} variant={getRoleVariant(staff.role)} />
                    </td>

                    <td className="px-6 py-4">
                      <Badge label={staff.status} variant={getStatusVariant(staff.status)} />
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                      {formatDate(staff.createdAt)}
                    </td>

                    <td className="px-6 py-4">
                      {canActOnStaff(staff) ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(staff)}
                            disabled={togglingId === staff.id}
                            className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-40 transition-colors"
                          >
                            Edit
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
                onClick={() => setCurrentPage((p) => Math.min(meta.totalPages, p + 1))}
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