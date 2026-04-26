import { describe, expect, it } from "vitest";

import * as ExcelUploadModule from "@/components/orders/ExcelUpload";

type UploadResult = Parameters<typeof ExcelUploadModule.getUploadResultPresentation>[0];

const makeResult = (overrides: Partial<UploadResult> = {}): UploadResult => ({
  success: true,
  outcome: "success",
  summary: {
    totalRows: 10,
    validRows: 10,
    newOrders: 10,
    updatedOrders: 0,
    skippedRows: 0,
    failedRows: 0,
    parseErrors: 0,
    processingTime: 1000,
    totalChanges: 0,
  },
  errors: [],
  ...overrides,
});

describe("getUploadResultPresentation", () => {
  it("uses the success banner only when the import is fully clean", () => {
    const presentation = ExcelUploadModule.getUploadResultPresentation(
      makeResult(),
    );

    expect(presentation).toMatchObject({
      tone: "success",
      title: "Tải lên thành công! (1.0s)",
      shouldRefreshData: true,
    });
  });

  it("shows a warning banner and still refreshes data for partial imports", () => {
    const presentation = ExcelUploadModule.getUploadResultPresentation(
      makeResult({
        success: false,
        outcome: "partial",
        summary: {
          totalRows: 10,
          validRows: 10,
          newOrders: 4,
          updatedOrders: 0,
          skippedRows: 0,
          failedRows: 6,
          parseErrors: 0,
          processingTime: 1500,
          totalChanges: 0,
        },
      }),
    );

    expect(presentation).toMatchObject({
      tone: "warning",
      title: "Tải lên hoàn tất một phần (1.5s)",
      shouldRefreshData: true,
    });
  });

  it("shows a failure banner and avoids refreshing data when nothing was imported", () => {
    const presentation = ExcelUploadModule.getUploadResultPresentation(
      makeResult({
        success: false,
        outcome: "failed",
        summary: {
          totalRows: 10,
          validRows: 10,
          newOrders: 0,
          updatedOrders: 0,
          skippedRows: 0,
          failedRows: 10,
          parseErrors: 0,
          processingTime: 1000,
          totalChanges: 0,
        },
      }),
    );

    expect(presentation).toMatchObject({
      tone: "error",
      title: "Tải lên thất bại",
      shouldRefreshData: false,
    });
  });
});
