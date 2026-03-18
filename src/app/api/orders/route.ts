import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma, DeliveryStatus } from "@prisma/client";
import { ordersQuerySchema, parseSearchParams } from "@/lib/validations";

const ALLOWED_SORT_COLUMNS = [
  "createdTime", "requestCode", "shopName", "receiverName",
  "deliveryStatus", "codAmount", "revenue", "carrierName",
  "receiverProvince", "lastUpdated", "importedAt", "totalFee", "customerWeight",
];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = ordersQuerySchema.safeParse(parseSearchParams(searchParams));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Tham số không hợp lệ", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    page, pageSize, search, status: statusFilter, carrier,
    fromDate, toDate, hasNotes, shopName: shopNameFilter,
    salesStaff: salesStaffFilter, partialOrderType, regionGroup,
    sortBy, sortOrder,
  } = parsed.data;

  const skip = (page - 1) * pageSize;

  // Build WHERE clause
  const where: Prisma.OrderWhereInput = {};
  const AND: Prisma.OrderWhereInput[] = [];

  if (search) {
    AND.push({
      OR: [
        { requestCode: { contains: search, mode: "insensitive" } },
        { receiverName: { contains: search, mode: "insensitive" } },
        { receiverPhone: { contains: search } },
        { shopName: { contains: search, mode: "insensitive" } },
        { carrierOrderCode: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (statusFilter) {
    const statuses = statusFilter.split(",").filter(Boolean) as DeliveryStatus[];
    if (statuses.length > 0) AND.push({ deliveryStatus: { in: statuses } });
  }

  if (carrier) AND.push({ carrierName: carrier });

  if (fromDate) AND.push({ createdTime: { gte: new Date(fromDate) } });
  if (toDate) {
    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);
    AND.push({ createdTime: { lte: endDate } });
  }

  if (hasNotes === "true") {
    AND.push({ staffNotes: { not: null, notIn: [""] } });
  } else if (hasNotes === "false") {
    AND.push({ OR: [{ staffNotes: null }, { staffNotes: "" }] });
  }

  if (shopNameFilter) {
    const shops = shopNameFilter.split(",").filter(Boolean);
    if (shops.length > 0) AND.push({ shopName: { in: shops } });
  }

  if (salesStaffFilter) {
    const staffs = salesStaffFilter.split(",").filter(Boolean);
    if (staffs.length > 0) AND.push({ salesStaff: { in: staffs } });
  }

  if (partialOrderType) {
    AND.push({ partialOrderType });
  }

  if (regionGroup) {
    AND.push({ regionGroup });
  }

  if (AND.length > 0) {
    where.AND = AND;
  }

  const safeSortBy = ALLOWED_SORT_COLUMNS.includes(sortBy) ? sortBy : "createdTime";

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      select: {
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
      },
      orderBy: { [safeSortBy]: sortOrder },
      skip,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({
    orders,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
