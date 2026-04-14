import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/delay-analyzer", () => ({
  processDelayedOrder: vi.fn(),
}));

vi.mock("@/lib/server-timing", () => ({
  createServerTiming: () => ({
    measure: async (_label: string, fn: () => Promise<unknown> | unknown) => fn(),
    record: vi.fn(),
    log: vi.fn(),
    headerValue: () => "",
    headers: () => ({}),
  }),
}));

describe("delayed page data", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("reuses parsed delayed data for page-only transitions with the same filters", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { processDelayedOrder } = await import("@/lib/delay-analyzer");
    const prismaMock = prisma as unknown as { order: { findMany: ReturnType<typeof vi.fn> } };
    const processMock = processDelayedOrder as ReturnType<typeof vi.fn>;

    prismaMock.order.findMany.mockResolvedValue([
      { requestCode: "REQ-001" },
      { requestCode: "REQ-002" },
    ] as never);
    processMock
      .mockReturnValueOnce({
        requestCode: "REQ-001",
        customerOrderCode: "",
        carrierOrderCode: "",
        shopName: "Shop A",
        receiverName: "",
        receiverPhone: "",
        fullAddress: "",
        status: "DELIVERING",
        delayCount: 2,
        delays: [],
        uniqueReasons: ["KH hẹn lại ngày giao"],
        risk: "high",
        riskScore: 9,
        codAmount: 100000,
        createdTime: new Date("2026-04-10T00:00:00.000Z"),
      })
      .mockReturnValueOnce({
        requestCode: "REQ-002",
        customerOrderCode: "",
        carrierOrderCode: "",
        shopName: "Shop B",
        receiverName: "",
        receiverPhone: "",
        fullAddress: "",
        status: "DELIVERING",
        delayCount: 1,
        delays: [],
        uniqueReasons: ["KH hẹn lại ngày giao"],
        risk: "medium",
        riskScore: 5,
        codAmount: 200000,
        createdTime: new Date("2026-04-11T00:00:00.000Z"),
      });

    const { getDelayedPageData } = await import("@/lib/delayed-page-data");

    const first = await getDelayedPageData({ page: 1, pageSize: 1, shopFilter: "Shop A" });
    const second = await getDelayedPageData({ page: 2, pageSize: 1, shopFilter: "Shop A", skipFacets: true });

    expect(first.data.pagination.total).toBe(2);
    expect(second.data.pagination.page).toBe(2);
    expect(prismaMock.order.findMany).toHaveBeenCalledTimes(1);
    expect(processMock).toHaveBeenCalledTimes(2);
  });

  it("reuses parsed order metadata across different filters when the same order is returned again", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { processDelayedOrder } = await import("@/lib/delay-analyzer");
    const prismaMock = prisma as unknown as { order: { findMany: ReturnType<typeof vi.fn> } };
    const processMock = processDelayedOrder as ReturnType<typeof vi.fn>;

    const sharedOrder = {
      id: "order-1",
      requestCode: "REQ-001",
      shopName: "Shop A",
      lastUpdated: new Date("2026-04-10T00:00:00.000Z"),
    };
    const secondOrder = {
      id: "order-2",
      requestCode: "REQ-002",
      shopName: "Shop B",
      lastUpdated: new Date("2026-04-11T00:00:00.000Z"),
    };

    prismaMock.order.findMany
      .mockResolvedValueOnce([sharedOrder, secondOrder] as never)
      .mockResolvedValueOnce([sharedOrder] as never);

    processMock
      .mockReturnValueOnce({
        requestCode: "REQ-001",
        customerOrderCode: "",
        carrierOrderCode: "",
        shopName: "Shop A",
        receiverName: "",
        receiverPhone: "",
        fullAddress: "",
        status: "DELIVERING",
        delayCount: 2,
        delays: [],
        uniqueReasons: ["KH hẹn lại ngày giao"],
        risk: "high",
        riskScore: 9,
        codAmount: 100000,
        createdTime: new Date("2026-04-10T00:00:00.000Z"),
      })
      .mockReturnValueOnce({
        requestCode: "REQ-002",
        customerOrderCode: "",
        carrierOrderCode: "",
        shopName: "Shop B",
        receiverName: "",
        receiverPhone: "",
        fullAddress: "",
        status: "DELIVERING",
        delayCount: 1,
        delays: [],
        uniqueReasons: ["KH hẹn lại ngày giao"],
        risk: "medium",
        riskScore: 5,
        codAmount: 200000,
        createdTime: new Date("2026-04-11T00:00:00.000Z"),
      })
      .mockReturnValueOnce({
        requestCode: "REQ-001",
        customerOrderCode: "",
        carrierOrderCode: "",
        shopName: "Shop A",
        receiverName: "",
        receiverPhone: "",
        fullAddress: "",
        status: "DELIVERING",
        delayCount: 2,
        delays: [],
        uniqueReasons: ["KH hẹn lại ngày giao"],
        risk: "high",
        riskScore: 9,
        codAmount: 100000,
        createdTime: new Date("2026-04-10T00:00:00.000Z"),
      });

    const { getDelayedPageData } = await import("@/lib/delayed-page-data");

    await getDelayedPageData({ page: 1, pageSize: 50 });
    await getDelayedPageData({ page: 1, pageSize: 50, shopFilter: "Shop A" });

    expect(prismaMock.order.findMany).toHaveBeenCalledTimes(2);
    expect(processMock).toHaveBeenCalledTimes(2);
  });
});
