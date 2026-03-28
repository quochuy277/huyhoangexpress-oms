import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { requireClaimsPermission } from "@/lib/claims-permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    const denied = requireClaimsPermission(session.user, "canViewClaims");
    if (denied) {
      return denied;
    }

    const [shops, statuses] = await Promise.all([
      prisma.order.findMany({
        where: {
          claimOrder: { isNot: null },
          shopName: { not: null },
        },
        select: { shopName: true },
        distinct: ["shopName"],
        orderBy: { shopName: "asc" },
      }),
      prisma.order.findMany({
        where: {
          claimOrder: { isNot: null },
        },
        select: { status: true },
        distinct: ["status"],
        orderBy: { status: "asc" },
      }),
    ]);

    return NextResponse.json({
      shops: shops.map((shop) => shop.shopName).filter(Boolean),
      statuses: statuses.map((item) => item.status).filter(Boolean),
    });
  } catch (error) {
    console.error("GET /api/claims/filter-options error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
