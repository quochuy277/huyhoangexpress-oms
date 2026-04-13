import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/route-permissions";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shopName: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user, "canViewCRM")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { shopName } = await params;
  const decodedName = decodeURIComponent(shopName);

  try {
    // Check assignment if user can't view all
    const canViewAll = hasPermission(session.user, "canViewAllShops");
    if (!canViewAll) {
      const assignment = await prisma.shopAssignment.findFirst({
        where: {
          userId: session.user.id,
          shop: { shopName: decodedName },
        },
      });
      if (!assignment) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Get or auto-create ShopProfile
    let profile = await prisma.shopProfile.findUnique({
      where: { shopName: decodedName },
      include: {
        assignments: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    if (!profile) {
      profile = await prisma.shopProfile.create({
        data: { shopName: decodedName },
        include: {
          assignments: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      });
    }

    // Order stats
    const allOrders = await prisma.order.aggregate({
      where: { shopName: decodedName },
      _count: { id: true },
      _sum: { revenue: true, codAmount: true, totalFee: true },
    });

    const deliveredOrders = await prisma.order.count({
      where: {
        shopName: decodedName,
        deliveryStatus: { in: ["DELIVERED", "RECONCILED"] },
      },
    });

    const returnedOrders = await prisma.order.count({
      where: {
        shopName: decodedName,
        deliveryStatus: { in: ["RETURNING_FULL", "RETURNED_FULL", "RETURNED_PARTIAL", "RETURN_DELAYED", "RETURN_CONFIRMED"] },
      },
    });

    const claimCount = await prisma.claimOrder.count({
      where: { order: { shopName: decodedName } },
    });

    const totalOrders = allOrders._count.id;
    const totalRevenue = Number(allOrders._sum.revenue || 0);
    const totalCOD = Number(allOrders._sum.codAmount || 0);
    const successRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;
    const returnRate = totalOrders > 0 ? Math.round((returnedOrders / totalOrders) * 100) : 0;

    // Main carrier
    const carrierBreakdown = await prisma.order.groupBy({
      by: ["carrierName"],
      where: { shopName: decodedName, carrierName: { not: "" } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const mainCarrier = carrierBreakdown[0]?.carrierName || "—";

    // Monthly orders (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);

    const monthlyOrdersRaw = await prisma.order.findMany({
      where: {
        shopName: decodedName,
        createdTime: { gte: sixMonthsAgo },
      },
      select: { createdTime: true, revenue: true },
    });

    // Group by month (count + revenue)
    const monthlyMap = new Map<string, { count: number; revenue: number }>();
    for (const o of monthlyOrdersRaw) {
      if (!o.createdTime) continue;
      const key = `${o.createdTime.getFullYear()}-${String(o.createdTime.getMonth() + 1).padStart(2, "0")}`;
      const existing = monthlyMap.get(key) || { count: 0, revenue: 0 };
      existing.count += 1;
      existing.revenue += Number(o.revenue || 0);
      monthlyMap.set(key, existing);
    }
    const monthlyOrders = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, count: data.count, revenue: data.revenue }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // First order date for avg calculation
    const firstOrder = await prisma.order.findFirst({
      where: { shopName: decodedName },
      orderBy: { createdTime: "asc" },
      select: { createdTime: true },
    });
    const now = new Date();
    const monthsActive = firstOrder?.createdTime
      ? Math.max(1, Math.ceil((now.getTime() - firstOrder.createdTime.getTime()) / (30 * 24 * 60 * 60 * 1000)))
      : 1;
    const avgOrdersPerMonth = Math.round(totalOrders / monthsActive);

    // Care logs
    const careLogs = await prisma.shopCareLog.findMany({
      where: { shopId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Recent orders (20 most recent)
    const recentOrders = await prisma.order.findMany({
      where: { shopName: decodedName },
      orderBy: { createdTime: "desc" },
      take: 20,
      select: {
        id: true,
        requestCode: true,
        status: true,
        deliveryStatus: true,
        createdTime: true,
        codAmount: true,
        revenue: true,
        claimOrder: {
          select: { issueType: true },
        },
      },
    });

    // Related todos
    const relatedTodos = await prisma.todoItem.findMany({
      where: {
        OR: [
          { title: { contains: decodedName } },
          { linkedOrder: { shopName: decodedName } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        assignee: { select: { name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          id: profile.id,
          shopName: profile.shopName,
          phone: profile.phone,
          email: profile.email,
          contactPerson: profile.contactPerson,
          zalo: profile.zalo,
          address: profile.address,
          internalShopNote: profile.internalShopNote,
          classification: profile.classification,
          startDate: profile.startDate,
        },
        assignees: profile.assignments.map((a) => ({
          id: a.user.id,
          name: a.user.name,
          email: a.user.email,
        })),
        stats: {
          totalOrders,
          totalRevenue,
          totalCOD,
          successRate,
          returnRate,
          avgOrdersPerMonth,
          mainCarrier,
          claimCount,
          carrierBreakdown: carrierBreakdown.map((c) => ({
            carrier: c.carrierName,
            count: c._count.id,
            percentage: totalOrders > 0 ? Math.round((c._count.id / totalOrders) * 100) : 0,
          })),
        },
        monthlyOrders,
        careLogs: careLogs.map((l) => ({
          id: l.id,
          contactMethod: l.contactMethod,
          content: l.content,
          result: l.result,
          relatedOrderId: l.relatedOrderId,
          followUpDate: l.followUpDate,
          isAutoLog: l.isAutoLog,
          authorName: l.authorName,
          createdAt: l.createdAt,
        })),
        recentOrders: recentOrders.map((o) => ({
          id: o.id,
          requestCode: o.requestCode,
          status: o.status,
          deliveryStatus: o.deliveryStatus,
          createdTime: o.createdTime,
          codAmount: Number(o.codAmount),
          revenue: Number(o.revenue),
          hasClaimOrder: !!o.claimOrder,
          claimIssueType: o.claimOrder?.issueType || null,
        })),
        relatedTodos,
      },
    });
  } catch (error) {
    console.error("CRM Shop Detail Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ shopName: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user, "canViewCRM")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!hasPermission(session.user, "canEditShopInfo")) {
    return NextResponse.json({ error: "Bạn không có quyền sửa thông tin khách hàng" }, { status: 403 });
  }

  const { shopName } = await params;
  const decodedName = decodeURIComponent(shopName);
  const body = await request.json();

  try {
    const profile = await prisma.shopProfile.upsert({
      where: { shopName: decodedName },
      create: {
        shopName: decodedName,
        phone: body.phone,
        email: body.email,
        contactPerson: body.contactPerson,
        zalo: body.zalo,
        address: body.address,
        internalShopNote: body.internalShopNote,
        classification: body.classification || null,
        startDate: body.startDate ? new Date(body.startDate) : null,
      },
      update: {
        phone: body.phone,
        email: body.email,
        contactPerson: body.contactPerson,
        zalo: body.zalo,
        address: body.address,
        internalShopNote: body.internalShopNote,
        classification: body.classification || null,
        startDate: body.startDate ? new Date(body.startDate) : null,
      },
    });

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error("CRM Shop Update Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
