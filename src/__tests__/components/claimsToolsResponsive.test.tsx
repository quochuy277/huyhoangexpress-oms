import { describe, expect, test } from "vitest";

import {
  CLAIMS_MOBILE_BREAKPOINT,
  shouldStackClaimsToolsLayout,
  shouldUseClaimsToolsHistoryCards,
} from "@/components/claims/claims-table/claimsResponsive";

describe("claimsToolsResponsive", () => {
  test("stacks claims tools cards below the shared tablet breakpoint", () => {
    expect(shouldStackClaimsToolsLayout(390)).toBe(true);
    expect(shouldStackClaimsToolsLayout(CLAIMS_MOBILE_BREAKPOINT - 1)).toBe(true);
    expect(shouldStackClaimsToolsLayout(CLAIMS_MOBILE_BREAKPOINT)).toBe(false);
  });

  test("switches history table to cards below the shared tablet breakpoint", () => {
    expect(shouldUseClaimsToolsHistoryCards(390)).toBe(true);
    expect(shouldUseClaimsToolsHistoryCards(CLAIMS_MOBILE_BREAKPOINT - 1)).toBe(true);
    expect(shouldUseClaimsToolsHistoryCards(CLAIMS_MOBILE_BREAKPOINT)).toBe(false);
  });
});
