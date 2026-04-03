import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      findMany: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function makeSession(canViewDelayed: boolean) {
  return {
    user: {
      id: "user-1",
      role: "STAFF",
      permissions: {
        canViewDelayed,
        canEditStaffNotes: true,
      },
    },
  };
}

function makeRawOrder(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `order-${index}`,
    requestCode: `REQ-00${index}`,
    customerOrderCode: `CO-00${index}`,
    carrierOrderCode: `GHN-00${index}`,
    shopName: index === 2 ? "Shop B" : "Shop A",
    receiverName: `Khach ${index}`,
    receiverPhone: `090000000${index}`,
    receiverAddress: "1 Nguyen Trai",
    receiverWard: "Ben Thanh",
    receiverDistrict: "Quan 1",
    receiverProvince: "HCM",
    status: "Hoan giao hang",
    deliveryStatus: "DELIVERY_DELAYED",
    codAmount: 100000 * index,
    createdTime: new Date(`2026-03-2${index}T00:00:00.000Z`),
    pickupTime: null,
    lastUpdated: new Date(`2026-03-2${index}T10:00:00.000Z`),
    publicNotes: `${8 + index}:00 - 2${index}/03/2026 Hoan giao hang vi: ${index === 2 ? "KH hen lai ngay giao" : index === 3 ? "Xac nhan hoan vi: Khach yeu cau hoan" : "Khong lien lac duoc"}`,
    carrierName: "GHN",
    staffNotes: "",
    claimOrder: null,
    ...overrides,
  };
}

describe("delayed route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-22T05:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects users without delayed permission", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession(false) as never);
    const { GET } = await import("@/app/api/orders/delayed/route");

    const response = await GET(new NextRequest("http://localhost/api/orders/delayed"));

    expect(response.status).toBe(403);
    expect(prisma.order.findMany).not.toHaveBeenCalled();
  });

  it("returns paged rows but summary and facets for the full filtered set", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession(true) as never);
    vi.mocked(prisma.order.findMany).mockResolvedValue([
      makeRawOrder(1),
      makeRawOrder(2),
      makeRawOrder(3, {
        publicNotes: "11:00 - 23/03/2026 Hoan giao hang vi: Xac nhan hoan vi: Khach yeu cau hoan",
      }),
    ] as never);

    const { GET } = await import("@/app/api/orders/delayed/route");
    const response = await GET(
      new NextRequest("http://localhost/api/orders/delayed?page=2&pageSize=1"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.rows).toHaveLength(1);
    expect(body.data.summary.total).toBe(3);
    expect(body.data.summary.totalCOD).toBe(600000);
    expect(body.data.facets.shops).toEqual(["Shop A", "Shop B"]);
    expect(body.data.pagination).toEqual({
      page: 2,
      pageSize: 1,
      total: 3,
      totalPages: 3,
    });
  });

  it("filters only orders that have a delayed event today", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession(true) as never);
    vi.mocked(prisma.order.findMany).mockResolvedValue(
      [
        makeRawOrder(1, {
          publicNotes: "09:00 - 22/03/2026 Hoan giao hang vi: Khong lien lac duoc",
        }),
        makeRawOrder(2, {
          publicNotes: "10:00 - 21/03/2026 Hoan giao hang vi: KH hen lai ngay giao",
        }),
      ] as never,
    );

    const { GET } = await import("@/app/api/orders/delayed/route");
    const response = await GET(
      new NextRequest("http://localhost/api/orders/delayed?today=1&page=1&pageSize=50"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.rows.map((order: { requestCode: string }) => order.requestCode)).toEqual([
      "REQ-001",
    ]);
    expect(body.data.summary.total).toBe(1);
  });

  it("caps delayed scanning and returns a warning flag when the dataset is too large", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession(true) as never);
    vi.mocked(prisma.order.findMany).mockResolvedValue(
      Array.from({ length: 2001 }, (_, index) => makeRawOrder(index + 1)) as never,
    );

    const { GET } = await import("@/app/api/orders/delayed/route");
    const response = await GET(new NextRequest("http://localhost/api/orders/delayed?page=1&pageSize=50"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 2001,
        orderBy: { lastUpdated: "desc" },
      }),
    );
    expect(body.data.meta).toEqual({
      isTruncated: true,
      scanLimit: 2000,
      warning: "Dữ liệu quá lớn, vui lòng dùng bộ lọc để xem kết quả chính xác hơn",
    });
    expect(body.data.pagination.total).toBe(2000);
  });
});
