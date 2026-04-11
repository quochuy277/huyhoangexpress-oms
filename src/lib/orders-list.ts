import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { buildOrderSearchFilters } from "@/lib/orders-search";

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

export const ALLOWED_DATE_FIELDS = [
  "createdTime",
  "pickupTime",
  "lastUpdated",
  "paymentConfirmDate",
  "reconciliationDate",
  "deliveredDate",
] as const;

export type OrderDateField = (typeof ALLOWED_DATE_FIELDS)[number];

export type OrdersListParams = {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  dateField?: string;
  hasNotes?: string;
  shopName?: string;
  salesStaff?: string;
  partialOrderType?: string;
  regionGroup?: string;
  valueField?: string;
  valueCondition?: string;
  valueAmount?: number;
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
  orders: Prisma.OrderGetPayload<{ select: typeof ORDER_SELECT }>[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const VALUE_CONDITION_MAP: Record<string, string> = {
  gt: "gt",
  eq: "equals",
  lt: "lt",
};

export function buildOrdersListQuery(params: OrdersListParams) {
  const { searchMeta, filters: searchFilters } = buildOrderSearchFilters({
    search: params.search,
    fromDate: params.fromDate,
    toDate: params.toDate,
    dateField: params.dateField,
  });
  const andFilters: Prisma.OrderWhereInput[] = [...searchFilters];

  if (params.status) {
    andFilters.push({
      deliveryStatus: {
        in: params.status.split(",").filter(Boolean) as never,
      },
    });
  }

  // Dynamic date field filter
  const dateColumn = ALLOWED_DATE_FIELDS.includes(params.dateField as OrderDateField)
    ? (params.dateField as OrderDateField)
    : "createdTime";

  if (params.fromDate) {
    andFilters.push({ [dateColumn]: { gte: new Date(params.fromDate) } });
  }

  if (params.toDate) {
    const endDate = new Date(params.toDate);
    endDate.setHours(23, 59, 59, 999);
    andFilters.push({ [dateColumn]: { lte: endDate } });
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

  // Value filter (e.g. COD > 1000000)
  if (params.valueField && params.valueCondition && params.valueAmount !== undefined) {
    const prismaOp = VALUE_CONDITION_MAP[params.valueCondition];
    if (prismaOp) {
      andFilters.push({ [params.valueField]: { [prismaOp]: params.valueAmount } });
    }
  }

  const where: Prisma.OrderWhereInput = andFilters.length > 0 ? { AND: andFilters } : {};

  return {
    where,
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
    skipCount: searchMeta.kind === "requestCode" && !searchMeta.isMulti,
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

  const findManyArgs = {
    where: query.where,
    select: ORDER_SELECT,
    orderBy: { [query.safeSortBy]: params.sortOrder },
    skip: query.skip,
    take: query.take,
  } satisfies Prisma.OrderFindManyArgs;

  const ordersPromise = prismaClient.order.findMany(findManyArgs);

  let orders: Prisma.OrderGetPayload<{ select: typeof ORDER_SELECT }>[];
  let total: number;

  if (query.skipCount) {
    orders = await ordersPromise;
    total = orders.length;
  } else {
    [orders, total] = await Promise.all([
      ordersPromise,
      prismaClient.order.count({ where: query.where }),
    ]);
  }

  return {
    orders,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.ceil(total / params.pageSize),
  };
}
