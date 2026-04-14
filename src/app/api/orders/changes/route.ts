import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import type { OrderChangeType, Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/route-permissions";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const denied = requirePermission(session.user, "canViewOrders", "Bạn không có quyền xem biến động đơn hàng");
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "50"))
    );
    const uploadHistoryId = searchParams.get("uploadHistoryId");
    const changeTypes = searchParams.getAll("changeType") as OrderChangeType[];
    const requestCode = searchParams.get("requestCode");
    const shopName = searchParams.get("shopName");
    const carrierName = searchParams.get("carrierName");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const dateField = searchParams.get("dateField") || "detectedAt";
    const sortBy = searchParams.get("sortBy") || "detectedAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build where clause
    const where: Prisma.OrderChangeLogWhereInput = {};

    if (uploadHistoryId) {
      where.uploadHistoryId = uploadHistoryId;
    }

    if (changeTypes.length > 0) {
      where.changeType = { in: changeTypes };
    }

    if (requestCode) {
      where.requestCode = { contains: requestCode, mode: "insensitive" };
    }

    // Filter by order's shopName or carrierName
    if (shopName || carrierName) {
      where.order = {};
      if (shopName) {
        where.order.shopName = { contains: shopName, mode: "insensitive" };
      }
      if (carrierName) {
        where.order.carrierName = carrierName;
      }
    }

    // Date range filter
    if (dateFrom || dateTo) {
      const fieldName =
        dateField === "changeTimestamp" ? "changeTimestamp" : "detectedAt";
      where[fieldName] = {};
      if (dateFrom) {
        (where[fieldName] as Prisma.DateTimeNullableFilter).gte = new Date(
          dateFrom
        );
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        (where[fieldName] as Prisma.DateTimeNullableFilter).lte = endDate;
      }
    }

    // Build orderBy
    const validSortFields = [
      "detectedAt",
      "changeTimestamp",
      "changeType",
      "requestCode",
    ];
    const orderByField = validSortFields.includes(sortBy)
      ? sortBy
      : "detectedAt";
    const orderByDirection = sortOrder === "asc" ? "asc" : "desc";

    const offset = (page - 1) * pageSize;

    // Build orderBy - when sorting by changeTimestamp, add secondary sort
    // to handle null values consistently
    const orderByClause =
      orderByField === "changeTimestamp"
        ? [
            { changeTimestamp: { sort: orderByDirection as "asc" | "desc", nulls: "last" as const } },
            { detectedAt: orderByDirection as "asc" | "desc" },
          ]
        : { [orderByField]: orderByDirection };

    const [total, changeLogs] = await Promise.all([
      prisma.orderChangeLog.count({ where }),
      prisma.orderChangeLog.findMany({
        where,
        skip: offset,
        take: pageSize,
        orderBy: orderByClause,
        include: {
          order: {
            select: {
              shopName: true,
              carrierName: true,
              receiverName: true,
              receiverPhone: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      data: changeLogs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    logger.error("GET /api/orders/changes", "Error", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi tải danh sách biến động" },
      { status: 500 }
    );
  }
}
