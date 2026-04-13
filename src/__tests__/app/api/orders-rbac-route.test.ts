import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/order-import-service", () => ({
  processOrderImport: vi.fn(),
}));

vi.mock("@/lib/rate-limiter", () => ({
  exportLimiter: {
    check: vi.fn(() => null),
  },
  uploadLimiter: {
    check: vi.fn(() => null),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
import { processOrderImport } from "@/lib/order-import-service";
import { prisma } from "@/lib/prisma";

type TransactionMock = (callback: (tx: unknown) => unknown) => Promise<unknown>;

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: "user-1",
      name: "Nhân viên",
      role: "STAFF",
      permissions: {
        canViewOrders: true,
        canViewReturns: true,
        canConfirmReturn: true,
        ...overrides,
      },
    },
  };
}

function makeAdminSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: "admin-1",
      name: "Quản trị",
      role: "ADMIN",
      permissions: {
        canViewOrders: false,
        canViewReturns: false,
        canConfirmReturn: false,
        canViewDelayed: false,
        canExportOrders: false,
        canUploadExcel: false,
        ...overrides,
      },
    },
  };
}

describe("orders API RBAC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.order.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.order.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.$transaction as unknown as TransactionMock).mockImplementation(async (callback) =>
      callback({
        order: {
          findMany: vi.fn().mockResolvedValue([{ id: "order-1" }]),
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        claimOrder: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        returnTracking: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      }),
    );
    vi.mocked(processOrderImport).mockResolvedValue({
      success: true,
      summary: {
        totalRows: 1,
        validRows: 1,
        newOrders: 1,
        updatedOrders: 0,
        skippedRows: 0,
        failedRows: 0,
        parseErrors: 0,
        processingTime: 1,
        totalChanges: 0,
      },
      errors: [],
    } as never);
  });

  it("rejects /api/orders when the user lacks canViewOrders", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession({ canViewOrders: false }) as never);

    const { GET } = await import("@/app/api/orders/route");
    const response = await GET(new NextRequest("http://localhost/api/orders?page=1&pageSize=20"));

    expect(response.status).toBe(403);
    expect(vi.mocked(prisma.order.findMany)).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.order.count)).not.toHaveBeenCalled();
  });

  it("rejects /api/orders/returns when the user lacks canViewReturns", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession({ canViewReturns: false }) as never);

    const { GET } = await import("@/app/api/orders/returns/route");
    const response = await GET(new NextRequest("http://localhost/api/orders/returns?tab=partial"));

    expect(response.status).toBe(403);
    expect(vi.mocked(prisma.order.findMany)).not.toHaveBeenCalled();
  });

  it("rejects warehouse confirmation when the user lacks canConfirmReturn", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession({ canConfirmReturn: false }) as never);

    const { PATCH } = await import("@/app/api/orders/[requestCode]/warehouse/route");
    const response = await PATCH(new NextRequest("http://localhost/api/orders/REQ-001/warehouse", {
      method: "PATCH",
    }), {
      params: Promise.resolve({ requestCode: "REQ-001" }),
    });

    expect(response.status).toBe(403);
    expect(vi.mocked(prisma.order.update)).not.toHaveBeenCalled();
  });

  it("rejects tracking proxy requests without canViewOrders", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession({ canViewOrders: false }) as never);

    const { GET } = await import("@/app/api/orders/[requestCode]/tracking/route");
    const response = await GET(new Request("http://localhost/api/orders/REQ-001/tracking"), {
      params: Promise.resolve({ requestCode: "REQ-001" }),
    });

    expect(response.status).toBe(403);
  });

  it("revalidates upstream tracking data for 5 minutes instead of forcing no-store", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ events: [] })),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/api/orders/[requestCode]/tracking/route");
    const response = await GET(new Request("http://localhost/api/orders/REQ-001/tracking"), {
      params: Promise.resolve({ requestCode: "REQ-001" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ events: [] });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.svexpress.vn/v1/order/tracking-landing-page/REQ-001",
      expect.objectContaining({
        cache: "force-cache",
        next: { revalidate: 300 },
      }),
    );
  });

  it("allows ADMIN to read delayed orders even when canViewDelayed is false in the permission group", async () => {
    vi.mocked(auth).mockResolvedValue(makeAdminSession() as never);

    const { GET } = await import("@/app/api/orders/delayed/route");
    const response = await GET(new NextRequest("http://localhost/api/orders/delayed?page=1&pageSize=20"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(vi.mocked(prisma.order.findMany)).toHaveBeenCalled();
  });

  it("allows ADMIN to export delayed orders even when canViewDelayed is false in the permission group", async () => {
    vi.mocked(auth).mockResolvedValue(makeAdminSession() as never);

    const { GET } = await import("@/app/api/orders/delayed/export/route");
    const response = await GET(new NextRequest("http://localhost/api/orders/delayed/export"));

    expect(response.status).toBe(200);
    expect(vi.mocked(prisma.order.findMany)).toHaveBeenCalled();
  });

  it("allows ADMIN to upload Excel even when canUploadExcel is false in the permission group", async () => {
    vi.mocked(auth).mockResolvedValue(makeAdminSession() as never);

    const formData = new FormData();
    formData.append("file", new File(["requestCode\nREQ-001"], "orders.xlsx"));

    const { POST } = await import("@/app/api/orders/upload/route");
    const response = await POST(new NextRequest("http://localhost/api/orders/upload", {
      method: "POST",
      body: formData,
    }));

    expect(response.status).toBe(200);
    expect(vi.mocked(processOrderImport)).toHaveBeenCalled();
  });

  it("allows ADMIN to export orders even when canExportOrders is false in the permission group", async () => {
    vi.mocked(auth).mockResolvedValue(makeAdminSession() as never);
    vi.mocked(prisma.order.findMany).mockResolvedValueOnce([
      {
        requestCode: "REQ-001",
        createdTime: new Date("2026-04-12T00:00:00.000Z"),
        deliveryStatus: "DELIVERED",
        codAmount: 100000,
        totalFee: 25000,
      },
    ] as never);

    const { GET } = await import("@/app/api/orders/export/route");
    const response = await GET(new NextRequest("http://localhost/api/orders/export"));

    expect(response.status).toBe(200);
    expect(vi.mocked(prisma.order.findMany)).toHaveBeenCalled();
  });

  it("allows ADMIN to delete orders even when canDeleteOrders is false in the permission group", async () => {
    vi.mocked(auth).mockResolvedValue(makeAdminSession({ canDeleteOrders: false }) as never);

    const { DELETE } = await import("@/app/api/orders/delete/route");
    const response = await DELETE(new NextRequest("http://localhost/api/orders/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestCodes: ["REQ-001"] }),
    }));

    expect(response.status).toBe(200);
    expect(vi.mocked(prisma.$transaction as unknown as TransactionMock)).toHaveBeenCalled();
  });

  it("allows ADMIN to edit staff notes even when canEditStaffNotes is false in the permission group", async () => {
    vi.mocked(auth).mockResolvedValue(makeAdminSession({ canEditStaffNotes: false }) as never);
    vi.mocked(prisma.order.update).mockResolvedValue({ staffNotes: "Đã gọi khách" } as never);

    const { PATCH } = await import("@/app/api/orders/notes/route");
    const response = await PATCH(new NextRequest("http://localhost/api/orders/notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestCode: "REQ-001", staffNotes: "Đã gọi khách" }),
    }));

    expect(response.status).toBe(200);
    expect(vi.mocked(prisma.order.update)).toHaveBeenCalled();
  });

  it("allows ADMIN to update confirm-asked even when canConfirmReturn is false in the permission group", async () => {
    vi.mocked(auth).mockResolvedValue(makeAdminSession() as never);

    const { PATCH } = await import("@/app/api/orders/[requestCode]/confirm-asked/route");
    const response = await PATCH(new NextRequest("http://localhost/api/orders/REQ-001/confirm-asked", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: true }),
    }), {
      params: Promise.resolve({ requestCode: "REQ-001" }),
    });

    expect(response.status).toBe(200);
    expect(vi.mocked(prisma.order.update)).toHaveBeenCalled();
  });

  it("allows ADMIN to update customer-confirmed even when canConfirmReturn is false in the permission group", async () => {
    vi.mocked(auth).mockResolvedValue(makeAdminSession() as never);

    const { PATCH } = await import("@/app/api/orders/[requestCode]/customer-confirmed/route");
    const response = await PATCH(new NextRequest("http://localhost/api/orders/REQ-001/customer-confirmed", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: true }),
    }), {
      params: Promise.resolve({ requestCode: "REQ-001" }),
    });

    expect(response.status).toBe(200);
    expect(vi.mocked(prisma.order.update)).toHaveBeenCalled();
  });

  it("returns 409 when warehouse confirmation is submitted after the order was already confirmed", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      requestCode: "REQ-001",
      warehouseArrivalDate: new Date("2026-04-03T08:00:00.000Z"),
    } as never);

    const { PATCH } = await import("@/app/api/orders/[requestCode]/warehouse/route");
    const response = await PATCH(new NextRequest("http://localhost/api/orders/REQ-001/warehouse", {
      method: "PATCH",
    }), {
      params: Promise.resolve({ requestCode: "REQ-001" }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("Đơn hàng đã được xác nhận về kho trước đó");
  });
});
