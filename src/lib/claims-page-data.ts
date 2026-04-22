import type { ClaimStatus, IssueType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

function toIsoString(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) return null;
  return typeof value === "number" ? value : Number(value);
}

// Narrow input type for normalizeClaimForClient: captures the fields the
// function touches while still accepting extra properties (which are
// spread through untouched). Prisma returns concrete types from findMany
// with select, but call sites (tests, fixtures) also pass raw objects.
type NormalizableClaim = {
  detectedDate?: Date | string | null;
  deadline?: Date | string | null;
  completedAt?: Date | string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  carrierCompensation?: Prisma.Decimal | number | null;
  customerCompensation?: Prisma.Decimal | number | null;
  order?: {
    codAmount?: Prisma.Decimal | number | null;
    totalFee?: Prisma.Decimal | number | null;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
};

export function normalizeClaimForClient(claim: NormalizableClaim) {
  return {
    ...claim,
    detectedDate: toIsoString(claim.detectedDate as Date | null | undefined),
    deadline: toIsoString(claim.deadline as Date | null | undefined),
    completedAt: toIsoString(claim.completedAt as Date | null | undefined),
    createdAt: toIsoString(claim.createdAt as Date | null | undefined),
    updatedAt: toIsoString(claim.updatedAt as Date | null | undefined),
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

/**
 * Explicit `select` used by GET /api/claims (list).
 *
 * Sprint 2 (2026-04-22 follow-up): chuyển từ `include` sang `select` tường
 * minh để drop các cột không dùng ở list view. Các field bỏ:
 * `completedAt`, `completedBy`, `source`, `createdById`, `createdAt`,
 * `updatedAt` — chúng chỉ cần trong detail drawer (`GET /api/claims/[id]`).
 *
 * Exported làm contract: test `claims-page-data.test.ts` assert shape này
 * để phát hiện sớm nếu có người thêm field lại vào list response.
 */
export const CLAIMS_LIST_SELECT = {
  id: true,
  orderId: true,
  issueType: true,
  issueDescription: true,
  detectedDate: true,
  deadline: true,
  claimStatus: true,
  processingContent: true,
  carrierCompensation: true,
  customerCompensation: true,
  isCompleted: true,
  order: {
    select: {
      requestCode: true,
      carrierOrderCode: true,
      shopName: true,
      status: true,
      codAmount: true,
      staffNotes: true,
    },
  },
} as const satisfies Prisma.ClaimOrderSelect;

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

type ClaimsFilterOptionRow = {
  order: {
    shopName: string | null;
    status: string | null;
  } | null;
};

function normalizeSearchInput(value: string) {
  return value.trim();
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export function createClaimsFilterOptions(rows: ClaimsFilterOptionRow[]) {
  const shops = new Set<string>();
  const statuses = new Set<string>();

  for (const row of rows) {
    if (row.order?.shopName) {
      shops.add(row.order.shopName);
    }

    if (row.order?.status) {
      statuses.add(row.order.status);
    }
  }

  return {
    shops: [...shops].sort((left, right) => left.localeCompare(right, "vi")),
    statuses: [...statuses].sort((left, right) => left.localeCompare(right, "vi")),
  };
}

export async function getClaimsListData(query: ClaimsBootstrapQuery) {
  const search = normalizeSearchInput(query.search);
  const normalizedPhone = normalizePhone(search);

  const where: Prisma.ClaimOrderWhereInput = {
    isCompleted: query.showCompleted,
  };

  if (query.issueType.length) {
    where.issueType = { in: query.issueType as IssueType[] };
  }

  if (query.status) {
    where.claimStatus = query.status as ClaimStatus;
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
      select: CLAIMS_LIST_SELECT,
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
  const rows = await prisma.claimOrder.findMany({
    select: {
      order: {
        select: {
          shopName: true,
          status: true,
        },
      },
    },
    distinct: ["orderId"],
    orderBy: { orderId: "asc" },
  });

  return createClaimsFilterOptions(rows);
}
