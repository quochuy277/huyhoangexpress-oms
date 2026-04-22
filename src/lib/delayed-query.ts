import type { Prisma } from "@prisma/client";

// Re-exported so existing call sites (delayed export route, tests) keep their
// `import { escapeCsvCell } from "@/lib/delayed-query"` working. New callers
// should import directly from `@/lib/csv-stream`.
export { escapeCsvCell } from "@/lib/csv-stream";

export const DELAYED_SCAN_LIMIT = 2000;
export const DELAYED_EXPORT_BATCH_SIZE = 500;
export const DELAYED_SCAN_WARNING =
  "Dữ liệu quá lớn, vui lòng dùng bộ lọc để xem kết quả chính xác hơn";

export type DelayedDbFilters = {
  search: string;
  shopFilter: string;
  carrierFilter: string;
  statusFilter: string;
};

export const DELAYED_ORDER_SELECT = {
  id: true,
  requestCode: true,
  customerOrderCode: true,
  carrierOrderCode: true,
  shopName: true,
  receiverName: true,
  receiverPhone: true,
  receiverAddress: true,
  receiverWard: true,
  receiverDistrict: true,
  receiverProvince: true,
  status: true,
  deliveryStatus: true,
  codAmount: true,
  createdTime: true,
  pickupTime: true,
  lastUpdated: true,
  publicNotes: true,
  carrierName: true,
  staffNotes: true,
  claimOrder: { select: { issueType: true } },
} as const;

function encodeLegacyUtf8Mojibake(value: string) {
  return Array.from(new TextEncoder().encode(value), (byte) => String.fromCharCode(byte)).join("");
}

export function buildDelayedOrdersWhere({
  search,
  shopFilter,
  carrierFilter,
  statusFilter,
}: DelayedDbFilters): Prisma.OrderWhereInput {
  const andConditions: Prisma.OrderWhereInput[] = [];

  if (search) {
    andConditions.push({
      OR: [
        { requestCode: { contains: search, mode: "insensitive" } },
        { shopName: { contains: search, mode: "insensitive" } },
        { receiverName: { contains: search, mode: "insensitive" } },
        { receiverPhone: { contains: search } },
        { carrierOrderCode: { contains: search, mode: "insensitive" } },
        { customerOrderCode: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (shopFilter) {
    andConditions.push({ shopName: shopFilter });
  }

  if (carrierFilter) {
    andConditions.push({ carrierName: carrierFilter });
  }

  if (statusFilter) {
    andConditions.push({ status: statusFilter });
  }

  return {
    claimLocked: false,
    OR: [
      { deliveryStatus: { in: ["DELIVERY_DELAYED", "RETURN_CONFIRMED"] } },
      {
        AND: [
          { deliveryStatus: "DELIVERING" },
          {
            OR: [
              { publicNotes: { contains: "Hoan giao hang", mode: "insensitive" } },
              { publicNotes: { contains: "Hoãn giao hàng" } },
              { publicNotes: { contains: encodeLegacyUtf8Mojibake("Hoãn giao hàng") } },
              { publicNotes: { contains: "Delay giao hang", mode: "insensitive" } },
              { publicNotes: { contains: "Delay giao hàng", mode: "insensitive" } },
              { publicNotes: { contains: encodeLegacyUtf8Mojibake("Delay giao hàng") } },
            ],
          },
        ],
      },
    ],
    ...(andConditions.length > 0 ? { AND: andConditions } : {}),
  };
}

export function getDelayedExportOrderBy(
  sortKey: string,
  sortDir: "asc" | "desc",
): Prisma.OrderOrderByWithRelationInput {
  switch (sortKey) {
    case "requestCode":
      return { requestCode: sortDir };
    case "shopName":
      return { shopName: sortDir };
    case "status":
      return { status: sortDir };
    case "createdTime":
      return { createdTime: sortDir };
    case "codAmount":
      return { codAmount: sortDir };
    default:
      return { lastUpdated: "desc" };
  }
}

