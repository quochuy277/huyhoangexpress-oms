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
      prisma.claimOrder.findMany({
        select: {
          order: {
            select: {
              shopName: true,
            },
          },
        },
        distinct: ["orderId"],
        orderBy: { orderId: "asc" },
      }),
      prisma.claimOrder.findMany({
        select: {
          order: {
            select: {
              status: true,
            },
          },
        },
        distinct: ["orderId"],
        orderBy: { orderId: "asc" },
      }),
    ]);

    return NextResponse.json({
      shops: [...new Set(shops.map((item) => item.order?.shopName).filter(Boolean))],
      statuses: [...new Set(statuses.map((item) => item.order?.status).filter(Boolean))],
    });
  } catch (error) {
    console.error("GET /api/claims/filter-options error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
