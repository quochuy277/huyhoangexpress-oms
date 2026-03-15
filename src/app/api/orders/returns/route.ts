import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLastDelayDate } from "@/lib/delay-analyzer";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") || "partial";

    let where: any = {};

    if (tab === "partial") {
      // Tab 1: Partial returns — delivered + partial order + not yet at warehouse
      where = {
        deliveryStatus: "DELIVERED",
        partialOrderType: "Đơn một phần",
        warehouseArrivalDate: null,
      };
    } else if (tab === "full") {
      // Tab 2: Full returns — currently returning
      where = {
        deliveryStatus: "RETURNING_FULL",
      };
    } else if (tab === "warehouse") {
      // Tab 3: At warehouse waiting to return to customer
      where = {
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
    }    const rawOrders = await prisma.order.findMany({
      where,
      select: {
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
      },
    });

    // Compute lastDelayDate and daysReturning for each order (mostly used by Tab 2)
    const orders = rawOrders.map((o: any) => {
      const lastDelayDate = getLastDelayDate(o.publicNotes);
      const effectiveDate = lastDelayDate || (o.lastUpdated ? new Date(o.lastUpdated) : null);
      const daysReturning = effectiveDate
        ? Math.floor((Date.now() - effectiveDate.getTime()) / 86400000)
        : 0;
      return {
        ...o,
        lastDelayDate: effectiveDate ? effectiveDate.toISOString() : null,
        daysReturning,
      };
    });

    return NextResponse.json({
      success: true,
      data: orders,
    });

  } catch (error) {
    console.error("GET /api/orders/returns error:", error);
    return NextResponse.json(
      { error: "Không thể lấy dữ liệu đơn hoàn" },
      { status: 500 }
    );
  }
}
