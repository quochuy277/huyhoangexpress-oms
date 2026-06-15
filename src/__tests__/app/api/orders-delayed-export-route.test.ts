import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";

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

vi.mock("@/lib/rate-limiter", () => ({
  exportLimiter: {
    check: vi.fn(() => null),
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function makeSession() {
  return {
    user: {
      id: "user-1",
      role: "MANAGER",
      permissions: {
        canViewDelayed: true,
      },
    },
  };
}

function makeRawOrder(index: number) {
  return {
    id: `order-${index}`,
    requestCode: `REQ-00${index}`,
    customerOrderCode: `CO-00${index}`,
    carrierOrderCode: `GHN-00${index}`,
    shopName: "Shop A",
    receiverName: `Khách ${index}`,
    receiverPhone: `090000000${index}`,
    receiverAddress: "1 Nguyễn Trãi",
    receiverWard: "Bến Thành",
    receiverDistrict: "Quận 1",
    receiverProvince: "HCM",
    status: "Hoãn giao hàng",
    deliveryStatus: "DELIVERY_DELAYED",
    codAmount: 100000 * index,
    createdTime: new Date(`2026-03-2${index}T00:00:00.000Z`),
    pickupTime: null,
    lastUpdated: new Date(`2026-03-2${index}T10:00:00.000Z`),
    publicNotes: `${8 + index}:00 - 2${index}/03/2026 Hoan giao hang vi: Khong lien lac duoc`,
    carrierName: "GHN",
    staffNotes: "",
    claimOrder: null,
  };
}

describe("delayed export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an XLSX workbook built from batched queries", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    vi.mocked(prisma.order.findMany)
      .mockResolvedValueOnce([makeRawOrder(1)] as never)
      .mockResolvedValueOnce([] as never);

    const { GET } = await import("@/app/api/orders/delayed/export/route");
    const response = await GET(
      new NextRequest("http://localhost/api/orders/delayed/export?sortKey=delayCount&sortDir=desc"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(response.headers.get("Content-Disposition")).toContain(".xlsx");

    const buffer = Buffer.from(await response.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const csv = XLSX.utils.sheet_to_csv(sheet);

    expect(csv).toContain("Mã Yêu Cầu");
    expect(csv).toContain("REQ-001");
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 500,
        skip: 0,
      }),
    );
  });
});
