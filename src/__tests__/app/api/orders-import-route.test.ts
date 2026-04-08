import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/order-import-service", () => ({
  processOrderImport: vi.fn(),
  getSystemUserId: vi.fn(),
}));

vi.mock("@/lib/rate-limiter", () => ({
  uploadLimiter: {
    check: vi.fn(() => null),
  },
  autoImportLimiter: {
    check: vi.fn(() => null),
  },
}));

import { auth } from "@/lib/auth";
import { getSystemUserId, processOrderImport } from "@/lib/order-import-service";

const partialResult = {
  success: false,
  outcome: "partial" as const,
  summary: {
    totalRows: 130,
    validRows: 130,
    newOrders: 5,
    updatedOrders: 0,
    skippedRows: 0,
    failedRows: 125,
    parseErrors: 0,
    processingTime: 1200,
    totalChanges: 0,
  },
  errors: [
    {
      row: 2,
      field: "upsert",
      value: "B65AOMS0000001",
      message: "Sub-batch import thất bại sau khi thử lại 3 lần.",
    },
  ],
};

describe("orders import routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTO_IMPORT_API_KEY = "test-auto-import-key";
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: "user-1",
        role: "ADMIN",
        permissions: {
          canUploadExcel: true,
        },
      },
    } as never);
    vi.mocked(getSystemUserId).mockResolvedValue("system-user-1" as never);
    vi.mocked(processOrderImport).mockResolvedValue(partialResult as never);
  });

  it("returns a partial upload result with HTTP 200 for the manual upload route", async () => {
    const formData = new FormData();
    formData.append("file", new File(["dummy"], "orders.xlsx"));

    const { POST } = await import("@/app/api/orders/upload/route");
    const response = await POST(new NextRequest("http://localhost/api/orders/upload", {
      method: "POST",
      body: formData,
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(partialResult);
  });

  it("returns a partial upload result with HTTP 200 for the auto-import route", async () => {
    const formData = new FormData();
    formData.append("file", new File(["dummy"], "orders.xlsx"));

    const { POST } = await import("@/app/api/orders/auto-import/route");
    const response = await POST(new NextRequest("http://localhost/api/orders/auto-import", {
      method: "POST",
      headers: {
        "x-api-key": "test-auto-import-key",
      },
      body: formData,
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(partialResult);
  });

  it("rejects the auto-import route when the API key is missing", async () => {
    const formData = new FormData();
    formData.append("file", new File(["dummy"], "orders.xlsx"));

    const { POST } = await import("@/app/api/orders/auto-import/route");
    const response = await POST(new NextRequest("http://localhost/api/orders/auto-import", {
      method: "POST",
      body: formData,
    }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Invalid API key" });
    expect(vi.mocked(processOrderImport)).not.toHaveBeenCalled();
  });
});
