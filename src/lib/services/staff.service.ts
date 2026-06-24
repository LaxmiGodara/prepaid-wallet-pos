import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { PAGINATION, RECORD_STATUS, STAFF_ROLES } from "@/lib/constants";
import { Staff } from "@/lib/models";
import { AppError, type FieldError } from "@/types";

export interface StaffRecord {
  id: string;
  fullName: string;
  username: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ListStaffInput {
  page: number;
  limit: number;
  search: string | null;
  role: string | null;
  status: string | null;
}

interface ListStaffResult {
  staffList: StaffRecord[];
  total: number;
}

interface CreateStaffInput {
  fullName?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
}

function validateCreateStaffInput(input: CreateStaffInput): FieldError[] {
  const errors: FieldError[] = [];

  const fullName = input.fullName?.trim() ?? "";
  if (!fullName) {
    errors.push({ field: "fullName", message: "Full name is required." });
  } else if (fullName.length < 2) {
    errors.push({ field: "fullName", message: "Full name must be at least 2 characters." });
  } else if (fullName.length > 120) {
    errors.push({ field: "fullName", message: "Full name must not exceed 120 characters." });
  }

  const username = input.username?.trim().toLowerCase() ?? "";
  if (!username) {
    errors.push({ field: "username", message: "Username is required." });
  } else if (username.length < 3) {
    errors.push({ field: "username", message: "Username must be at least 3 characters." });
  } else if (username.length > 40) {
    errors.push({ field: "username", message: "Username must not exceed 40 characters." });
  } else if (!/^[a-z0-9_]+$/.test(username)) {
    errors.push({
      field: "username",
      message: "Username can only contain lowercase letters, numbers, and underscores.",
    });
  }

  const password = input.password ?? "";
  if (!password) {
    errors.push({ field: "password", message: "Password is required." });
  } else if (password.length < 8) {
    errors.push({ field: "password", message: "Password must be at least 8 characters." });
  }

  const confirmPassword = input.confirmPassword ?? "";
  if (!confirmPassword) {
    errors.push({ field: "confirmPassword", message: "Please confirm the password." });
  } else if (password && password !== confirmPassword) {
    errors.push({ field: "confirmPassword", message: "Passwords do not match." });
  }

  const role = input.role ?? "";
  const creatableRoles = [STAFF_ROLES.ADMIN, STAFF_ROLES.CASHIER];
  if (!role) {
    errors.push({ field: "role", message: "Role is required." });
  } else if (!creatableRoles.includes(role as (typeof creatableRoles)[number])) {
    errors.push({ field: "role", message: "Please select a valid role." });
  }

  return errors;
}

function checkCreateHierarchy(actorRole: string, newRole: string): void {
  if (newRole === STAFF_ROLES.SUPER_ADMIN) {
    throw new AppError(
      "Super Admin accounts cannot be created through this module. The Super Admin account is created once during first-time setup.",
      403
    );
  }

  if (newRole === STAFF_ROLES.ADMIN && actorRole !== STAFF_ROLES.SUPER_ADMIN) {
    throw new AppError(
      "Only Super Admin can create Admin accounts.",
      403
    );
  }
}

export async function listStaff(input: ListStaffInput): Promise<ListStaffResult> {
  const page = Math.max(1, input.page);
  const limit = Math.min(Math.max(1, input.limit), PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = { isDeleted: false };

  if (input.search) {
    const safeSearch = input.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { fullName: { $regex: safeSearch, $options: "i" } },
      { username: { $regex: safeSearch, $options: "i" } },
    ];
  }

  if (input.role) filter.role = input.role;
  if (input.status) filter.status = input.status;

  const [rawStaffList, total] = await Promise.all([
    Staff.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-passwordHash"),
    Staff.countDocuments(filter),
  ]);

  const staffList: StaffRecord[] = rawStaffList.map((s) => ({
    id: s._id.toString(),
    fullName: s.fullName,
    username: s.username,
    role: s.role,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  return { staffList, total };
}

export async function createStaff(
  input: CreateStaffInput,
  actorId: string,
  actorRole: string
): Promise<StaffRecord> {
  const validationErrors = validateCreateStaffInput(input);
  if (validationErrors.length > 0) {
    throw new AppError(
      "Validation failed. Please check the highlighted fields.",
      400,
      validationErrors
    );
  }

  const fullName = input.fullName!.trim();
  const username = input.username!.trim().toLowerCase();
  const password = input.password!;
  const role = input.role!;

  checkCreateHierarchy(actorRole, role);

  const existingStaff = await Staff.findOne({ username });
  if (existingStaff) {
    throw new AppError(
      "Validation failed.",
      409,
      [{ field: "username", message: "This username is already taken." }]
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newStaff = await Staff.create({
    fullName,
    username,
    passwordHash,
    role,
    status: RECORD_STATUS.ACTIVE,
    tokenVersion: 0,
    createdBy: new mongoose.Types.ObjectId(actorId),
    updatedBy: null,
    isDeleted: false,
    deletedAt: null,
  });

  return {
    id: newStaff._id.toString(),
    fullName: newStaff.fullName,
    username: newStaff.username,
    role: newStaff.role,
    status: newStaff.status,
    createdAt: newStaff.createdAt.toISOString(),
    updatedAt: newStaff.updatedAt.toISOString(),
  };
}