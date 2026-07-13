// src/components/ui/Input.tsx
// Reusable input component with label, error display, and disabled/readonly states.
// Used in every form across the application - login, setup, staff creation, billing.

"use client";

import React from "react";

// ─── Props Interface ──────────────────────────────────────────────────────────

interface InputProps {
  label?: string;
  name?: string;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  autoComplete?: string;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Input({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  hint,
  disabled = false,
  readOnly = false,
  required = false,
  autoComplete,
  className = "",
}: InputProps) {
  // Input border changes colour based on error state
  const inputBorderStyle = error
    ? "border-red-400 focus:border-red-500 focus:ring-red-100"
    : "border-slate-300 focus:border-[var(--color-accent)] focus:ring-[var(--color-accent-soft)]";

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Label - only renders when label prop is provided */}
      {label && (
        <label htmlFor={name} className="text-sm font-medium text-slate-700">
          {label}
          {/* Required asterisk - only shows when required is true */}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {/* Input field */}
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        readOnly={readOnly}
        autoComplete={autoComplete}
        className={[
          "w-full rounded-xl border px-4 py-2.5 text-sm text-slate-800",
          "placeholder:text-slate-400",
          "focus:outline-none focus:ring-2 transition-all duration-150",
          inputBorderStyle,
          disabled
            ? "bg-slate-100 cursor-not-allowed text-slate-400"
            : "bg-white",
          readOnly ? "bg-slate-50 cursor-default" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      />

      {/* Error message - shows below input when error prop is provided */}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      {/* Hint text - shows when no error but hint is provided */}
      {!error && hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
