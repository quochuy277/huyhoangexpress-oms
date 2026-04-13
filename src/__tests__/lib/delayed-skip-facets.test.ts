import { describe, expect, it } from "vitest";

import {
  createDelayedFacetSignature,
  shouldSkipDelayedFacets,
} from "@/lib/delayed-skip-facets";
import type { DelayedFiltersState } from "@/types/delayed";

const baseFilters: DelayedFiltersState = {
  searchTerm: "ABC123",
  shopFilter: "Shop A",
  statusFilter: "DELIVERING",
  delayCountFilter: "2",
  reasonFilter: "KH hẹn lại ngày giao",
  riskFilter: "high",
  todayOnly: false,
};

describe("delayed skip facets helpers", () => {
  it("tạo chữ ký ổn định cho cùng bộ lọc", () => {
    const left = createDelayedFacetSignature(baseFilters);
    const right = createDelayedFacetSignature({ ...baseFilters });

    expect(left).toBe(right);
  });

  it("đổi chữ ký khi thay đổi bộ lọc", () => {
    const left = createDelayedFacetSignature(baseFilters);
    const right = createDelayedFacetSignature({
      ...baseFilters,
      riskFilter: "medium",
    });

    expect(left).not.toBe(right);
  });

  it("không skip facets ở lần mount đầu", () => {
    const signature = createDelayedFacetSignature(baseFilters);

    expect(
      shouldSkipDelayedFacets({
        didMount: false,
        currentSignature: signature,
        lastFacetSignature: signature,
      }),
    ).toBe(false);
  });

  it("skip facets khi chỉ đổi page/sort (bộ lọc không đổi)", () => {
    const signature = createDelayedFacetSignature(baseFilters);

    expect(
      shouldSkipDelayedFacets({
        didMount: true,
        currentSignature: signature,
        lastFacetSignature: signature,
      }),
    ).toBe(true);
  });

  it("không skip facets khi bộ lọc thay đổi", () => {
    const currentSignature = createDelayedFacetSignature(baseFilters);
    const lastFacetSignature = createDelayedFacetSignature({
      ...baseFilters,
      searchTerm: "OLD",
    });

    expect(
      shouldSkipDelayedFacets({
        didMount: true,
        currentSignature,
        lastFacetSignature,
      }),
    ).toBe(false);
  });
});
