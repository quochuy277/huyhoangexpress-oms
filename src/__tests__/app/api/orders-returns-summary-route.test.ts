import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      count: vi.fn(),
    },
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
        canViewReturns: true,
      },
    },
  };
}

describe("returns summary route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns lightweight counts for all return tabs", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    vi.mocked(prisma.order.count)
      .mockResolvedValueOnce(12 as never)
      .mockResolvedValueOnce(7 as never)
      .mockResolvedValueOnce(5 as never);

    const { GET } = await import("@/app/api/orders/returns/summary/route");
    const response = await GET(new NextRequest("http://localhost/api/orders/returns/summary"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      partial: 12,
      full: 7,
      warehouse: 5,
    });
    expect(prisma.order.count).toHaveBeenCalledTimes(3);
  });
});
