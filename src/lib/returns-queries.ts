import type { Prisma } from "@prisma/client";

export type ReturnsTab = "partial" | "full" | "warehouse";

export const RETURNS_TABS: ReturnsTab[] = ["partial", "full", "warehouse"];

export function buildReturnsTabWhere(tab: ReturnsTab): Prisma.OrderWhereInput {
  if (tab === "partial") {
    return {
      claimLocked: false,
      deliveryStatus: "DELIVERED",
      partialOrderType: "Đơn một phần",
      warehouseArrivalDate: null,
    };
  }

  if (tab === "full") {
    return {
      claimLocked: false,
      deliveryStatus: "RETURNING_FULL",
    };
  }

  return {
    claimLocked: false,
    OR: [
      {
        deliveryStatus: "DELIVERED",
        partialOrderType: "Đơn một phần",
        warehouseArrivalDate: { not: null },
      },
      {
        deliveryStatus: "RETURN_DELAYED",
      },
    ],
  };
}
