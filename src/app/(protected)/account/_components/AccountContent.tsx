

"use client";

import { useState } from "react";

import { Button, Input, PageHeader, SectionCard } from "@/components/ui";
import { useSession } from "@/contexts/SessionContext";
import { getAuthorizationHeader } from "@/lib/auth-storage";
import type { SessionData } from "@/types";


interface ProfileFormData {
  fullName: string;
}

type ProfileFormErrors = Partial<Record<keyof ProfileFormData, string>>;

function validateProfileForm(data: ProfileFormData): ProfileFormErrors {
  const errors: ProfileFormErrors = {};

  if (!data.fullName.trim()) {
    errors.fullName = "Full name is required.";
  } else if (data.fullName.trim().length < 2) {
    errors.fullName = "Full name must be at least 2 characters.";
  }

  return errors;
}



interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

type PasswordFormErrors = Partial<Record<keyof PasswordFormData, string>>;

function validatePasswordForm(data: PasswordFormData): PasswordFormErrors {
  const errors: PasswordFormErrors = {};

  if (!data.currentPassword) {
    errors.currentPassword = "Current password is required.";
  }

  if (!data.newPassword) {
    errors.newPassword = "New password is required.";
  } else if (data.newPassword.length < 8) {
    errors.newPassword = "New password must be at least 8 characters.";
  }

  if (!data.confirmNewPassword) {
    errors.confirmNewPassword = "Please confirm your new password.";
  } else if (data.newPassword !== data.confirmNewPassword) {
    errors.confirmNewPassword = "Passwords do not match.";
  }

  return errors;
}


export default function AccountContent() {
  const { session, updateSession, replaceSession } = useSession();

  const [profileData, setProfileData] = useState<ProfileFormData>({
    fullName: session.staff.fullName,
  });
  const [profileErrors, setProfileErrors] = useState<ProfileFormErrors>({});
  const [profileRequestError, setProfileRequestError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);


  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<PasswordFormErrors>({});
  const [passwordRequestError, setPasswordRequestError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);


  function handleProfileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const { name, value } = event.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));

    if (profileErrors[name as keyof ProfileFormData]) {
      setProfileErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (profileRequestError) setProfileRequestError("");
    if (profileSuccess) setProfileSuccess("");
  }

  async function handleProfileSubmit(
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    const errors = validateProfileForm(profileData);
    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    setIsProfileSubmitting(true);
    setProfileRequestError("");

    try {
      const authHeader = getAuthorizationHeader();

      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({ fullName: profileData.fullName.trim() }),
      });

      const result = await response.json();

      if (!result.success) {
        if (result.errors && result.errors.length > 0) {
          const backendErrors: ProfileFormErrors = {};
          (result.errors as Array<{ field: string; message: string }>).forEach(
            (err) => {
              backendErrors[err.field as keyof ProfileFormData] = err.message;
            }
          );
          setProfileErrors(backendErrors);
        } else {
          setProfileRequestError(result.message ?? "Unable to update profile.");
        }
        return;
      }


      updateSession({ fullName: result.data.fullName });
      setProfileSuccess("Profile updated successfully.");
    } catch {
      setProfileRequestError("Unable to reach the server. Please try again.");
    } finally {
      setIsProfileSubmitting(false);
    }
  }

  // ── Password Handlers ────────────────────────────────────────────────────

  function handlePasswordChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const { name, value } = event.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));

    if (passwordErrors[name as keyof PasswordFormData]) {
      setPasswordErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (passwordRequestError) setPasswordRequestError("");
    if (passwordSuccess) setPasswordSuccess("");
  }

  async function handlePasswordSubmit(
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    const errors = validatePasswordForm(passwordData);
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setIsPasswordSubmitting(true);
    setPasswordRequestError("");

    try {
      const authHeader = getAuthorizationHeader();

      const response = await fetch("/api/auth/me/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify(passwordData),
      });

      const result = await response.json();

      if (!result.success) {
        if (result.errors && result.errors.length > 0) {
          const backendErrors: PasswordFormErrors = {};
          (result.errors as Array<{ field: string; message: string }>).forEach(
            (err) => {
              backendErrors[err.field as keyof PasswordFormData] = err.message;
            }
          );
          setPasswordErrors(backendErrors);
        } else {
          setPasswordRequestError(result.message ?? "Unable to change password.");
        }
        return;
      }


      replaceSession(result.data as SessionData);

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
      setPasswordSuccess("Password updated successfully.");
    } catch {
      setPasswordRequestError("Unable to reach the server. Please try again.");
    } finally {
      setIsPasswordSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8 flex flex-col gap-6">
      <PageHeader
        title="My Account"
        subtitle="Manage your profile and password"
      />

      {/* ── Profile Section ──────────────────────────────────────────── */}
      <SectionCard title="Profile Information">
        <form
          onSubmit={handleProfileSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <Input
            label="Username"
            name="username"
            type="text"
            value={session.staff.username}
            disabled
            hint="Username cannot be changed."
          />

          <Input
            label="Full Name"
            name="fullName"
            type="text"
            value={profileData.fullName}
            onChange={handleProfileChange}
            error={profileErrors.fullName}
            required
          />

          {profileRequestError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {profileRequestError}
            </div>
          )}
          {profileSuccess && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {profileSuccess}
            </div>
          )}

          <div>
            <Button
              type="submit"
              variant="primary"
              isLoading={isProfileSubmitting}
            >
              {isProfileSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </SectionCard>

      {/* ── Password Section ─────────────────────────────────────────── */}
      <SectionCard title="Change Password">
        <form
          onSubmit={handlePasswordSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <Input
            label="Current Password"
            name="currentPassword"
            type="password"
            value={passwordData.currentPassword}
            onChange={handlePasswordChange}
            error={passwordErrors.currentPassword}
            required
            autoComplete="current-password"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="New Password"
              name="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              error={passwordErrors.newPassword}
              required
              autoComplete="new-password"
            />
            <Input
              label="Confirm New Password"
              name="confirmNewPassword"
              type="password"
              value={passwordData.confirmNewPassword}
              onChange={handlePasswordChange}
              error={passwordErrors.confirmNewPassword}
              required
              autoComplete="new-password"
            />
          </div>

          {passwordRequestError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {passwordRequestError}
            </div>
          )}
          {passwordSuccess && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {passwordSuccess}
            </div>
          )}

          <div>
            <Button
              type="submit"
              variant="primary"
              isLoading={isPasswordSubmitting}
            >
              {isPasswordSubmitting ? "Updating..." : "Change Password"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}