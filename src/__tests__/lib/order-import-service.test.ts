import "@/__tests__/helpers/prisma-mock";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock } from "@/__tests__/helpers/prisma-mock";
import type { ParsedOrder } from "@/lib/excel-parser";
import { parseExcelBuffer } from "@/lib/excel-parser";
import { createAutoDetectedClaims } from "@/lib/claim-detector";
import { processOrderImport } from "@/lib/order-import-service";

vi.mock("@/lib/excel-parser", async () => {
  const actual = await vi.importActual<typeof import("@/lib/excel-parser")>("@/lib/excel-parser");
  return {
    ...actual,
    parseExcelBuffer: vi.fn(),
  };
});

vi.mock("@/lib/change-detector", () => ({
  detectOrderChanges: vi.fn(() => []),
}));

vi.mock("@/lib/claim-detector", () => ({
  createAutoDetectedClaims: vi.fn(() => Promise.resolve()),
}));

function makeParsedOrder(index: number): ParsedOrder {
  const padded = String(index).padStart(7, "0");
  return {
    reconciliationCode: null,
    reconciliationDate: null,
    shopName: "Shop thử nghiệm",
    customerOrderCode: null,
    requestCode: `B65AOMS${padded}`,
    status: "Đang giao hàng",
    deliveryStatus: "DELIVERING",
    createdTime: new Date("2026-04-05T08:00:00.000Z"),
    pickupTime: null,
    codAmount: 0,
    codOriginal: 0,
    declaredValue: 0,
    shippingFee: 0,
    surcharge: 0,
    overweightFee: 0,
    insuranceFee: 0,
    codServiceFee: 0,
    returnFee: 0,
    totalFee: 0,
    carrierFee: 0,
    ghsvInsuranceFee: 0,
    revenue: 0,
    creatorShopName: null,
    creatorPhone: null,
    creatorStaff: null,
    creatorAddress: null,
    creatorWard: null,
    creatorDistrict: null,
    creatorProvince: null,
    senderShopName: null,
    senderPhone: null,
    senderAddress: null,
    senderWard: null,
    senderDistrict: null,
    senderProvince: null,
    receiverName: `Người nhận ${index}`,
    receiverPhone: `090000${String(index).padStart(4, "0")}`,
    receiverAddress: null,
    receiverWard: null,
    receiverDistrict: null,
    receiverProvince: null,
    deliveryNotes: null,
    productDescription: null,
    paymentConfirmDate: null,
    internalNotes: null,
    publicNotes: null,
    lastUpdated: null,
    carrierName: "SVExpress",
    carrierAccount: null,
    carrierOrderCode: `SPXVN${String(index).padStart(10, "0")}`,
    regionGroup: null,
    customerWeight: null,
    carrierWeight: null,
    deliveredDate: null,
    pickupShipper: null,
    deliveryShipper: null,
    orderSource: null,
    partialOrderType: null,
    partialOrderCode: null,
    salesStaff: null,
  };
}

describe("processOrderImport", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    prismaMock.order.findMany.mockResolvedValue([] as never);
    prismaMock.uploadHistory.create.mockResolvedValue({ id: "upload-1" } as never);
    prismaMock.orderChangeLog.createMany.mockResolvedValue({ count: 0 } as never);
    prismaMock.$executeRaw.mockResolvedValue(1 as never);
    vi.mocked(parseExcelBuffer).mockReturnValue({
      orders: [],
      errors: [],
      summary: {
        totalRows: 0,
        validRows: 0,
        errorRows: 0,
        skippedRows: 0,
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries transient sub-batch errors and succeeds before exhausting the retry budget", async () => {
    vi.mocked(parseExcelBuffer).mockReturnValue({
      orders: Array.from({ length: 10 }, (_, index) => makeParsedOrder(index + 1)),
      errors: [],
      summary: {
        totalRows: 10,
        validRows: 10,
        errorRows: 0,
        skippedRows: 0,
      },
    });

    prismaMock.$executeRaw
      .mockRejectedValueOnce(new Error("Transaction API error: Transaction not found"))
      .mockResolvedValueOnce(10 as never);

    const pending = processOrderImport({
      buffer: new ArrayBuffer(0),
      fileName: "orders.xlsx",
      fileSize: 1024,
      uploadedById: "user-1",
    });

    await vi.runAllTimersAsync();
    const result = await pending;

    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
    expect(result.outcome).toBe("success");
    expect(result.summary.newOrders).toBe(10);
    expect(result.summary.failedRows).toBe(0);
    expect(vi.mocked(createAutoDetectedClaims)).toHaveBeenCalledWith("user-1");
  });

  it("keeps later sub-batches running after retry exhaustion and returns a partial outcome", async () => {
    vi.mocked(parseExcelBuffer).mockReturnValue({
      orders: Array.from({ length: 130 }, (_, index) => makeParsedOrder(index + 1)),
      errors: [],
      summary: {
        totalRows: 130,
        validRows: 130,
        errorRows: 0,
        skippedRows: 0,
      },
    });

    prismaMock.$executeRaw
      .mockRejectedValueOnce(new Error("Transaction API error: Transaction already closed"))
      .mockRejectedValueOnce(new Error("Transaction API error: Transaction already closed"))
      .mockRejectedValueOnce(new Error("Transaction API error: Transaction not found"))
      .mockRejectedValueOnce(new Error("Transaction API error: Transaction not found"))
      .mockResolvedValueOnce(5 as never);

    const pending = processOrderImport({
      buffer: new ArrayBuffer(0),
      fileName: "orders.xlsx",
      fileSize: 1024,
      uploadedById: "user-1",
    });

    await vi.runAllTimersAsync();
    const result = await pending;

    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(5);
    expect(result.success).toBe(false);
    expect(result.outcome).toBe("partial");
    expect(result.summary.newOrders).toBe(5);
    expect(result.summary.failedRows).toBe(125);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "upsert",
          message: expect.stringContaining("Transaction API error"),
        }),
      ]),
    );

    expect(prismaMock.uploadHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          failedRows: 125,
          errorLog: expect.any(String),
        }),
      }),
    );

    const uploadHistoryArg = prismaMock.uploadHistory.create.mock.calls[0]?.[0];
    const errorLog = JSON.parse(uploadHistoryArg?.data?.errorLog ?? "{}");
    expect(errorLog.subBatchFailures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          batchIndex: 0,
          subBatchIndex: 0,
          rowStart: 2,
          rowEnd: 126,
          requestCodeStart: "B65AOMS0000001",
          requestCodeEnd: "B65AOMS0000125",
          attempts: 4,
          retryable: true,
        }),
      ]),
    );
    expect(errorLog.retrySummary).toEqual(
      expect.objectContaining({
        retriedSubBatches: 1,
        totalRetryAttempts: 3,
        exhaustedSubBatches: 1,
      }),
    );
  });

  it("does not retry non-transient errors and marks the import as failed", async () => {
    vi.mocked(parseExcelBuffer).mockReturnValue({
      orders: Array.from({ length: 10 }, (_, index) => makeParsedOrder(index + 1)),
      errors: [],
      summary: {
        totalRows: 10,
        validRows: 10,
        errorRows: 0,
        skippedRows: 0,
      },
    });

    prismaMock.$executeRaw.mockRejectedValueOnce(
      new Error('duplicate key value violates unique constraint "Order_requestCode_key"'),
    );

    const pending = processOrderImport({
      buffer: new ArrayBuffer(0),
      fileName: "orders.xlsx",
      fileSize: 1024,
      uploadedById: "user-1",
    });

    await vi.runAllTimersAsync();
    const result = await pending;

    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    expect(result.outcome).toBe("failed");
    expect(result.summary.newOrders).toBe(0);
    expect(result.summary.failedRows).toBe(10);
  });
});
