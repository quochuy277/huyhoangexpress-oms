import { describe, expect, it } from "vitest";

import {
  classifyOrderSearch,
  getDefaultRecentFromDate,
  shouldApplyDefaultRecentWindow,
} from "@/lib/orders-search";

describe("classifyOrderSearch", () => {
  it("classifies full request code", () => {
    expect(classifyOrderSearch("B65ACHM0007569")).toEqual({
      kind: "requestCode",
      normalized: "B65ACHM0007569",
    });
  });

  it("classifies full phone", () => {
    expect(classifyOrderSearch("0904873551")).toEqual({
      kind: "phoneFull",
      normalized: "0904873551",
    });
  });

  it("classifies phone last4", () => {
    expect(classifyOrderSearch("3551")).toEqual({
      kind: "phoneLast4",
      normalized: "3551",
    });
  });

  it("classifies GYK carrier code", () => {
    expect(classifyOrderSearch("GYKBGEVY")).toEqual({
      kind: "carrierCode",
      normalized: "GYKBGEVY",
    });
  });

  it("classifies SPX carrier code", () => {
    expect(classifyOrderSearch("spxvn065270162254")).toEqual({
      kind: "carrierCode",
      normalized: "SPXVN065270162254",
    });
  });

  it("classifies numeric carrier code not starting with 0", () => {
    expect(classifyOrderSearch("802720245422")).toEqual({
      kind: "carrierCode",
      normalized: "802720245422",
    });
  });

  it("falls back to text", () => {
    expect(classifyOrderSearch("431 Oni")).toEqual({
      kind: "text",
      normalized: "431 Oni",
    });
  });
});

describe("shouldApplyDefaultRecentWindow", () => {
  it("applies recent window for browse", () => {
    expect(
      shouldApplyDefaultRecentWindow({
        searchKind: "empty",
        fromDate: "",
        toDate: "",
      }),
    ).toBe(true);
  });

  it("applies recent window for phone last4", () => {
    expect(
      shouldApplyDefaultRecentWindow({
        searchKind: "phoneLast4",
        fromDate: "",
        toDate: "",
      }),
    ).toBe(true);
  });

  it("does not apply recent window for full identifier", () => {
    expect(
      shouldApplyDefaultRecentWindow({
        searchKind: "requestCode",
        fromDate: "",
        toDate: "",
      }),
    ).toBe(false);
  });
});

describe("getDefaultRecentFromDate", () => {
  it("returns 30-day lower bound", () => {
    const now = new Date("2026-04-03T12:00:00.000Z");
    const expected = new Date(now);
    expected.setDate(expected.getDate() - 30);
    expected.setHours(0, 0, 0, 0);

    const from = getDefaultRecentFromDate(now);
    expect(from.getTime()).toBe(expected.getTime());
  });
});
