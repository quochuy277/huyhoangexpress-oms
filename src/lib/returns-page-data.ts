import type { Prisma } from "@prisma/client";

import { getLastDelayDate, getMostRecentTimestampFromNotes } from "@/lib/delay-analyzer";
import { prisma } from "@/lib/prisma";
import { buildReturnsTabWhere, type ReturnsTab } from "@/lib/returns-queries";
import type { ReturnOrder } from "@/types/returns";

type GetReturnsTabDataOptions = {
  tab: ReturnsTab;
  page?: number;
  pageSize?: number;
  search?: string;
};

export async function getReturnsTabData({
  tab,
  page = 1,
  pageSize = 50,
  search = "",
}: GetReturnsTabDataOptions): Promise<ReturnOrder[]> {
  let where: Prisma.OrderWhereInput = buildReturnsTabWhere(tab);

  if (search) {
    where = {
      ...where,
      AND: [
        {
          OR: [
            { requestCode: { contains: search, mode: "insensitive" } },
            { shopName: { contains: search, mode: "insensitive" } },
            { receiverName: { contains: search, mode: "insensitive" } },
            { receiverPhone: { contains: search } },
            { carrierOrderCode: { contains: search, mode: "insensitive" } },
          ],
        },
      ],
    };
  }

  const select = {
    id: true,
    requestCode: true,
    carrierOrderCode: true,
    shopName: true,
    status: true,
    deliveryStatus: true,
    deliveredDate: true,
    lastUpdated: true,
    publicNotes: true,
    partialOrderType: true,
    partialOrderCode: true,
    staffNotes: true,
    warehouseArrivalDate: true,
    customerConfirmAsked: true,
    confirmedAskedBy: true,
    confirmedAskedAt: true,
    customerConfirmed: true,
    customerConfirmedBy: true,
    customerConfirmedAt: true,
    codAmount: true,
    receiverName: true,
    receiverPhone: true,
    claimOrder: { select: { issueType: true } },
  } as const;

  const rawOrders = await prisma.order.findMany({
    where,
    select,
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { lastUpdated: "desc" },
  });

  return rawOrders.map((order) => {
    const lastDelayDate = getLastDelayDate(order.publicNotes);
    const effectiveDate = lastDelayDate ?? getMostRecentTimestampFromNotes(order.publicNotes);
    const daysReturning = effectiveDate
      ? Math.max(0, Math.floor((Date.now() - effectiveDate.getTime()) / 86400000))
      : 0;

    return {
      ...order,
      codAmount: order.codAmount != null ? Number(order.codAmount) : 0,
      deliveredDate: order.deliveredDate ? order.deliveredDate.toISOString() : null,
      lastUpdated: order.lastUpdated ? order.lastUpdated.toISOString() : null,
      warehouseArrivalDate: order.warehouseArrivalDate ? order.warehouseArrivalDate.toISOString() : null,
      confirmedAskedAt: order.confirmedAskedAt ? order.confirmedAskedAt.toISOString() : null,
      customerConfirmedAt: order.customerConfirmedAt ? order.customerConfirmedAt.toISOString() : null,
      lastDelayDate: lastDelayDate ? lastDelayDate.toISOString() : null,
      daysReturning,
    };
  });
}

export async function getReturnsSummaryData() {
  const [partial, full, warehouse] = await Promise.all([
    prisma.order.count({ where: buildReturnsTabWhere("partial") }),
    prisma.order.count({ where: buildReturnsTabWhere("full") }),
    prisma.order.count({ where: buildReturnsTabWhere("warehouse") }),
  ]);

  return { partial, full, warehouse };
}
