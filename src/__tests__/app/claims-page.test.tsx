import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/cached-session", () => ({
  getCachedSession: vi.fn(),
}));

vi.mock("@/lib/claims-page-data", () => ({
  getClaimsBootstrapData: vi.fn(),
}));

vi.mock("@/components/claims/ClaimsPageWrapper", () => ({
  default: () => null,
}));

import { getCachedSession } from "@/lib/cached-session";
import { getClaimsBootstrapData } from "@/lib/claims-page-data";

describe("ClaimsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefetches claims bootstrap data for the default claims tab", async () => {
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
    vi.mocked(getClaimsBootstrapData).mockResolvedValue({
      list: {
        claims: [],
        pagination: { total: 0, totalPages: 0 },
      },
      filterOptions: {
        shops: [],
        statuses: [],
      },
    } as never);

    const { default: ClaimsPage } = await import("@/app/(dashboard)/claims/page");

    const element = await ClaimsPage({ searchParams: Promise.resolve({}) } as never);

    expect(vi.mocked(getClaimsBootstrapData)).toHaveBeenCalledTimes(1);
    expect((element as any).props.initialClaimsData).toEqual({
      claims: [],
      pagination: { total: 0, totalPages: 0 },
    });
    expect((element as any).props.initialFilterOptions).toEqual({
      shops: [],
      statuses: [],
    });
  });

  it("skips claims bootstrap when the initial tab is not the claims tab", async () => {
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

    const element = await ClaimsPage({ searchParams: Promise.resolve({ claimTab: "tools" }) } as never);

    expect(vi.mocked(getClaimsBootstrapData)).not.toHaveBeenCalled();
    expect((element as any).props.initialClaimsData).toBeNull();
    expect((element as any).props.initialFilterOptions).toBeNull();
  });
});
