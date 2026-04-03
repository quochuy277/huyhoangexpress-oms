import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getLastDelayDate, getMostRecentTimestampFromNotes } from "@/lib/delay-analyzer";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/route-permissions";
import { buildReturnsTabWhere, type ReturnsTab } from "@/lib/returns-queries";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const denied = requirePermission(
      session.user,
      "canViewReturns",
      "Bạn không có quyền xem đơn hoàn",
    );
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const rawTab = searchParams.get("tab");
    const tab: ReturnsTab =
      rawTab === "full" || rawTab === "warehouse" ? rawTab : "partial";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);
    const search = searchParams.get("search") || "";

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

    const [rawOrders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        select,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { lastUpdated: "desc" },
      }),
      prisma.order.count({ where }),
    ]);

    const orders = rawOrders.map((order) => {
      const lastDelayDate = getLastDelayDate(order.publicNotes);
      const effectiveDate = lastDelayDate ?? getMostRecentTimestampFromNotes(order.publicNotes);
      const daysReturning = effectiveDate
        ? Math.max(0, Math.floor((Date.now() - effectiveDate.getTime()) / 86400000))
        : 0;

      return {
        ...order,
        lastDelayDate: lastDelayDate ? lastDelayDate.toISOString() : null,
        daysReturning,
      };
    });

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("GET /api/orders/returns error:", error);
    return NextResponse.json(
      { error: "Không thể lấy dữ liệu đơn hoàn" },
      { status: 500 },
    );
  }
}
