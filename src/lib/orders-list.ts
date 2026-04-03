import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  classifyOrderSearch,
  getDefaultRecentFromDate,
  shouldApplyDefaultRecentWindow,
} from "@/lib/orders-search";

export const ALLOWED_ORDER_SORT_COLUMNS = [
  "createdTime",
  "requestCode",
  "shopName",
  "receiverName",
  "deliveryStatus",
  "codAmount",
  "revenue",
  "carrierName",
  "receiverProvince",
  "lastUpdated",
  "importedAt",
  "totalFee",
  "customerWeight",
] as const;

export type OrderSortColumn = (typeof ALLOWED_ORDER_SORT_COLUMNS)[number];

export type OrdersListParams = {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  carrier?: string;
  fromDate?: string;
  toDate?: string;
  hasNotes?: string;
  shopName?: string;
  salesStaff?: string;
  partialOrderType?: string;
  regionGroup?: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
};

export const ORDER_SELECT = {
  id: true,
  requestCode: true,
  carrierOrderCode: true,
  shopName: true,
  deliveryStatus: true,
  status: true,
  createdTime: true,
  codAmount: true,
  totalFee: true,
  customerWeight: true,
  partialOrderType: true,
  staffNotes: true,
  receiverName: true,
  receiverPhone: true,
  revenue: true,
  carrierName: true,
  receiverProvince: true,
  claimOrder: { select: { issueType: true } },
} satisfies Prisma.OrderSelect;

export type OrdersListResponse = {
  orders: Prisma.OrderGetPayload<{ select: typeof ORDER_SELECT }>[],
  total: number,
  page: number,
  pageSize: number,
  totalPages: number,
};

export function buildOrdersListQuery(params: OrdersListParams) {
  const andFilters: Prisma.OrderWhereInput[] = [];
  const searchMeta = classifyOrderSearch(params.search);

  if (searchMeta.kind === "requestCode") {
    andFilters.push({ requestCode: searchMeta.normalized });
  } else if (searchMeta.kind === "carrierCode") {
    andFilters.push({ carrierOrderCode: searchMeta.normalized });
  } else if (searchMeta.kind === "phoneFull") {
    andFilters.push({ receiverPhone: searchMeta.normalized });
  } else if (searchMeta.kind === "phoneLast4") {
    andFilters.push({ receiverPhone: { endsWith: searchMeta.normalized } });
  } else if (searchMeta.kind === "text") {
    andFilters.push({
      OR: [
        { receiverName: { contains: searchMeta.normalized, mode: "insensitive" } },
        { shopName: { contains: searchMeta.normalized, mode: "insensitive" } },
        { carrierOrderCode: { contains: searchMeta.normalized, mode: "insensitive" } },
      ],
    });
  }

  if (
    shouldApplyDefaultRecentWindow({
      searchKind: searchMeta.kind,
      fromDate: params.fromDate,
      toDate: params.toDate,
    })
  ) {
    andFilters.push({ createdTime: { gte: getDefaultRecentFromDate() } });
  }

  if (params.status) {
    andFilters.push({
      deliveryStatus: {
        in: params.status.split(",").filter(Boolean) as never,
      },
    });
  }

  if (params.carrier) {
    andFilters.push({ carrierName: params.carrier });
  }

  if (params.fromDate) {
    andFilters.push({ createdTime: { gte: new Date(params.fromDate) } });
  }

  if (params.toDate) {
    const endDate = new Date(params.toDate);
    endDate.setHours(23, 59, 59, 999);
    andFilters.push({ createdTime: { lte: endDate } });
  }

  if (params.hasNotes === "true") {
    andFilters.push({ staffNotes: { not: null, notIn: [""] } });
  } else if (params.hasNotes === "false") {
    andFilters.push({ OR: [{ staffNotes: null }, { staffNotes: "" }] });
  }

  if (params.shopName) {
    const shops = params.shopName.split(",").filter(Boolean);
    if (shops.length > 0) {
      andFilters.push({ shopName: { in: shops } });
    }
  }

  if (params.salesStaff) {
    const staffs = params.salesStaff.split(",").filter(Boolean);
    if (staffs.length > 0) {
      andFilters.push({ salesStaff: { in: staffs } });
    }
  }

  if (params.partialOrderType) {
    andFilters.push({ partialOrderType: params.partialOrderType });
  }

  if (params.regionGroup) {
    andFilters.push({ regionGroup: params.regionGroup });
  }

  const where: Prisma.OrderWhereInput = andFilters.length > 0 ? { AND: andFilters } : {};

  return {
    where,
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
    skipCount: searchMeta.kind === "requestCode",
    safeSortBy: ALLOWED_ORDER_SORT_COLUMNS.includes(params.sortBy as OrderSortColumn)
      ? (params.sortBy as OrderSortColumn)
      : "createdTime",
  };
}

export async function getOrdersList(
  params: OrdersListParams,
  prismaClient: Pick<typeof prisma, "order"> = prisma,
): Promise<OrdersListResponse> {
  const query = buildOrdersListQuery(params);

  const orders = await prismaClient.order.findMany({
    where: query.where,
    select: ORDER_SELECT,
    orderBy: { [query.safeSortBy]: params.sortOrder },
    skip: query.skip,
    take: query.take,
  });

  const total = query.skipCount
    ? orders.length
    : await prismaClient.order.count({ where: query.where });

  return {
    orders,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.ceil(total / params.pageSize),
  };
}
