import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/cached-session", () => ({
  getCachedSession: vi.fn(),
}));

vi.mock("@/lib/orders-list", () => ({
  getOrdersList: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

import { getCachedSession } from "@/lib/cached-session";
import { getOrdersList } from "@/lib/orders-list";
import OrdersPage from "@/app/(dashboard)/orders/page";

describe("OrdersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects when the user lacks canViewOrders", async () => {
    vi.mocked(getCachedSession).mockResolvedValue({
      user: {
        role: "STAFF",
        permissions: {
          canViewOrders: false,
          canEditStaffNotes: false,
        },
      },
    } as never);

    await expect(
      OrdersPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("redirect:/");
    expect(vi.mocked(getOrdersList)).not.toHaveBeenCalled();
  }, 15000);

  it("prefetches orders for allowed users on orders tab and passes note-edit permission", async () => {
    vi.mocked(getCachedSession).mockResolvedValue({
      user: {
        role: "STAFF",
        permissions: {
          canViewOrders: true,
          canEditStaffNotes: false,
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

    const element = await OrdersPage({ searchParams: Promise.resolve({}) });

    expect(vi.mocked(getOrdersList)).toHaveBeenCalledTimes(1);
    expect((element as any).props).toMatchObject({
      userRole: "STAFF",
      canEditStaffNotes: false,
    });
  }, 15000);

  it("lets admin edit staff notes even when the explicit permission flag is false", async () => {
    vi.mocked(getCachedSession).mockResolvedValue({
      user: {
        role: "ADMIN",
        permissions: {
          canViewOrders: true,
          canEditStaffNotes: false,
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

    const element = await OrdersPage({ searchParams: Promise.resolve({}) });

    expect((element as any).props).toMatchObject({
      userRole: "ADMIN",
      canEditStaffNotes: true,
    });
  }, 15000);
});
