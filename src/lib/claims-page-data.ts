import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

function toIsoString(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) return null;
  return typeof value === "number" ? value : Number(value);
}

export function normalizeClaimForClient(claim: any) {
  return {
    ...claim,
    detectedDate: toIsoString(claim.detectedDate),
    deadline: toIsoString(claim.deadline),
    completedAt: toIsoString(claim.completedAt),
    createdAt: toIsoString(claim.createdAt),
    updatedAt: toIsoString(claim.updatedAt),
    carrierCompensation: toNumber(claim.carrierCompensation),
    customerCompensation: toNumber(claim.customerCompensation),
    order: claim.order
      ? {
          ...claim.order,
          codAmount: toNumber(claim.order.codAmount),
          totalFee: toNumber(claim.order.totalFee),
        }
      : null,
  };
}

type ClaimsBootstrapQuery = {
  page: number;
  pageSize: number;
  search: string;
  issueType: string[];
  status: string;
  shopName: string;
  orderStatus: string;
  showCompleted: boolean;
  sortBy: string;
  sortDir: "asc" | "desc";
};

function normalizeSearchInput(value: string) {
  return value.trim();
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export async function getClaimsListData(query: ClaimsBootstrapQuery) {
  const search = normalizeSearchInput(query.search);
  const normalizedPhone = normalizePhone(search);

  const where: Prisma.ClaimOrderWhereInput = {
    isCompleted: query.showCompleted,
  };

  if (query.issueType.length) {
    where.issueType = { in: query.issueType as any[] };
  }

  if (query.status) {
    where.claimStatus = query.status as any;
  }

  const orderWhere: Prisma.OrderWhereInput = {};
  if (search) {
    orderWhere.OR = [
      { requestCode: { startsWith: search, mode: "insensitive" } },
      { requestCode: { equals: search, mode: "insensitive" } },
      { carrierOrderCode: { startsWith: search, mode: "insensitive" } },
      { carrierOrderCode: { equals: search, mode: "insensitive" } },
      ...(normalizedPhone
        ? [{ receiverPhone: { contains: normalizedPhone, mode: "insensitive" as const } }]
        : []),
      ...(normalizedPhone !== search && search
        ? [{ receiverPhone: { contains: search, mode: "insensitive" as const } }]
        : []),
      { shopName: { contains: search, mode: "insensitive" } },
    ];
  }
  if (query.shopName) {
    orderWhere.shopName = query.shopName;
  }
  if (query.orderStatus) {
    orderWhere.status = query.orderStatus;
  }
  if (Object.keys(orderWhere).length > 0) {
    where.order = orderWhere;
  }

  let orderBy: Prisma.ClaimOrderOrderByWithRelationInput = { deadline: "asc" };
  if (query.sortBy === "deadline") orderBy = { deadline: query.sortDir };
  if (query.sortBy === "detectedDate") orderBy = { detectedDate: query.sortDir };
  if (query.sortBy === "claimStatus") orderBy = { claimStatus: query.sortDir };
  if (query.sortBy === "issueType") orderBy = { issueType: query.sortDir };
  if (query.sortBy === "shopName") orderBy = { order: { shopName: query.sortDir } };
  if (query.sortBy === "status") orderBy = { order: { status: query.sortDir } };
  if (query.sortBy === "codAmount") orderBy = { order: { codAmount: query.sortDir } };

  const [claims, total] = await Promise.all([
    prisma.claimOrder.findMany({
      where,
      include: {
        order: {
          select: {
            requestCode: true,
            carrierOrderCode: true,
            carrierName: true,
            shopName: true,
            status: true,
            deliveryStatus: true,
            codAmount: true,
            totalFee: true,
            staffNotes: true,
            receiverPhone: true,
            receiverName: true,
            receiverAddress: true,
          },
        },
        createdBy: { select: { name: true } },
      },
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.claimOrder.count({ where }),
  ]);

  return {
    claims: claims.map((claim) => normalizeClaimForClient(claim)),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

export async function getClaimsFilterOptionsData() {
  const [shops, statuses] = await Promise.all([
    prisma.claimOrder.findMany({
      select: {
        order: {
          select: {
            shopName: true,
          },
        },
      },
      distinct: ["orderId"],
      orderBy: { orderId: "asc" },
    }),
    prisma.claimOrder.findMany({
      select: {
        order: {
          select: {
            status: true,
          },
        },
      },
      distinct: ["orderId"],
      orderBy: { orderId: "asc" },
    }),
  ]);

  return {
    shops: [...new Set(shops.map((item) => item.order?.shopName).filter((value): value is string => Boolean(value)))],
    statuses: [...new Set(statuses.map((item) => item.order?.status).filter((value): value is string => Boolean(value)))],
  };
}

export async function getClaimsBootstrapData(query: ClaimsBootstrapQuery) {
  const [list, filterOptions] = await Promise.all([
    getClaimsListData(query),
    getClaimsFilterOptionsData(),
  ]);

  return {
    list,
    filterOptions,
  };
}
