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
  /** Exact match on shopName */
  shopFilter?: string;
  /** Days range: "lte3", "4to7", "gte8" */
  daysRange?: string;
  /** Staff notes: "has" | "empty" */
  hasNotes?: string;
  /** Customer confirm asked: "yes" | "no" (warehouse tab) */
  confirmAsked?: string;
};

export async function getReturnsTabData({
  tab,
  page = 1,
  pageSize = 50,
  search = "",
  shopFilter = "",
  daysRange = "",
  hasNotes = "",
  confirmAsked = "",
}: GetReturnsTabDataOptions): Promise<ReturnOrder[]> {
  let where: Prisma.OrderWhereInput = buildReturnsTabWhere(tab);
  const andConditions: Prisma.OrderWhereInput[] = [];

  if (search) {
    andConditions.push({
      OR: [
        { requestCode: { contains: search, mode: "insensitive" } },
        { shopName: { contains: search, mode: "insensitive" } },
        { receiverName: { contains: search, mode: "insensitive" } },
        { receiverPhone: { contains: search } },
        { carrierOrderCode: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (shopFilter) {
    andConditions.push({ shopName: shopFilter });
  }

  if (hasNotes === "has") {
    andConditions.push({ staffNotes: { not: "" } });
  } else if (hasNotes === "empty") {
    andConditions.push({
      OR: [{ staffNotes: null }, { staffNotes: "" }],
    });
  }

  if (confirmAsked === "asked") {
    andConditions.push({ customerConfirmAsked: true });
  } else if (confirmAsked === "notasked") {
    andConditions.push({ customerConfirmAsked: false });
  }

  // daysRange filter: computed from lastDelayDate/publicNotes, applied post-query
  // (cannot be pushed to DB since it depends on note parsing)

  if (andConditions.length > 0) {
    where = { ...where, AND: andConditions };
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
    orderBy: { lastUpdated: "desc" },
  });

  const mappedOrders = rawOrders.map((order) => {
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

  const daysFiltered = mappedOrders.filter((order) => {
    if (!daysRange) return true;
    if (daysRange === "lte3") return order.daysReturning <= 3;
    if (daysRange === "4to7") return order.daysReturning >= 4 && order.daysReturning <= 7;
    if (daysRange === "gte8") return order.daysReturning >= 8;
    return true;
  });

  const start = (Math.max(page, 1) - 1) * Math.max(pageSize, 1);
  const end = start + Math.max(pageSize, 1);
  return daysFiltered.slice(start, end);
}

export async function getReturnsSummaryData() {
  const [partial, full, warehouse] = await Promise.all([
    prisma.order.count({ where: buildReturnsTabWhere("partial") }),
    prisma.order.count({ where: buildReturnsTabWhere("full") }),
    prisma.order.count({ where: buildReturnsTabWhere("warehouse") }),
  ]);

  return { partial, full, warehouse };
}
