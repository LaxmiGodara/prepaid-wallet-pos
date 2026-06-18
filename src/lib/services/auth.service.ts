
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { RECORD_STATUS, STAFF_ROLES } from "@/lib/constants";
import { Staff } from "@/lib/models";
import { AppError, type FieldError, type JwtPayload, type SessionData } from "@/types";


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

interface LoginInput {
  username?: string;
  password?: string;
}

interface StaffProfile {
  id: string;
  fullName: string;
  username: string;
  role: string;
  status: string;
}


interface UpdateProfileInput {
  fullName?: string;
}

interface ChangePasswordInput {
  currentPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
}


export async function getSetupStatus(): Promise<SetupStatus> {
  const count = await Staff.countDocuments({ isDeleted: false });
  return { isSetupComplete: count > 0 };
}



function validateSetupInput(input: SetupInput): FieldError[] {
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
    errors.push({ field: "confirmPassword", message: "Please confirm your password." });
  } else if (password && password !== confirmPassword) {
    errors.push({ field: "confirmPassword", message: "Passwords do not match." });
  }

  return errors;
}



export async function createSuperAdmin(input: SetupInput): Promise<SafeStaff> {
  const validationErrors = validateSetupInput(input);
  if (validationErrors.length > 0) {
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
      409
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



export async function loginStaff(input: LoginInput): Promise<SessionData> {
  const errors: FieldError[] = [];

  if (!input.username?.trim()) {
    errors.push({ field: "username", message: "Username is required." });
  }
  if (!input.password) {
    errors.push({ field: "password", message: "Password is required." });
  }

  if (errors.length > 0) {
    throw new AppError("Please fill in all required fields.", 400, errors);
  }

  const username = input.username!.trim().toLowerCase();

  const staff = await Staff.findOne({ username, isDeleted: false }).select(
    "+passwordHash"
  );

  if (!staff) {
    throw new AppError("Invalid username or password.", 401);
  }

  if (staff.status !== RECORD_STATUS.ACTIVE) {
    throw new AppError(
      "Your account has been deactivated. Please contact your administrator.",
      403
    );
  }

  const isPasswordValid = await bcrypt.compare(
    input.password!,
    staff.passwordHash
  );

  if (!isPasswordValid) {
    throw new AppError("Invalid username or password.", 401);
  }

  const payload: JwtPayload = {
    staffId: staff._id.toString(),
    role: staff.role,
    username: staff.username,
    tokenVersion: staff.tokenVersion,
  };

  const jwtSecret = process.env.JWT_SECRET!;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN ?? "8h";

  const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });

  return {
    token,
    staff: {
      id: staff._id.toString(),
      fullName: staff.fullName,
      username: staff.username,
      role: staff.role,
      status: staff.status,
    },
  };
}



export async function logoutStaff(staffId: string): Promise<void> {
  await Staff.updateOne(
    { _id: staffId, isDeleted: false },
    { $inc: { tokenVersion: 1 } }
  );
}


export async function getCurrentStaff(staffId: string): Promise<StaffProfile> {
  const staff = await Staff.findOne({ _id: staffId, isDeleted: false });

  if (!staff) {
    throw new AppError("Staff account not found.", 404);
  }

  return {
    id: staff._id.toString(),
    fullName: staff.fullName,
    username: staff.username,
    role: staff.role,
    status: staff.status,
  };
}



function validateUpdateProfileInput(input: UpdateProfileInput): FieldError[] {
  const errors: FieldError[] = [];

  if (input.fullName !== undefined) {
    const fullName = input.fullName.trim();

    if (!fullName) {
      errors.push({ field: "fullName", message: "Full name cannot be empty." });
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
  }

  return errors;
}



export async function updateOwnProfile(
  staffId: string,
  input: UpdateProfileInput
): Promise<StaffProfile> {
  const validationErrors = validateUpdateProfileInput(input);

  if (validationErrors.length > 0) {
    throw new AppError(
      "Validation failed. Please check the highlighted fields.",
      400,
      validationErrors
    );
  }

  if (input.fullName === undefined) {
  
    throw new AppError("Nothing to update. Provide at least one field.", 400);
  }

  const updatedStaff = await Staff.findOneAndUpdate(
    { _id: staffId, isDeleted: false },
    {
      fullName: input.fullName.trim(),
      // updatedBy is set to the staff member's own id - this is a
      // self-service update, the actor and the target are the same person.
      updatedBy: staffId,
    },
    { new: true } // return the document AFTER the update
  );

  if (!updatedStaff) {
    throw new AppError("Staff account not found.", 404);
  }

  return {
    id: updatedStaff._id.toString(),
    fullName: updatedStaff.fullName,
    username: updatedStaff.username,
    role: updatedStaff.role,
    status: updatedStaff.status,
  };
}


function validateChangePasswordInput(input: ChangePasswordInput): FieldError[] {
  const errors: FieldError[] = [];

  if (!input.currentPassword) {
    errors.push({
      field: "currentPassword",
      message: "Current password is required.",
    });
  }

  const newPassword = input.newPassword ?? "";
  if (!newPassword) {
    errors.push({ field: "newPassword", message: "New password is required." });
  } else if (newPassword.length < 8) {
    errors.push({
      field: "newPassword",
      message: "New password must be at least 8 characters.",
    });
  }

  const confirmNewPassword = input.confirmNewPassword ?? "";
  if (!confirmNewPassword) {
    errors.push({
      field: "confirmNewPassword",
      message: "Please confirm your new password.",
    });
  } else if (newPassword && newPassword !== confirmNewPassword) {
    errors.push({
      field: "confirmNewPassword",
      message: "Passwords do not match.",
    });
  }

  return errors;
}



export async function changeOwnPassword(
  staffId: string,
  input: ChangePasswordInput
): Promise<SessionData> {
  const validationErrors = validateChangePasswordInput(input);

  if (validationErrors.length > 0) {
    throw new AppError(
      "Validation failed. Please check the highlighted fields.",
      400,
      validationErrors
    );
  }

  const staff = await Staff.findOne({
    _id: staffId,
    isDeleted: false,
  }).select("+passwordHash");

  if (!staff) {
    throw new AppError("Staff account not found.", 404);
  }

  
  const isCurrentPasswordValid = await bcrypt.compare(
    input.currentPassword!,
    staff.passwordHash
  );

  if (!isCurrentPasswordValid) {
    throw new AppError("Current password is incorrect.", 401);
  }

  if (input.currentPassword === input.newPassword) {
    throw new AppError(
      "New password must be different from your current password.",
      400,
      [
        {
          field: "newPassword",
          message: "Choose a password you haven't used before.",
        },
      ]
    );
  }

  const newPasswordHash = await bcrypt.hash(input.newPassword!, 10);


  const updatedStaff = await Staff.findOneAndUpdate(
    { _id: staffId, isDeleted: false },
    {
      passwordHash: newPasswordHash,
      $inc: { tokenVersion: 1 },
    },
    { new: true }
  );

  if (!updatedStaff) {
    throw new AppError("Staff account not found.", 404);
  }


  const payload: JwtPayload = {
    staffId: updatedStaff._id.toString(),
    role: updatedStaff.role,
    username: updatedStaff.username,
    tokenVersion: updatedStaff.tokenVersion,
  };

  const newToken = jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  });

  return {
    token: newToken,
    staff: {
      id: updatedStaff._id.toString(),
      fullName: updatedStaff.fullName,
      username: updatedStaff.username,
      role: updatedStaff.role,
      status: updatedStaff.status,
    },
  };
}