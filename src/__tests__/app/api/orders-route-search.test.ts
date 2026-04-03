import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("GET /api/orders search routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: "user-1",
        role: "STAFF",
        permissions: { canViewOrders: true },
      },
    } as never);
    vi.mocked(prisma.order.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.order.count).mockResolvedValue(0 as never);
  });

  it("uses exact request code search and skips count", async () => {
    const { GET } = await import("@/app/api/orders/route");
    await GET(new NextRequest("http://localhost/api/orders?search=B65ACHM0007569"));

    expect(vi.mocked(prisma.order.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([{ requestCode: "B65ACHM0007569" }]),
        }),
      }),
    );
    expect(vi.mocked(prisma.order.count)).not.toHaveBeenCalled();
  });

  it("uses exact carrier code search", async () => {
    const { GET } = await import("@/app/api/orders/route");
    await GET(new NextRequest("http://localhost/api/orders?search=GYKBGEVY"));

    expect(vi.mocked(prisma.order.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([{ carrierOrderCode: "GYKBGEVY" }]),
        }),
      }),
    );
  });

  it("uses exact phone search", async () => {
    const { GET } = await import("@/app/api/orders/route");
    await GET(new NextRequest("http://localhost/api/orders?search=0904873551"));

    expect(vi.mocked(prisma.order.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([{ receiverPhone: "0904873551" }]),
        }),
      }),
    );
  });

  it("uses last4 phone search", async () => {
    const { GET } = await import("@/app/api/orders/route");
    await GET(new NextRequest("http://localhost/api/orders?search=3551"));

    expect(vi.mocked(prisma.order.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([{ receiverPhone: { endsWith: "3551" } }]),
        }),
      }),
    );
  });

  it("applies default recent window to empty browse", async () => {
    const { GET } = await import("@/app/api/orders/route");
    await GET(new NextRequest("http://localhost/api/orders"));

    expect(vi.mocked(prisma.order.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              createdTime: expect.objectContaining({ gte: expect.any(Date) }),
            }),
          ]),
        }),
      }),
    );
  });
});
