
import bcrypt from "bcryptjs";
import mongoose, { type QueryFilter, type UpdateQuery } from "mongoose";

import { PAGINATION, RECORD_STATUS, STAFF_ROLES } from "@/lib/constants";
import { Staff, type IStaff } from "@/lib/models";
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

interface UpdateStaffInput {
  fullName?: string;
  role?: string;
}

// NEW ON DAY 14
interface ResetPasswordInput {
  newPassword?: string;
  confirmNewPassword?: string;
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
      "Super Admin accounts cannot be created through this module.",
      403
    );
  }
  if (newRole === STAFF_ROLES.ADMIN && actorRole !== STAFF_ROLES.SUPER_ADMIN) {
    throw new AppError("Only Super Admin can create Admin accounts.", 403);
  }
}



export async function listStaff(input: ListStaffInput): Promise<ListStaffResult> {
  const page = Math.max(1, input.page);
  const limit = Math.min(Math.max(1, input.limit), PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  const filter: QueryFilter<IStaff> = { isDeleted: false };

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
    throw new AppError("Validation failed.", 409, [
      { field: "username", message: "This username is already taken." },
    ]);
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



function validateUpdateStaffInput(input: UpdateStaffInput): FieldError[] {
  const errors: FieldError[] = [];

  if (input.fullName !== undefined) {
    const fullName = input.fullName.trim();
    if (!fullName) {
      errors.push({ field: "fullName", message: "Full name cannot be empty." });
    } else if (fullName.length < 2) {
      errors.push({ field: "fullName", message: "Full name must be at least 2 characters." });
    } else if (fullName.length > 120) {
      errors.push({ field: "fullName", message: "Full name must not exceed 120 characters." });
    }
  }

  if (input.role !== undefined) {
    const assignableRoles = [STAFF_ROLES.ADMIN, STAFF_ROLES.CASHIER];
    if (!assignableRoles.includes(input.role as (typeof assignableRoles)[number])) {
      errors.push({ field: "role", message: "Role must be Admin or Cashier." });
    }
  }

  return errors;
}



function checkUpdateHierarchy(
  actorRole: string,
  targetCurrentRole: string,
  newRole?: string
): void {
  if (targetCurrentRole === STAFF_ROLES.SUPER_ADMIN) {
    throw new AppError(
      "Super Admin accounts cannot be modified through Staff Management.",
      403
    );
  }

  if (
    actorRole === STAFF_ROLES.ADMIN &&
    targetCurrentRole === STAFF_ROLES.ADMIN
  ) {
    throw new AppError(
      "Admin accounts cannot modify other Admin accounts.",
      403
    );
  }

  if (newRole !== undefined) {
    if (newRole === STAFF_ROLES.SUPER_ADMIN) {
      throw new AppError(
        "Cannot assign Super Admin role through this endpoint.",
        403
      );
    }

    if (
      newRole === STAFF_ROLES.ADMIN &&
      actorRole !== STAFF_ROLES.SUPER_ADMIN
    ) {
      throw new AppError(
        "Only Super Admin can assign the Admin role.",
        403
      );
    }
  }
}



function checkStatusToggleHierarchy(
  actorRole: string,
  targetRole: string
): void {
  if (
    actorRole === STAFF_ROLES.ADMIN &&
    targetRole === STAFF_ROLES.ADMIN
  ) {
    throw new AppError(
      "Admin accounts cannot change the status of other Admin accounts.",
      403
    );
  }

  if (
    actorRole === STAFF_ROLES.ADMIN &&
    targetRole === STAFF_ROLES.SUPER_ADMIN
  ) {
    throw new AppError(
      "Admin accounts cannot change the Super Admin's status.",
      403
    );
  }
}


export async function updateStaff(
  targetId: string,
  input: UpdateStaffInput,
  actorId: string,
  actorRole: string
): Promise<StaffRecord> {
  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    throw new AppError("Invalid staff ID.", 400);
  }

  if (actorId === targetId) {
    throw new AppError("Use My Account to update your own profile.", 403);
  }

  const targetStaff = await Staff.findOne({ _id: targetId, isDeleted: false });
  if (!targetStaff) {
    throw new AppError("Staff account not found.", 404);
  }

  checkUpdateHierarchy(actorRole, targetStaff.role, input.role);

  const validationErrors = validateUpdateStaffInput(input);
  if (validationErrors.length > 0) {
    throw new AppError("Validation failed.", 400, validationErrors);
  }

  if (input.fullName === undefined && input.role === undefined) {
    throw new AppError("Nothing to update. Provide fullName or role.", 400);
  }


  const updateFields: UpdateQuery<IStaff> = {
    updatedBy: new mongoose.Types.ObjectId(actorId),
  };

  if (input.fullName !== undefined) updateFields.fullName = input.fullName.trim();
  if (input.role !== undefined) updateFields.role = input.role;

  const updated = await Staff.findOneAndUpdate(
    { _id: targetId, isDeleted: false },
    updateFields,
    { new: true }
  );

  if (!updated) throw new AppError("Staff account not found.", 404);

  return {
    id: updated._id.toString(),
    fullName: updated.fullName,
    username: updated.username,
    role: updated.role,
    status: updated.status,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}



export async function updateStaffStatus(
  targetId: string,
  actorId: string,
  actorRole: string
): Promise<StaffRecord> {
  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    throw new AppError("Invalid staff ID.", 400);
  }

  if (actorId === targetId) {
    throw new AppError("You cannot change your own account status.", 403);
  }

  const targetStaff = await Staff.findOne({ _id: targetId, isDeleted: false });
  if (!targetStaff) throw new AppError("Staff account not found.", 404);

  checkStatusToggleHierarchy(actorRole, targetStaff.role);

  const newStatus =
    targetStaff.status === RECORD_STATUS.ACTIVE
      ? RECORD_STATUS.INACTIVE
      : RECORD_STATUS.ACTIVE;

  const updated = await Staff.findOneAndUpdate(
    { _id: targetId, isDeleted: false },
    {
      status: newStatus,
      updatedBy: new mongoose.Types.ObjectId(actorId),
    },
    { new: true }
  );

  if (!updated) throw new AppError("Staff account not found.", 404);

  return {
    id: updated._id.toString(),
    fullName: updated.fullName,
    username: updated.username,
    role: updated.role,
    status: updated.status,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}



function validateResetPasswordInput(input: ResetPasswordInput): FieldError[] {
  const errors: FieldError[] = [];

  const newPassword = input.newPassword ?? "";
  if (!newPassword) {
    errors.push({ field: "newPassword", message: "New password is required." });
  } else if (newPassword.length < 8) {
    errors.push({
      field: "newPassword",
      message: "Password must be at least 8 characters.",
    });
  }

  const confirmNewPassword = input.confirmNewPassword ?? "";
  if (!confirmNewPassword) {
    errors.push({
      field: "confirmNewPassword",
      message: "Please confirm the new password.",
    });
  } else if (newPassword && newPassword !== confirmNewPassword) {
    errors.push({
      field: "confirmNewPassword",
      message: "Passwords do not match.",
    });
  }

  return errors;
}



export async function resetStaffPassword(
  targetId: string,
  input: ResetPasswordInput,
  actorId: string,
  actorRole: string
): Promise<StaffRecord> {

  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    throw new AppError("Invalid staff ID.", 400);
  }

 
  if (actorId === targetId) {
    throw new AppError(
      "Use My Account to change your own password.",
      403
    );
  }

  
  const validationErrors = validateResetPasswordInput(input);
  if (validationErrors.length > 0) {
    throw new AppError("Validation failed.", 400, validationErrors);
  }

  const targetStaff = await Staff.findOne({ _id: targetId, isDeleted: false });
  if (!targetStaff) {
    throw new AppError("Staff account not found.", 404);
  }

  checkUpdateHierarchy(actorRole, targetStaff.role);


  const newPasswordHash = await bcrypt.hash(input.newPassword!, 10);

  const updated = await Staff.findOneAndUpdate(
    { _id: targetId, isDeleted: false },
    {
      passwordHash: newPasswordHash,
      $inc: { tokenVersion: 1 },
      updatedBy: new mongoose.Types.ObjectId(actorId),
    },
    { new: true }
  );

  if (!updated) {
    throw new AppError("Staff account not found.", 404);
  }

  return {
    id: updated._id.toString(),
    fullName: updated.fullName,
    username: updated.username,
    role: updated.role,
    status: updated.status,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}