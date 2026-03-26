import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


export async function GET(request: NextRequest) {
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
  const { searchParams } = new URL(request.url);

  const classFilter = searchParams.get("class") || "";
  const assigneeFilter = searchParams.get("assignee") || "";
  const lastContactFilter = searchParams.get("lastContact") || "";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get assigned shop names if restricted
    let assignedShopNames: string[] | null = null;
    if (!canViewAll) {
      const assignments = await prisma.shopAssignment.findMany({
        where: { userId },
        include: { shop: { select: { shopName: true } } },
      });
      assignedShopNames = assignments.map((a) => a.shop.shopName);
      if (assignedShopNames.length === 0) {
        return NextResponse.json({
          success: true,
          data: { shops: [], pagination: { page: 1, pageSize, total: 0, totalPages: 0 }, message: "Chưa được phân công shop nào." },
        });
      }
    }

    // If filtering by assignee
    if (assigneeFilter) {
      const assigneeAssignments = await prisma.shopAssignment.findMany({
        where: { userId: assigneeFilter },
        include: { shop: { select: { shopName: true } } },
      });
      const assigneeShops = assigneeAssignments.map((a) => a.shop.shopName);
      if (assignedShopNames) {
        assignedShopNames = assignedShopNames.filter((n) => assigneeShops.includes(n));
      } else {
        assignedShopNames = assigneeShops;
      }
    }

    const shopNameFilter = assignedShopNames !== null
      ? { shopName: { in: assignedShopNames } }
      : {};

    // Run all data-fetching queries in parallel
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const [allShops, monthlyOrders, returnedOrders, recentOrders, prevOrders, profiles] = await Promise.all([
      // Get all unique shopNames from Orders
      prisma.order.groupBy({
        by: ["shopName"],
        where: {
          shopName: { not: "" },
          ...(search ? { shopName: { contains: search, mode: "insensitive" as const } } : {}),
          ...shopNameFilter,
        },
        _count: { id: true },
        _max: { createdTime: true },
        _min: { createdTime: true },
      }),
      // Current month orders
      prisma.order.groupBy({
        by: ["shopName"],
        where: {
          shopName: { not: "" },
          createdTime: { gte: startOfMonth },
          ...shopNameFilter,
        },
        _count: { id: true },
        _sum: { revenue: true },
      }),
      // Returned orders count
      prisma.order.groupBy({
        by: ["shopName"],
        where: {
          shopName: { not: "" },
          deliveryStatus: { in: ["RETURNING_FULL", "RETURNED_FULL", "RETURNED_PARTIAL", "RETURN_DELAYED", "RETURN_CONFIRMED"] },
          ...shopNameFilter,
        },
        _count: { id: true },
      }),
      // Recent 14 days for trend
      prisma.order.groupBy({
        by: ["shopName"],
        where: {
          shopName: { not: "" },
          createdTime: { gte: fourteenDaysAgo },
          ...shopNameFilter,
        },
        _count: { id: true },
      }),
      // Previous 14 days for trend (14-28 days ago)
      prisma.order.groupBy({
        by: ["shopName"],
        where: {
          shopName: { not: "" },
          createdTime: {
            gte: twentyEightDaysAgo,
            lt: fourteenDaysAgo,
          },
          ...shopNameFilter,
        },
        _count: { id: true },
      }),
      // Shop profiles for classification overrides & assignments
      prisma.shopProfile.findMany({
        where: assignedShopNames !== null ? { shopName: { in: assignedShopNames } } : {},
        include: {
          assignments: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
          careLogs: {
            where: { isAutoLog: false },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
        },
      }),
    ]);

    const monthlyMap = new Map(monthlyOrders.map((s) => [s.shopName, { count: s._count.id, revenue: s._sum.revenue }]));
    const returnedMap = new Map(returnedOrders.map((s) => [s.shopName, s._count.id]));
    const recentMap = new Map(recentOrders.map((s) => [s.shopName, s._count.id]));
    const prevMap = new Map(prevOrders.map((s) => [s.shopName, s._count.id]));
    const profileMap = new Map(profiles.map((p) => [p.shopName, p]));

    // Build shop list with computed data
    type ShopItem = {
      shopName: string;
      totalOrders: number;
      ordersThisMonth: number;
      revenueThisMonth: number;
      returnRate: number;
      classification: string;
      trend: string;
      assignees: Array<{ id: string; name: string }>;
      lastContactDate: Date | null;
    };

    const shops: ShopItem[] = [];

    for (const shop of allShops) {
      const name = shop.shopName;
      if (!name) continue;

      const total = shop._count.id;
      const returned = returnedMap.get(name) || 0;
      const monthly = monthlyMap.get(name);
      const recent14 = recentMap.get(name) || 0;
      const prev14 = prevMap.get(name) || 0;
      const profile = profileMap.get(name);
      const lastOrder = shop._max.createdTime;
      const firstOrder = shop._min.createdTime;

      // Auto-classification
      let classification: string;
      if (profile?.classification) {
        classification = profile.classification;
      } else {
        const isInactive = !lastOrder || lastOrder < thirtyDaysAgo;
        const isNew = firstOrder && firstOrder >= thirtyDaysAgo;
        const decline = prev14 > 0 ? ((prev14 - recent14) / prev14) * 100 : 0;
        const isWarning = !isInactive && !isNew && decline >= 30;
        const monthsActive = firstOrder ? Math.ceil((now.getTime() - firstOrder.getTime()) / (30 * 24 * 60 * 60 * 1000)) : 0;
        const avgPerMonth = total / Math.max(1, monthsActive);
        const isVip = !isInactive && !isNew && !isWarning && avgPerMonth >= 50 && monthsActive >= 3;

        if (isInactive) classification = "INACTIVE";
        else if (isNew) classification = "NEW";
        else if (isWarning) classification = "WARNING";
        else if (isVip) classification = "VIP";
        else classification = "NORMAL";
      }

      // Trend
      let trend = "stable";
      if (!firstOrder || firstOrder >= thirtyDaysAgo) trend = "new";
      else if (prev14 > 0 && recent14 > prev14 * 1.2) trend = "up";
      else if (prev14 > 0 && recent14 < prev14 * 0.7) trend = "down";

      // Assignees
      const assignees = profile?.assignments?.map((a) => ({
        id: a.user.id,
        name: a.user.name,
      })) || [];

      // Last contact
      const lastContactDate = profile?.careLogs?.[0]?.createdAt || null;

      shops.push({
        shopName: name,
        totalOrders: total,
        ordersThisMonth: monthly?.count || 0,
        revenueThisMonth: Number(monthly?.revenue || 0),
        returnRate: total > 0 ? Math.round((returned / total) * 100) : 0,
        classification,
        trend,
        assignees,
        lastContactDate,
      });
    }

    // Apply class filter
    let filtered = shops;
    if (classFilter) {
      filtered = filtered.filter((s) => s.classification === classFilter);
    }

    // Apply last contact filter
    if (lastContactFilter === "none") {
      filtered = filtered.filter((s) => !s.lastContactDate);
    } else if (lastContactFilter === "14days") {
      const d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((s) => !s.lastContactDate || s.lastContactDate < d);
    } else if (lastContactFilter === "7days") {
      const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((s) => !s.lastContactDate || s.lastContactDate < d);
    }

    // Sort by orders this month desc
    filtered.sort((a, b) => b.ordersThisMonth - a.ordersThisMonth);

    // Paginate
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    return NextResponse.json({
      success: true,
      data: {
        shops: paginated,
        pagination: { page, pageSize, total, totalPages },
      },
    });
  } catch (error) {
    console.error("CRM Shops Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
