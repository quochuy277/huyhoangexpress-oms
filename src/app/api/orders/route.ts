import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma, DeliveryStatus } from "@prisma/client";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(req: NextRequest) {
  // Auth check
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  // Pagination
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10))
  );
  const skip = (page - 1) * pageSize;

  // Basic Filters
  const search = searchParams.get("search")?.trim();
  const statusFilter = searchParams.get("status");
  const carrier = searchParams.get("carrier");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");

  // Advanced Filters
  const hasNotes = searchParams.get("hasNotes"); // 'true' | 'false' | ''
  const shopNameFilter = searchParams.get("shopName"); // comma-separated
  const salesStaffFilter = searchParams.get("salesStaff"); // comma-separated
  const partialOrderType = searchParams.get("partialOrderType"); // 'Đơn toàn bộ', 'Đơn một phần'
  const regionGroup = searchParams.get("regionGroup");

  // Sort
  const sortBy = searchParams.get("sortBy") || "createdTime";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  // Build WHERE clause
  const where: Prisma.OrderWhereInput = {};
  const AND: Prisma.OrderWhereInput[] = [];

  // Search: requestCode, receiverName, receiverPhone, shopName, carrierOrderCode
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

  // Handle Advanced Filters
  if (hasNotes === 'true') {    AND.push({ staffNotes: { not: null, notIn: [''] } });
  } else if (hasNotes === 'false') {    AND.push({ OR: [{ staffNotes: null }, { staffNotes: '' }] });
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
    if (partialOrderType === 'Đơn toàn bộ' || partialOrderType === 'Đơn một phần') {
      AND.push({ partialOrderType });
    }
  }

  if (regionGroup) {
    AND.push({ regionGroup });
  }

  if (AND.length > 0) {
    where.AND = AND;
  }

  const allowedSortColumns = [
    "createdTime", "requestCode", "shopName", "receiverName",
    "deliveryStatus", "codAmount", "revenue", "carrierName",
    "receiverProvince", "lastUpdated", "importedAt", "totalFee", "customerWeight"
  ];
  const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : "createdTime";

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
        partialOrderType: true,        staffNotes: true,
        // needed for other things possibly
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
