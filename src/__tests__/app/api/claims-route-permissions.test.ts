import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    claimOrder: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    order: {
      update: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
import { clearClaimsFilterOptionsCache } from "@/lib/claims-filter-options-cache";
import { prisma } from "@/lib/prisma";

function makeSession(overrides: Record<string, boolean>) {
  return {
    user: {
      id: "user-1",
      name: "Tester",
      role: "STAFF",
      permissions: {
        canViewClaims: true,
        canCreateClaim: true,
        canUpdateClaim: true,
        canDeleteClaim: true,
        canViewCompensation: false,
        ...overrides,
      },
    },
  };
}

describe("claims api permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearClaimsFilterOptionsCache();
  });

  it("rejects POST /api/claims when canCreateClaim is false", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession({ canCreateClaim: false }) as never);
    const { POST } = await import("@/app/api/claims/route");

    const response = await POST(
      new NextRequest("http://localhost/api/claims", {
        method: "POST",
        body: JSON.stringify({ orderId: "order-1", issueType: "LOST" }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(403);
    expect(prisma.claimOrder.create).not.toHaveBeenCalled();
  });

  it("rejects PATCH /api/claims/[id] when canUpdateClaim is false", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession({ canUpdateClaim: false }) as never);
    const { PATCH } = await import("@/app/api/claims/[id]/route");

    const response = await PATCH(
      new NextRequest("http://localhost/api/claims/claim-1", {
        method: "PATCH",
        body: JSON.stringify({ claimStatus: "RESOLVED" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "claim-1" }) },
    );

    expect(response.status).toBe(403);
    expect(prisma.claimOrder.update).not.toHaveBeenCalled();
  });

  it("rejects DELETE /api/claims/[id] when canDeleteClaim is false", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession({ canDeleteClaim: false }) as never);
    const { DELETE } = await import("@/app/api/claims/[id]/route");

    const response = await DELETE(
      new NextRequest("http://localhost/api/claims/claim-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "claim-1" }) },
    );

    expect(response.status).toBe(403);
    expect(prisma.claimOrder.delete).not.toHaveBeenCalled();
  });

  it("returns distinct filter options from claim rows only", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession({}) as never);
    vi.mocked(prisma.claimOrder.findMany).mockResolvedValueOnce([
      { order: { shopName: "Shop A", status: "DELIVERED" } },
      { order: { shopName: "Shop B", status: "RETURNING" } },
    ] as never);

    const { GET } = await import("@/app/api/claims/filter-options/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.shops).toEqual(expect.arrayContaining(["Shop A", "Shop B"]));
    expect(body.statuses).toEqual(expect.arrayContaining(["DELIVERED", "RETURNING"]));
    expect(prisma.claimOrder.findMany).toHaveBeenCalledTimes(1);
  });

  it("streams CSV export with correct headers, respects EXPORT_LIMIT, and flags truncation", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession({}) as never);
    // Simulate a dataset larger than the cap so the truncated header is set.
    vi.mocked(prisma.claimOrder.count).mockResolvedValue(5000 as never);
    // Return one row then an empty batch — streaming loop will stop after the
    // second findMany returns length 0.
    vi.mocked(prisma.claimOrder.findMany)
      .mockResolvedValueOnce([
        {
          id: "claim-1",
          issueType: "LOST",
          claimStatus: "PENDING",
          issueDescription: null,
          detectedDate: new Date("2026-03-28T00:00:00.000Z"),
          deadline: null,
          processingContent: null,
          carrierCompensation: 0,
          customerCompensation: 0,
          isCompleted: false,
          source: "MANUAL",
          createdAt: new Date("2026-03-28T00:00:00.000Z"),
          createdBy: { name: "Tester" },
          order: {
            requestCode: "REQ-001",
            carrierOrderCode: "C-001",
            carrierName: "GHN",
            shopName: "Shop A",
            status: "DELIVERED",
            deliveryStatus: "DELIVERED",
            codAmount: 100000,
            totalFee: 25000,
            staffNotes: "",
            receiverPhone: "0900000000",
            receiverName: "A",
            receiverAddress: "HN",
            pickupTime: null,
            regionGroup: "HN",
          },
        },
      ] as never)
      .mockResolvedValue([] as never);

    const { GET } = await import("@/app/api/claims/export/route");
    const response = await GET(new NextRequest("http://localhost/api/claims/export"));

    expect(response.status).toBe(200);
    // Export is now streamed; findMany is called in 500-row batches rather
    // than one shot at the cap, so we assert the batch size, not the cap.
    expect(prisma.claimOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 500,
      }),
    );
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Server-Timing")).toContain("total;dur=");
    expect(response.headers.get("X-Claims-Export-Limit")).toBe("3000");
    // count() returned 5000 > 3000, so truncation flag is set.
    expect(response.headers.get("X-Claims-Export-Truncated")).toBe("true");

    // Drain the stream to make sure it actually produces a CSV body with
    // header + at least one data row. Read as raw bytes so we can verify the
    // UTF-8 BOM is present — `response.text()` silently strips leading BOMs
    // via the TextDecoder defaults, so a byte check is the only reliable way
    // to assert it was emitted.
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);
    const body = new TextDecoder("utf-8").decode(bytes);
    expect(body).toContain("Mã Yêu Cầu");
    expect(body).toContain("REQ-001");
  });
});
