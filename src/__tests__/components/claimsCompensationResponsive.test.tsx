import { describe, expect, test } from "vitest";

import {
  CLAIMS_MOBILE_BREAKPOINT,
  shouldUseClaimsCompensationCards,
} from "@/components/claims/claims-table/claimsResponsive";

describe("claimsCompensationResponsive", () => {
  test("uses compensation cards below the shared tablet breakpoint", () => {
    expect(shouldUseClaimsCompensationCards(375)).toBe(true);
    expect(shouldUseClaimsCompensationCards(CLAIMS_MOBILE_BREAKPOINT - 1)).toBe(true);
    expect(shouldUseClaimsCompensationCards(CLAIMS_MOBILE_BREAKPOINT)).toBe(false);
  });
});
