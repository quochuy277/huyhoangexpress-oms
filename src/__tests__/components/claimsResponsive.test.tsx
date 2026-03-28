import { describe, expect, test } from "vitest";

import {
  applyClaimsFiltersToSearchParams,
  createClaimsFiltersFromSearchParams,
  DEFAULT_CLAIM_FILTERS,
} from "@/hooks/useClaimsFilters";
import { shouldUseClaimsMobileCards } from "@/components/claims/claims-table/claimsResponsive";

describe("claimsResponsive", () => {
  test("hydrates claims filters from URL search params", () => {
    const filters = createClaimsFiltersFromSearchParams(new URLSearchParams(
      "claimPage=3&claimSearch=GHN123&claimIssueType=LOST,DAMAGED&claimStatus=RESOLVED&claimShop=Shop+A&claimOrderStatus=DELIVERED&claimCompleted=true&claimSortBy=detectedDate&claimSortDir=desc",
    ));

    expect(filters).toMatchObject({
      page: 3,
      search: "GHN123",
      issueType: ["LOST", "DAMAGED"],
      status: "RESOLVED",
      shopName: "Shop A",
      orderStatus: "DELIVERED",
      showCompleted: true,
      sortBy: "detectedDate",
      sortDir: "desc",
    });
  });

  test("serializes claims filters back into URL search params", () => {
    const params = applyClaimsFiltersToSearchParams(
      new URLSearchParams("claimTab=claims"),
      {
        ...DEFAULT_CLAIM_FILTERS,
        page: 2,
        search: "Shop X",
        issueType: ["SUSPICIOUS"],
        status: "PENDING",
        showCompleted: true,
      },
    );

    expect(params.get("claimTab")).toBe("claims");
    expect(params.get("claimPage")).toBe("2");
    expect(params.get("claimSearch")).toBe("Shop X");
    expect(params.get("claimIssueType")).toBe("SUSPICIOUS");
    expect(params.get("claimStatus")).toBe("PENDING");
    expect(params.get("claimCompleted")).toBe("true");
    expect(params.get("claimSortBy")).toBeNull();
    expect(params.get("claimSortDir")).toBeNull();
  });

  test("uses mobile cards below tablet breakpoint", () => {
    expect(shouldUseClaimsMobileCards(375)).toBe(true);
    expect(shouldUseClaimsMobileCards(767)).toBe(true);
    expect(shouldUseClaimsMobileCards(768)).toBe(false);
  });
});
