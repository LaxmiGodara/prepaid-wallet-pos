import { describe, expect, it } from "vitest";

import { escapeRegExp } from "@/lib/services/billing.service";

// escapeRegExp is what stands between user-supplied search text and a raw
// `new RegExp(...)` call in listBills' member-name search and the card-
// number lookup. If this regresses, a search string like `.*` or `(a+)+$`
// stops being literal text and becomes a regex-injection / ReDoS vector.

describe("escapeRegExp", () => {
  it("leaves plain alphanumeric text unchanged", () => {
    expect(escapeRegExp("John Smith")).toBe("John Smith");
  });

  it("escapes every regex special character", () => {
    // Every character with meaning in a JS RegExp, in one string.
    const input = ".*+?^${}()|[]\\";
    const escaped = escapeRegExp(input);

    // The escaped string, compiled as a regex, should match only the
    // original literal string — not behave as a pattern.
    const pattern = new RegExp(escaped);
    expect(pattern.test(input)).toBe(true);
    expect(pattern.test("anything else entirely")).toBe(false);
  });

  it("neutralizes a classic regex-injection payload", () => {
    // Naively used, ".*" would match every record instead of the literal
    // two-character string a user typed.
    const escaped = escapeRegExp(".*");
    const pattern = new RegExp(escaped);

    expect(pattern.test(".*")).toBe(true);
    expect(pattern.test("this should not match")).toBe(false);
  });
});
