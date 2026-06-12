import { describe, expect, it } from "vitest";

import {
  createDefaultCompensationFilters,
  getPresetRange,
} from "@/components/claims/compensation/CompensationFilterBar";

const NOW = new Date(2026, 5, 12); // 12/06/2026

describe("getPresetRange", () => {
  it("computes month preset", () => {
    expect(getPresetRange("month", NOW)).toEqual({ dateFrom: "2026-06-01", dateTo: "2026-06-12" });
  });

  it("computes quarter preset", () => {
    expect(getPresetRange("quarter", NOW)).toEqual({ dateFrom: "2026-04-01", dateTo: "2026-06-12" });
  });

  it("computes year preset", () => {
    expect(getPresetRange("year", NOW)).toEqual({ dateFrom: "2026-01-01", dateTo: "2026-06-12" });
  });
});

describe("createDefaultCompensationFilters", () => {
  it("defaults to year-to-date with all shops", () => {
    expect(createDefaultCompensationFilters(NOW)).toEqual({
      preset: "year",
      dateFrom: "2026-01-01",
      dateTo: "2026-06-12",
      shopName: "",
    });
  });
});
