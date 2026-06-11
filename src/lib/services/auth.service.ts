import bcrypt from "bcryptjs";

import { STAFF_ROLES } from "@/lib/constants";
import { Staff } from "@/lib/models";
import { AppError, type FieldError } from "@/types";

interface SetupInput {
  fullName?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
}

interface SafeStaff {
  id: string;
  fullName: string;
  username: string;
  role: string;
}

interface SetupStatus {
  isSetupComplete: boolean;
}
export async function getSetupStatus(): Promise<SetupStatus> {
  const count = await Staff.countDocuments({ isDeleted: false });
  return { isSetupComplete: count > 0 };
}
function validateSetupInput(input: SetupInput): FieldError[] {
  const errors: FieldError[] = [];

  // ── fullName ──────────────────────────────────────────────────────────────
  const fullName = input.fullName?.trim() ?? "";

  if (!fullName) {
    errors.push({ field: "fullName", message: "Full name is required." });
  } else if (fullName.length < 2) {
    errors.push({
      field: "fullName",
      message: "Full name must be at least 2 characters.",
    });
  } else if (fullName.length > 120) {
    errors.push({
      field: "fullName",
      message: "Full name must not exceed 120 characters.",
    });
  }
 const username = input.username?.trim().toLowerCase() ?? "";
   if (!username) {
    errors.push({ field: "username", message: "Username is required." });
  } else if (username.length < 3) {
    errors.push({
      field: "username",
      message: "Username must be at least 3 characters.",
    });
  } else if (username.length > 40) {
    errors.push({
      field: "username",
      message: "Username must not exceed 40 characters.",
    });
      } else if (!/^[a-z0-9_]+$/.test(username)) {
    // Regex explanation:
    // ^ = start of string
    // [a-z0-9_]+ = one or more lowercase letters, digits, or underscores
    // $ = end of string
    // This prevents spaces, special characters, and uppercase letters
    errors.push({
      field: "username",
      message:
        "Username can only contain lowercase letters, numbers, and underscores.",
    });
  }

    const password = input.password ?? "";

  if (!password) {
    errors.push({ field: "password", message: "Password is required." });
  } else if (password.length < 8) {
    errors.push({
      field: "password",
      message: "Password must be at least 8 characters.",
    });
  }

    const confirmPassword = input.confirmPassword ?? "";

  if (!confirmPassword) {
    errors.push({
      field: "confirmPassword",
      message: "Please confirm your password.",
    });
  } else if (password && password !== confirmPassword) {
    // Only check mismatch if password itself is present
    // (avoids duplicate errors when password is also missing)
    errors.push({
      field: "confirmPassword",
      message: "Passwords do not match.",
    });
  }

  return errors;
}

export async function createSuperAdmin(
  input: SetupInput
): Promise<SafeStaff> {
  // ── Step 1: Field Validation ──────────────────────────────────────────────
  const validationErrors = validateSetupInput(input);

  if (validationErrors.length > 0) {
    // AppError with errors array - handleApiError will format each field error
    throw new AppError(
      "Validation failed. Please check the highlighted fields.",
      400,
      validationErrors
    );
  }
  const { isSetupComplete } = await getSetupStatus();

  if (isSetupComplete) {
    throw new AppError(
      "Setup has already been completed. Please log in with your existing account.",
      409 // 409 Conflict - the resource already exists
    );
  }

  const fullName = input.fullName!.trim();
  const username = input.username!.trim().toLowerCase();
  const password = input.password!;

    const passwordHash = await bcrypt.hash(password, 10);

  const staff = await Staff.create({
    fullName,
    username,
    passwordHash,
    role: STAFF_ROLES.SUPER_ADMIN,
    status: "Active",
    tokenVersion: 0,
    createdBy: null,
    updatedBy: null,
    isDeleted: false,
    deletedAt: null,
  });
  return {
    id: staff._id.toString(),
    fullName: staff.fullName,
    username: staff.username,
    role: staff.role,
  };
}