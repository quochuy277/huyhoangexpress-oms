import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/route-permissions";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const denied = requirePermission(session.user, "canViewOrders", "Bạn không có quyền xem đơn hàng");
    if (denied) return denied;

    // Get distinct values for filters
    const [shops, staffs, regions] = await Promise.all([
      prisma.order.findMany({
        distinct: ['shopName'],
        select: { shopName: true },
        where: { AND: [{ shopName: { not: null } }, { shopName: { not: '' } }] },
        orderBy: { shopName: 'asc' }
      }),
      prisma.order.findMany({
        distinct: ['salesStaff'],
        select: { salesStaff: true },
        where: { AND: [{ salesStaff: { not: null } }, { salesStaff: { not: '' } }] },
        orderBy: { salesStaff: 'asc' }
      }),
      prisma.order.findMany({
        distinct: ['regionGroup'],
        select: { regionGroup: true },
        where: { AND: [{ regionGroup: { not: null } }, { regionGroup: { not: '' } }] },
        orderBy: { regionGroup: 'asc' }
      })
    ]);

    return NextResponse.json({
      shopNames: shops.map(s => s.shopName).filter(Boolean),
      salesStaffs: staffs.map(s => s.salesStaff).filter(Boolean),
      regionGroups: regions.map(s => s.regionGroup).filter(Boolean)
    });
  } catch (error) {
    logger.error("GET /api/orders/options", "Error", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
