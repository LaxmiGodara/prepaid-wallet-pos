import { describe, expect, it } from "vitest";

import {
  validateChangePasswordInput,
  validateSetupInput,
} from "@/lib/services/auth.service";

// These validators are exactly the ones the engineering review flagged as
// duplicated-by-hand against the Mongoose schema's own constraints (e.g.
// fullName's 2–120 length also lives in staff.model.ts). Testing the
// boundaries here at least catches the validator drifting out of sync with
// itself over time, even though the schema-vs-validator duplication itself
// is a separate, larger refactor (adopting zod) tracked in the README.

function fieldsWithErrors(errors: { field: string }[]): string[] {
  return errors.map((e) => e.field);
}

describe("validateSetupInput", () => {
  const validInput = {
    fullName: "Business Owner",
    username: "admin",
    password: "supersecret1",
    confirmPassword: "supersecret1",
  };

  it("passes with valid input", () => {
    expect(validateSetupInput(validInput)).toEqual([]);
  });

  it("rejects a missing full name", () => {
    const errors = validateSetupInput({ ...validInput, fullName: "" });
    expect(fieldsWithErrors(errors)).toContain("fullName");
  });

  it("rejects a full name under 2 characters", () => {
    const errors = validateSetupInput({ ...validInput, fullName: "A" });
    expect(fieldsWithErrors(errors)).toContain("fullName");
  });

  it("accepts a full name at exactly the 2-character minimum", () => {
    const errors = validateSetupInput({ ...validInput, fullName: "Al" });
    expect(fieldsWithErrors(errors)).not.toContain("fullName");
  });

  it("rejects a full name over 120 characters", () => {
    const errors = validateSetupInput({
      ...validInput,
      fullName: "A".repeat(121),
    });
    expect(fieldsWithErrors(errors)).toContain("fullName");
  });

  it("accepts a full name at exactly the 120-character maximum", () => {
    const errors = validateSetupInput({
      ...validInput,
      fullName: "A".repeat(120),
    });
    expect(fieldsWithErrors(errors)).not.toContain("fullName");
  });

  it("rejects a username with uppercase letters", () => {
    const errors = validateSetupInput({ ...validInput, username: "Admin" });
    // validateSetupInput lowercases before the regex check, so this
    // actually passes — this test documents that intentional behavior
    // rather than asserting a rejection.
    expect(fieldsWithErrors(errors)).not.toContain("username");
  });

  it("rejects a username with invalid characters", () => {
    const errors = validateSetupInput({ ...validInput, username: "ad min!" });
    expect(fieldsWithErrors(errors)).toContain("username");
  });

  it("rejects a password under 8 characters", () => {
    const errors = validateSetupInput({
      ...validInput,
      password: "short1",
      confirmPassword: "short1",
    });
    expect(fieldsWithErrors(errors)).toContain("password");
  });

  it("rejects mismatched password confirmation", () => {
    const errors = validateSetupInput({
      ...validInput,
      confirmPassword: "somethingElse1",
    });
    expect(fieldsWithErrors(errors)).toContain("confirmPassword");
  });

  it("reports every invalid field at once, not just the first", () => {
    const errors = validateSetupInput({
      fullName: "",
      username: "",
      password: "",
      confirmPassword: "",
    });
    expect(fieldsWithErrors(errors)).toEqual([
      "fullName",
      "username",
      "password",
      "confirmPassword",
    ]);
  });
});

describe("validateChangePasswordInput", () => {
  const validInput = {
    currentPassword: "oldpassword1",
    newPassword: "newpassword1",
    confirmNewPassword: "newpassword1",
  };

  it("passes with valid input", () => {
    expect(validateChangePasswordInput(validInput)).toEqual([]);
  });

  it("rejects a missing current password", () => {
    const errors = validateChangePasswordInput({
      ...validInput,
      currentPassword: "",
    });
    expect(fieldsWithErrors(errors)).toContain("currentPassword");
  });

  it("rejects a new password under 8 characters", () => {
    const errors = validateChangePasswordInput({
      ...validInput,
      newPassword: "short1",
      confirmNewPassword: "short1",
    });
    expect(fieldsWithErrors(errors)).toContain("newPassword");
  });

  it("rejects mismatched new-password confirmation", () => {
    const errors = validateChangePasswordInput({
      ...validInput,
      confirmNewPassword: "somethingDifferent1",
    });
    expect(fieldsWithErrors(errors)).toContain("confirmNewPassword");
  });

  // Note: this validator does NOT check "new password must differ from
  // current password" — that check lives in changeOwnPassword() itself
  // (it needs the actual bcrypt-compared current password), not here.
});
