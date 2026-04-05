import { describe, expect, it } from "vitest";

import {
  buildOrderSearchFilters,
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

describe("buildOrderSearchFilters", () => {
  it("builds exact request code lookup without recent window", () => {
    expect(
      buildOrderSearchFilters({
        search: "b65achm0007569",
      }),
    ).toEqual({
      searchMeta: {
        kind: "requestCode",
        normalized: "B65ACHM0007569",
      },
      filters: [{ requestCode: "B65ACHM0007569" }],
    });
  });

  it("builds text lookup with the shared recent window", () => {
    const result = buildOrderSearchFilters({
      search: "431 Oni",
    });

    expect(result.searchMeta).toEqual({
      kind: "text",
      normalized: "431 Oni",
    });
    expect(result.filters).toEqual(
      expect.arrayContaining([
        {
          OR: [
            { receiverName: { contains: "431 Oni", mode: "insensitive" } },
            { shopName: { contains: "431 Oni", mode: "insensitive" } },
            { carrierOrderCode: { contains: "431 Oni", mode: "insensitive" } },
          ],
        },
        expect.objectContaining({
          createdTime: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      ]),
    );
  });

  it("builds phone last4 lookup and keeps the recent window", () => {
    expect(
      buildOrderSearchFilters({
        search: "3551",
      }),
    ).toMatchObject({
      searchMeta: {
        kind: "phoneLast4",
        normalized: "3551",
      },
      filters: expect.arrayContaining([
        { receiverPhone: { endsWith: "3551" } },
        expect.objectContaining({
          createdTime: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      ]),
    });
  });

  it("skips the recent window when an explicit date range exists", () => {
    expect(
      buildOrderSearchFilters({
        search: "431 Oni",
        fromDate: "2026-03-01",
      }),
    ).toEqual({
      searchMeta: {
        kind: "text",
        normalized: "431 Oni",
      },
      filters: [
        {
          OR: [
            { receiverName: { contains: "431 Oni", mode: "insensitive" } },
            { shopName: { contains: "431 Oni", mode: "insensitive" } },
            { carrierOrderCode: { contains: "431 Oni", mode: "insensitive" } },
          ],
        },
      ],
    });
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
