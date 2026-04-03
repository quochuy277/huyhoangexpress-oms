import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/orders-list", () => ({
  getOrdersList: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

import { auth } from "@/lib/auth";
import { getOrdersList } from "@/lib/orders-list";

describe("OrdersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects when the user lacks canViewOrders", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        role: "STAFF",
        permissions: {
          canViewOrders: false,
        },
      },
    } as never);

    const { default: OrdersPage } = await import("@/app/(dashboard)/orders/page");

    await expect(
      OrdersPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("redirect:/");
    expect(vi.mocked(getOrdersList)).not.toHaveBeenCalled();
  });

  it("prefetches orders for allowed users on orders tab", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        role: "STAFF",
        permissions: {
          canViewOrders: true,
        },
      },
    } as never);
    vi.mocked(getOrdersList).mockResolvedValue({
      orders: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    } as never);

    const { default: OrdersPage } = await import("@/app/(dashboard)/orders/page");

    await OrdersPage({ searchParams: Promise.resolve({}) });

    expect(vi.mocked(getOrdersList)).toHaveBeenCalledTimes(1);
  });
});
