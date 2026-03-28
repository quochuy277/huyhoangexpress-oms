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
    },
    order: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
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
});
