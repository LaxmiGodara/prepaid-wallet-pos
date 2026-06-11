"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Input, SectionCard } from "@/components/ui";

// Shape of all four form fields
interface FormData {
  fullName: string;
  username: string;
  password: string;
  confirmPassword: string;
}

// Shape of field-level error messages
// Partial means every key is optional - not all fields have errors at once
type FormErrors = Partial<Record<keyof FormData, string>>;

const INITIAL_FORM_DATA: FormData = {
  fullName: "",
  username: "",
  password: "",
  confirmPassword: "",
};

function validateForm(data: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.fullName.trim()) {
    errors.fullName = "Full name is required.";
  } else if (data.fullName.trim().length < 2) {
    errors.fullName = "Full name must be at least 2 characters.";
  }

  const username = data.username.trim().toLowerCase();
  if (!username) {
    errors.username = "Username is required.";
  } else if (username.length < 3) {
    errors.username = "Username must be at least 3 characters.";
  } else if (!/^[a-z0-9_]+$/.test(username)) {
    errors.username =
      "Only lowercase letters, numbers, and underscores allowed.";
  }

  if (!data.password) {
    errors.password = "Password is required.";
  } else if (data.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  if (!data.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export default function SetupForm() {
  const router = useRouter();

  // isCheckingStatus: true while the mount check is in progress
  // Shows a loading screen so the form does not flash before redirect
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // Form field values - controlled inputs keep React in sync with the DOM
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);

  // Field-specific errors - shown below each input
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // API-level error - shown above the submit button
  const [requestError, setRequestError] = useState("");

  // Loading state for the submit button
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // We define the async function inside useEffect.
    // useEffect itself cannot be async - it must return cleanup or nothing.
    // Defining and calling an async function inside is the correct pattern.
    async function checkSetupStatus(): Promise<void> {
      try {
        const response = await fetch("/api/auth/setup-status");
        const result = await response.json();

        // If setup is already done, redirect immediately
        // The user has no reason to be on the setup page
        if (result.data?.isSetupComplete) {
          router.replace("/login");
          return;
          // Note: we do NOT call setIsCheckingStatus(false) here
          // because we are navigating away anyway
        }
      } catch {
        // If the status check fails (network error, server down),
        // we show the form anyway. The API will catch duplicates.
      }

      // Either setup is not done, or the check failed.
      // Either way, show the form.
      setIsCheckingStatus(false);
    }

    // void discards the Promise returned by checkSetupStatus().
    // useEffect does not await anything - void makes this explicit.
    void checkSetupStatus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Empty dependency array: run once on mount.
  // router is stable across renders so omitting it is safe here.

  // Single handler for all four inputs.
  // event.target.name tells us which field changed.
  // event.target.value is the new value.
  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const { name, value } = event.target;

    // Computed property name: [name] uses the value of name as the key
    // Example: if name is "username", updates formData.username
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear the error for this specific field as the user fixes it
    // Keeps the UX responsive - errors disappear as soon as typing starts
    if (formErrors[name as keyof FormData]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }

    // Clear the API-level error too
    if (requestError) {
      setRequestError("");
    }
  }

  // Runs when the form is submitted
  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    // MUST be first line - prevents browser from reloading the page
    event.preventDefault();

    const errors = validateForm(formData);

    if (Object.keys(errors).length > 0) {
      // Show errors and stop - do not call the API
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setRequestError("");

    try {
      const response = await fetch("/api/auth/setup", {
        method: "POST",
        // Content-Type tells the server the body is JSON
        // Without this header, request.json() on the server may fail
        headers: { "Content-Type": "application/json" },
        // JSON.stringify converts the JavaScript object to a JSON string
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!result.success) {
        if (result.errors && result.errors.length > 0) {
          // Map the array of field errors into an object for easy display
          // Example: [{ field: "username", message: "Already taken" }]
          // Becomes: { username: "Already taken" }
          const backendErrors: FormErrors = {};
          (result.errors as Array<{ field: string; message: string }>).forEach(
            (err) => {
              backendErrors[err.field as keyof FormData] = err.message;
            },
          );
          setFormErrors(backendErrors);
        } else {
          // General error without field specifics (e.g. 409 Setup already done)
          setRequestError(result.message ?? "Setup failed. Please try again.");
        }
        return;
      }

      // router.replace removes /setup from browser history.
      // The user cannot press Back to return to the setup page.
      // Setup is one-time - going back would show a form that no longer works.
      router.replace("/login");
    } catch {
      setRequestError(
        "Unable to reach the server. Check your connection and try again.",
      );
    } finally {
      // Always runs - whether success, backend error, or network error
      setIsSubmitting(false);
    }
  }

  // Shown while the mount effect checks setup status.
  // Prevents the form from flashing before a redirect fires.

  if (isCheckingStatus) {
    return (
      <div className="flex items-center gap-3">
        <span className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
        </span>
        <span className="text-sm text-slate-400">
          Checking system status...
        </span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <SectionCard title="Create Super Admin Account">
        {/* Description */}
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          This step runs once. The account you create here becomes the system
          administrator with full access.
        </p>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          {/* Full Name */}
          <Input
            label="Full Name"
            name="fullName"
            type="text"
            placeholder="Enter your full name"
            value={formData.fullName}
            onChange={handleInputChange}
            error={formErrors.fullName}
            required
            autoComplete="name"
          />

          {/* Username */}
          <Input
            label="Username"
            name="username"
            type="text"
            placeholder="Choose a username"
            value={formData.username}
            onChange={handleInputChange}
            error={formErrors.username}
            hint="Lowercase letters, numbers, and underscores only."
            required
            autoComplete="username"
          />

          {/* Password and Confirm Password side by side */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="Min 8 characters"
              value={formData.password}
              onChange={handleInputChange}
              error={formErrors.password}
              required
              autoComplete="new-password"
            />
            <Input
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              placeholder="Repeat password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              error={formErrors.confirmPassword}
              required
              autoComplete="new-password"
            />
          </div>

          {/* API-level error message */}
          {requestError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {requestError}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            fullWidth
          >
            {isSubmitting ? "Creating Account..." : "Create Account"}
          </Button>
        </form>
      </SectionCard>

      {/* Subtle note */}
      <p className="text-center text-xs text-slate-400 mt-4">
        This form appears only once. After setup, you log in normally.
      </p>
    </div>
  );
}
