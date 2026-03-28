import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { requireClaimsPermission } from "@/lib/claims-permissions";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    const denied = requireClaimsPermission(session.user, "canViewClaims");
    if (denied) {
      return denied;
    }

    const q = req.nextUrl.searchParams.get("q") || "";
    if (q.length < 2) {
      return NextResponse.json({ orders: [] });
    }

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { requestCode: { contains: q, mode: "insensitive" } },
          { carrierOrderCode: { contains: q, mode: "insensitive" } },
          { receiverPhone: { contains: q, mode: "insensitive" } },
          { shopName: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        requestCode: true,
        carrierOrderCode: true,
        carrierName: true,
        shopName: true,
        status: true,
        deliveryStatus: true,
        codAmount: true,
        totalFee: true,
        receiverPhone: true,
        staffNotes: true,
        claimOrder: {
          select: {
            id: true,
            claimStatus: true,
            isCompleted: true,
          },
        },
      },
      take: 10,
      orderBy: { createdTime: "desc" },
    });

    return NextResponse.json({
      orders: orders.map((order) => ({
        ...order,
        existingClaim: order.claimOrder
          ? {
              id: order.claimOrder.id,
              claimStatus: order.claimOrder.claimStatus,
              isCompleted: order.claimOrder.isCompleted,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("GET /api/claims/search-orders error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
