import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions;

  if (!permissions.canViewCRM) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const canViewAll = permissions.canViewAllShops || session.user.role === "ADMIN";
  const userId = session.user.id;

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get assigned shop names if user can't view all
    let assignedShopNames: string[] | null = null;
    if (!canViewAll) {
      const assignments = await prisma.shopAssignment.findMany({
        where: { userId },
        include: { shop: { select: { shopName: true } } },
      });
      assignedShopNames = assignments.map((a) => a.shop.shopName);
    }

    const shopNameFilter = assignedShopNames !== null
      ? { shopName: { in: assignedShopNames } }
      : {};

    // Get all unique shopNames with their order stats
    const allShops = await prisma.order.groupBy({
      by: ["shopName"],
      where: {
        shopName: { not: "" },
        ...shopNameFilter,
      },
      _count: { id: true },
      _max: { createdTime: true },
      _min: { createdTime: true },
    });

    // Recent orders (last 30 days) grouped by shop
    const recentShops = await prisma.order.groupBy({
      by: ["shopName"],
      where: {
        shopName: { not: "" },
        createdTime: { gte: thirtyDaysAgo },
        ...shopNameFilter,
      },
      _count: { id: true },
    });
    const recentMap = new Map(recentShops.map((s) => [s.shopName, s._count.id]));

    // Previous 30 days for trend (30-60 days ago)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const prevShops = await prisma.order.groupBy({
      by: ["shopName"],
      where: {
        shopName: { not: "" },
        createdTime: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        ...shopNameFilter,
      },
      _count: { id: true },
    });
    const prevMap = new Map(prevShops.map((s) => [s.shopName, s._count.id]));

    // Classify shops
    let activeShops = 0;
    let vipShops = 0;
    let newShops = 0;
    let warningShops = 0;
    let inactiveShops = 0;

    for (const shop of allShops) {
      const name = shop.shopName;
      if (!name) continue;
      const recent = recentMap.get(name) || 0;
      const prev = prevMap.get(name) || 0;
      const lastOrder = shop._max.createdTime;
      const firstOrder = shop._min.createdTime;
      const totalOrders = shop._count.id;

      // Classification logic
      const isInactive = !lastOrder || lastOrder < thirtyDaysAgo;
      const isNew = firstOrder && firstOrder >= thirtyDaysAgo;
      const decline = prev > 0 ? ((prev - recent) / prev) * 100 : 0;
      const isWarning = !isInactive && !isNew && decline >= 30;
      const avgPerMonth = totalOrders / Math.max(1, Math.ceil((now.getTime() - (firstOrder?.getTime() || now.getTime())) / (30 * 24 * 60 * 60 * 1000)));
      const monthsActive = firstOrder ? Math.ceil((now.getTime() - firstOrder.getTime()) / (30 * 24 * 60 * 60 * 1000)) : 0;
      const isVip = !isInactive && !isNew && !isWarning && avgPerMonth >= 50 && monthsActive >= 3;

      if (isInactive) inactiveShops++;
      else if (isNew) newShops++;
      else if (isWarning) warningShops++;
      else if (isVip) vipShops++;
      activeShops += isInactive ? 0 : 1;
    }

    // Urgent list — shops needing attention
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get all ShopProfiles with their latest care log
    const shopProfiles = await prisma.shopProfile.findMany({
      where: assignedShopNames !== null ? { shopName: { in: assignedShopNames } } : {},
      include: {
        careLogs: {
          where: { isAutoLog: false },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const urgentList: Array<{
      shopName: string;
      reason: string;
      lastContactDate: Date | null;
      classification: string | null;
    }> = [];

    for (const profile of shopProfiles) {
      const lastContact = profile.careLogs[0]?.createdAt || null;
      const needsContact = !lastContact || lastContact < fourteenDaysAgo;
      if (!needsContact) continue;

      const recent = recentMap.get(profile.shopName) || 0;
      const prev = prevMap.get(profile.shopName) || 0;
      const decline = prev > 0 ? Math.round(((prev - recent) / prev) * 100) : 0;
      const shopData = allShops.find((s) => s.shopName === profile.shopName);
      const lastOrder = shopData?._max.createdTime;
      const isInactive = !lastOrder || lastOrder < thirtyDaysAgo;

      let reason = "Chưa liên hệ 14+ ngày";
      if (isInactive) reason = `Ngừng gửi hàng ${lastOrder ? Math.ceil((now.getTime() - lastOrder.getTime()) / (24 * 60 * 60 * 1000)) : "?"} ngày`;
      else if (decline >= 30) reason = `Giảm ${decline}% đơn`;

      urgentList.push({
        shopName: profile.shopName,
        reason,
        lastContactDate: lastContact,
        classification: profile.classification,
      });
    }

    // Sort: WARNING > INACTIVE > others, then by last contact date
    urgentList.sort((a, b) => {
      const priority = (r: string) =>
        r.includes("Giảm") ? 0 : r.includes("Ngừng") ? 1 : 2;
      return priority(a.reason) - priority(b.reason);
    });

    // Recent activities (latest 10 non-auto care logs)
    const recentActivities = await prisma.shopCareLog.findMany({
      where: {
        isAutoLog: false,
        ...(assignedShopNames !== null
          ? { shop: { shopName: { in: assignedShopNames } } }
          : {}),
      },
      include: { shop: { select: { shopName: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      data: {
        stats: { activeShops, vipShops, newShops, warningShops, inactiveShops },
        urgentList: urgentList.slice(0, 10),
        recentActivities: recentActivities.map((a) => ({
          shopName: a.shop.shopName,
          authorName: a.authorName,
          contactMethod: a.contactMethod,
          content: a.content.substring(0, 100),
          createdAt: a.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("CRM Dashboard Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
