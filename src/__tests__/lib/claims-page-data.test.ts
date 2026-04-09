import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  createClaimsFilterOptions,
  normalizeClaimForClient,
} from "@/lib/claims-page-data";

describe("normalizeClaimForClient", () => {
  it("converts Decimal and Date fields into client-safe values", () => {
    const normalized = normalizeClaimForClient({
      id: "claim-1",
      orderId: "order-1",
      issueType: "BROKEN",
      issueDescription: "Vỡ hàng",
      detectedDate: new Date("2026-04-08T10:00:00.000Z"),
      deadline: new Date("2026-04-12T10:00:00.000Z"),
      claimStatus: "PENDING",
      processingContent: "Đang xử lý",
      carrierCompensation: new Prisma.Decimal("125000"),
      customerCompensation: new Prisma.Decimal("50000"),
      isCompleted: false,
      completedAt: null,
      completedBy: null,
      source: "MANUAL",
      createdById: "user-1",
      createdAt: new Date("2026-04-08T09:00:00.000Z"),
      updatedAt: new Date("2026-04-08T11:00:00.000Z"),
      order: {
        requestCode: "REQ-001",
        carrierOrderCode: "GHN001",
        carrierName: "GHN",
        shopName: "Shop A",
        status: "Đang giao",
        deliveryStatus: "DELIVERING",
        codAmount: new Prisma.Decimal("250000"),
        totalFee: new Prisma.Decimal("35000"),
        staffNotes: "Ghi chú",
        receiverPhone: "0900000000",
        receiverName: "Nguyễn Văn A",
        receiverAddress: "Hà Nội",
      },
      createdBy: { name: "Nhân viên A" },
    });

    expect(normalized).toMatchObject({
      carrierCompensation: 125000,
      customerCompensation: 50000,
      detectedDate: "2026-04-08T10:00:00.000Z",
      deadline: "2026-04-12T10:00:00.000Z",
      createdAt: "2026-04-08T09:00:00.000Z",
      updatedAt: "2026-04-08T11:00:00.000Z",
      order: {
        codAmount: 250000,
        totalFee: 35000,
      },
    });
  });

  it("builds unique sorted filter options from a single order projection list", () => {
    const options = createClaimsFilterOptions([
      { order: { shopName: "Shop B", status: "Đang giao" } },
      { order: { shopName: "Shop A", status: "Đã giao hàng" } },
      { order: { shopName: "Shop B", status: "Đang giao" } },
      { order: { shopName: "Shop C", status: null } },
      { order: null },
    ]);

    expect(options).toEqual({
      shops: ["Shop A", "Shop B", "Shop C"],
      statuses: ["Đã giao hàng", "Đang giao"],
    });
  });
});
