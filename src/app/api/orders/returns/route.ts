import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLastDelayDate, getMostRecentTimestampFromNotes } from "@/lib/delay-analyzer";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") || "partial";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);
    const search = searchParams.get("search") || "";

    let where: Prisma.OrderWhereInput = {};

    if (tab === "partial") {
      where = {
        claimLocked: false,
        deliveryStatus: "DELIVERED",
        partialOrderType: "Đơn một phần",
        warehouseArrivalDate: null,
      };
    } else if (tab === "full") {
      where = {
        claimLocked: false,
        deliveryStatus: "RETURNING_FULL",
      };
    } else if (tab === "warehouse") {
      where = {
        claimLocked: false,
        OR: [
          {
            deliveryStatus: "DELIVERED",
            partialOrderType: "Đơn một phần",
            warehouseArrivalDate: { not: null },
          },
          {
            deliveryStatus: "RETURN_DELAYED",
          },
        ],
      };
    }

    // Add search filter
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

    // Compute lastDelayDate and daysReturning for each order
    const orders = rawOrders.map((o: any) => {
      const lastDelayDate = getLastDelayDate(o.publicNotes);
      const effectiveDate = lastDelayDate ?? getMostRecentTimestampFromNotes(o.publicNotes);
      const daysReturning = effectiveDate
        ? Math.max(0, Math.floor((Date.now() - effectiveDate.getTime()) / 86400000))
        : 0;
      return {
        ...o,
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
      { status: 500 }
    );
  }
}

