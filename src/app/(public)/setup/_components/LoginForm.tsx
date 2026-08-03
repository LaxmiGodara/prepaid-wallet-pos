"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Input, SectionCard } from "@/components/ui";
import { getSession, saveSession } from "@/lib/auth-storage";
import type { SessionData } from "@/types";

interface FormData {
  username: string;
  password: string;
}

type FormErrors = Partial<Record<keyof FormData, string>>;

function validateForm(data: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.username.trim()) {
    errors.username = "Username is required.";
  }

  if (!data.password) {
    errors.password = "Password is required.";
  }

  return errors;
}

export default function LoginForm() {
  const router = useRouter();

  const [isChecking, setIsChecking] = useState(true);

  const [formData, setFormData] = useState<FormData>({
    username: "",
    password: "",
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [requestError, setRequestError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoSubmitting, setIsDemoSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function checkState(): Promise<void> {
      try {
        // A hung request here (e.g. the server can't reach MongoDB) would
        // otherwise leave this page showing "Loading..." forever with no
        // way out — AbortController + a timeout guarantees we always fall
        // through to the actual login form within a few seconds.
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const statusResponse = await fetch("/api/auth/setup-status", {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const statusResult = await statusResponse.json();

        if (!isMounted) return;

        if (!statusResult.data?.isSetupComplete) {
          router.replace("/setup");
          return;
        }

        const existingSession = getSession();

        if (existingSession?.staff) {
          router.replace("/dashboard");
          return;
        }
      } catch {
        // Network error, timeout, or the server is unreachable — fall
        // through to showing the login form rather than staying stuck.
        // If the server really is unreachable, the login attempt itself
        // will surface a clear "Unable to reach the server" message.
      }

      if (isMounted) {
        setIsChecking(false);
      }
    }

    void checkState();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (formErrors[name as keyof FormData]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }

    if (requestError) {
      setRequestError("");
    }
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const errors = validateForm(formData);

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setRequestError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username.trim(),
          password: formData.password,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        if (result.errors && result.errors.length > 0) {
          const backendErrors: FormErrors = {};

          (
            result.errors as Array<{
              field: string;
              message: string;
            }>
          ).forEach((err) => {
            backendErrors[err.field as keyof FormData] = err.message;
          });

          setFormErrors(backendErrors);
        } else {
          setRequestError(result.message ?? "Login failed. Please try again.");
        }

        return;
      }

      saveSession(result.data as SessionData);

      router.replace("/dashboard");
    } catch {
      setRequestError(
        "Unable to reach the server. Check your connection and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDemoLogin(): Promise<void> {
    setRequestError("");
    setIsDemoSubmitting(true);

    try {
      // No username/password sent — the server authenticates internally
      // against a predefined demo account (see /api/auth/demo-login).
      const response = await fetch("/api/auth/demo-login", {
        method: "POST",
      });

      const result = await response.json();

      if (!result.success) {
        setRequestError(
          result.message ?? "Couldn't start the demo. Please try again.",
        );
        return;
      }

      saveSession(result.data as SessionData);

      router.replace("/dashboard");
    } catch {
      setRequestError(
        "Unable to reach the server. Check your connection and try again.",
      );
    } finally {
      setIsDemoSubmitting(false);
    }
  }

  if (isChecking) {
    return (
      <div className="flex items-center gap-3">
        <span className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
        </span>

        <span className="text-sm text-slate-400">Loading...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <SectionCard title="Sign in to your account">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <Input
            label="Username"
            name="username"
            type="text"
            placeholder="Enter your username"
            value={formData.username}
            onChange={handleInputChange}
            error={formErrors.username}
            required
            autoComplete="username"
          />

          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleInputChange}
            error={formErrors.password}
            required
            autoComplete="current-password"
          />

          {requestError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {requestError}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            disabled={isDemoSubmitting}
            fullWidth
          >
            {isSubmitting ? "Signing In..." : "Sign In"}
          </Button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            or
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <Button
          type="button"
          variant="demo"
          size="lg"
          isLoading={isDemoSubmitting}
          disabled={isSubmitting}
          fullWidth
          onClick={() => void handleDemoLogin()}
        >
          {isDemoSubmitting ? "Loading Demo..." : "Explore Demo"}
        </Button>

        <p className="text-center text-xs text-slate-400 mt-3">
          No signup required. Explore the application instantly using a demo
          account.
        </p>
      </SectionCard>
    </div>
  );
}
