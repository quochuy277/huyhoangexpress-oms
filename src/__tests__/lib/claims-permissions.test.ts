import { describe, expect, it } from "vitest";

import { canAccessCompensation } from "@/lib/claims-permissions";

describe("canAccessCompensation", () => {
  it("allows ADMIN regardless of permissions", () => {
    expect(canAccessCompensation({ role: "ADMIN", permissions: null })).toBe(true);
  });

  it("allows canViewCompensation or canViewFinancePage", () => {
    expect(canAccessCompensation({
      role: "STAFF",
      permissions: { canViewCompensation: true } as never,
    })).toBe(true);
    expect(canAccessCompensation({
      role: "STAFF",
      permissions: { canViewFinancePage: true } as never,
    })).toBe(true);
  });

  it("denies users without either permission", () => {
    expect(canAccessCompensation({
      role: "STAFF",
      permissions: { canViewClaims: true } as never,
    })).toBe(false);
    expect(canAccessCompensation(null)).toBe(false);
  });
});
