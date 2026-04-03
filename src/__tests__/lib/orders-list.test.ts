import { describe, expect, it, vi } from "vitest";

import { buildOrdersListQuery, getOrdersList } from "@/lib/orders-list";

describe("buildOrdersListQuery", () => {
  it("uses exact requestCode lookup", () => {
    const query = buildOrdersListQuery({
      page: 1,
      pageSize: 20,
      search: "B65ACHM0007569",
      status: "",
      carrier: "",
      fromDate: "",
      toDate: "",
      hasNotes: "",
      shopName: "",
      salesStaff: "",
      partialOrderType: "",
      regionGroup: "",
      sortBy: "createdTime",
      sortOrder: "desc",
    });

    expect(query.where).toEqual({
      AND: expect.arrayContaining([{ requestCode: "B65ACHM0007569" }]),
    });
    expect(query.skipCount).toBe(true);
  });

  it("uses recent 30-day default for browse", () => {
    const query = buildOrdersListQuery({
      page: 1,
      pageSize: 20,
      search: "",
      status: "",
      carrier: "",
      fromDate: "",
      toDate: "",
      hasNotes: "",
      shopName: "",
      salesStaff: "",
      partialOrderType: "",
      regionGroup: "",
      sortBy: "createdTime",
      sortOrder: "desc",
    });

    expect(query.where).toEqual({
      AND: expect.arrayContaining([
        expect.objectContaining({
          createdTime: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      ]),
    });
  });
});

describe("getOrdersList", () => {
  it("skips count for exact request code search", async () => {
    const prismaMock = {
      order: {
        findMany: vi.fn().mockResolvedValue([
          { id: "1", requestCode: "B65ACHM0007569" },
        ]),
        count: vi.fn(),
      },
    };

    const result = await getOrdersList(
      {
        page: 1,
        pageSize: 20,
        search: "B65ACHM0007569",
        status: "",
        carrier: "",
        fromDate: "",
        toDate: "",
        hasNotes: "",
        shopName: "",
        salesStaff: "",
        partialOrderType: "",
        regionGroup: "",
        sortBy: "createdTime",
        sortOrder: "desc",
      },
      prismaMock as never,
    );

    expect(prismaMock.order.count).not.toHaveBeenCalled();
    expect(result.total).toBe(1);
  });

  it("starts count without waiting for findMany on browse queries", async () => {
    let releaseFindMany: ((value: unknown[]) => void) | null = null;
    const findManyPromise = new Promise<unknown[]>((resolve) => {
      releaseFindMany = resolve;
    });

    const prismaMock = {
      order: {
        findMany: vi.fn().mockReturnValue(findManyPromise),
        count: vi.fn().mockResolvedValue(42),
      },
    };

    const pendingResult = getOrdersList(
      {
        page: 1,
        pageSize: 20,
        search: "",
        status: "",
        carrier: "",
        fromDate: "",
        toDate: "",
        hasNotes: "",
        shopName: "",
        salesStaff: "",
        partialOrderType: "",
        regionGroup: "",
        sortBy: "createdTime",
        sortOrder: "desc",
      },
      prismaMock as never,
    );

    await Promise.resolve();
    expect(prismaMock.order.count).toHaveBeenCalledTimes(1);

    expect(releaseFindMany).not.toBeNull();
    releaseFindMany!([]);
    await pendingResult;
  });
});
