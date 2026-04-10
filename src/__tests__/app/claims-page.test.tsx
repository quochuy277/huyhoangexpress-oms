import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/cached-session", () => ({
  getCachedSession: vi.fn(),
}));

vi.mock("@/components/claims/ClaimsPageWrapper", () => ({
  default: () => null,
}));

import { getCachedSession } from "@/lib/cached-session";

describe("ClaimsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes effective claim permissions to the wrapper for staff users", async () => {
    vi.mocked(getCachedSession).mockResolvedValue({
      user: {
        role: "STAFF",
        permissions: {
          canViewClaims: true,
          canCreateClaim: true,
          canUpdateClaim: true,
          canDeleteClaim: false,
        },
      },
    } as never);

    const { default: ClaimsPage } = await import("@/app/(dashboard)/claims/page");
    const element = await ClaimsPage();

    expect((element as any).props).toMatchObject({
      userRole: "STAFF",
      canViewCompensation: false,
      canCreateClaim: true,
      canUpdateClaim: true,
      canDeleteClaim: false,
    });
  });

  it("grants admin capabilities even without explicit claim permissions", async () => {
    vi.mocked(getCachedSession).mockResolvedValue({
      user: {
        role: "ADMIN",
        permissions: {
          canViewClaims: false,
          canViewCompensation: false,
          canViewFinancePage: false,
          canCreateClaim: false,
          canUpdateClaim: false,
          canDeleteClaim: false,
        },
      },
    } as never);

    const { default: ClaimsPage } = await import("@/app/(dashboard)/claims/page");
    const element = await ClaimsPage();

    expect((element as any).props).toMatchObject({
      userRole: "ADMIN",
      canViewCompensation: true,
      canCreateClaim: true,
      canUpdateClaim: true,
      canDeleteClaim: true,
    });
  });
});
