
import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";
import { RECORD_STATUS } from "@/lib/constants";
import { connectDB } from "@/lib/db";
import { Staff } from "@/lib/models";
import { AppError, type JwtPayload } from "@/types";

export interface AuthenticatedStaff {
  staffId: string;
  fullName: string;
  username: string;
  role: string;
  status: string;
  tokenVersion: number;
}


export async function requireAuth(
  request: NextRequest
): Promise<AuthenticatedStaff> {
  // The browser client sends the JWT as an httpOnly cookie (set by the login/
  // password-change routes) so it's never reachable by client-side JS. The
  // Authorization header is kept as a fallback so non-browser API clients
  // (scripts, future mobile app, Postman) can still authenticate directly.
  const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  const authHeader = request.headers.get("authorization") ?? "";
  const [scheme, headerToken] = authHeader.split(" ");
  const bearerToken = scheme === "Bearer" ? headerToken : undefined;

  const token = cookieToken ?? bearerToken;

  if (!token) {
    throw new AppError("Authentication is required. Please log in.", 401);
  }

  let decoded: JwtPayload;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
  } catch {
    throw new AppError("Session is not valid. Please log in again.", 401);
  }

  await connectDB();

  const staff = await Staff.findOne({
    _id: decoded.staffId,
    isDeleted: false,
  });

  if (!staff) {
    throw new AppError("Session is not valid. Please log in again.", 401);
  }

  if (staff.status !== RECORD_STATUS.ACTIVE) {
    throw new AppError(
      "Your account has been deactivated. Please contact your administrator.",
      403
    );
  }

  if (staff.tokenVersion !== decoded.tokenVersion) {
    throw new AppError(
      "Session has been invalidated. Please log in again.",
      401
    );
  }

  return {
    staffId: staff._id.toString(),
    fullName: staff.fullName,
    username: staff.username,
    role: staff.role,
    status: staff.status,
    tokenVersion: staff.tokenVersion,
  };
}


export function requireRole(
  staff: AuthenticatedStaff,
  allowedRoles: string[]
): void {
  if (!allowedRoles.includes(staff.role)) {
    // 403, not 401: the system knows exactly who this is (requireAuth
    // already confirmed that). The problem is permission, not identity.
    throw new AppError(
      "You do not have permission to perform this action.",
      403
    );
  }
}