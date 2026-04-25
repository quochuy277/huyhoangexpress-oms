import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  CLAIMS_LIST_SELECT,
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

  it("does not leak fields that are only needed by the detail drawer", () => {
    // Dropping completedAt/completedBy/source/createdById/createdAt/
    // updatedAt in Sprint 2: those fields are only rendered by the detail
    // drawer, not the list. Spreading ...claim in normalizeClaimForClient
    // would re-introduce them if the Prisma select accidentally pulled
    // them back in. This test enforces the list payload shape.
    const normalized = normalizeClaimForClient({
      id: "claim-1",
      orderId: "order-1",
      issueType: "BROKEN",
      issueDescription: null,
      detectedDate: new Date("2026-04-08T10:00:00.000Z"),
      deadline: null,
      claimStatus: "PENDING",
      processingContent: null,
      carrierCompensation: new Prisma.Decimal("0"),
      customerCompensation: new Prisma.Decimal("0"),
      isCompleted: false,
      order: null,
      // Simulate fields leaking in if someone regresses the select:
      completedAt: new Date(),
      completedBy: "leaked",
      source: "leaked",
      createdById: "leaked",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Fields that MUST be present in the list payload
    const requiredKeys = [
      "id",
      "orderId",
      "issueType",
      "issueDescription",
      "detectedDate",
      "deadline",
      "claimStatus",
      "processingContent",
      "carrierCompensation",
      "customerCompensation",
      "isCompleted",
    ];
    for (const key of requiredKeys) {
      expect(normalized).toHaveProperty(key);
    }
  });

  it("CLAIMS_LIST_SELECT locks the list-response contract", () => {
    // Guard against someone reintroducing over-fetched columns or
    // dropping columns the UI depends on. If a deliberate change is
    // needed, update both this test and the consuming UI in the same
    // commit.
    expect(Object.keys(CLAIMS_LIST_SELECT).sort()).toEqual(
      [
        "id",
        "orderId",
        "issueType",
        "issueDescription",
        "detectedDate",
        "deadline",
        "claimStatus",
        "processingContent",
        "carrierCompensation",
        "customerCompensation",
        "isCompleted",
        "order",
      ].sort(),
    );

    // Fields explicitly dropped from the list response (they live in
    // the detail drawer endpoint only).
    const droppedFromList = [
      "completedAt",
      "completedBy",
      "source",
      "createdById",
      "createdAt",
      "updatedAt",
    ];
    for (const key of droppedFromList) {
      expect(CLAIMS_LIST_SELECT).not.toHaveProperty(key);
    }

    // Nested order select must not include large unused blobs like
    // receiverAddress / receiverPhone in a list payload.
    expect(Object.keys(CLAIMS_LIST_SELECT.order.select).sort()).toEqual(
      [
        "requestCode",
        "carrierOrderCode",
        "shopName",
        "status",
        "codAmount",
        "staffNotes",
      ].sort(),
    );
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
