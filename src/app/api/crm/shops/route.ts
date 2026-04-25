import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCrmShopsInitialData } from "@/lib/crm-page-data";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/route-permissions";
import { createServerTiming, mergeServerTimingValues } from "@/lib/server-timing";
import { logger } from "@/lib/logger";


export async function GET(request: NextRequest) {
  const timing = createServerTiming();

  try {
    const session = await timing.measure("auth", () => auth());
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: timing.headers() });
    }

    if (!hasPermission(session.user, "canViewCRM")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: timing.headers() });
    }

    const canViewAll = hasPermission(session.user, "canViewAllShops");
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    const classFilter = searchParams.get("class") || "";
    const assigneeFilter = searchParams.get("assignee") || "";
    const lastContactFilter = searchParams.get("lastContact") || "";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const isDefaultBootstrapRequest =
      !classFilter &&
      !assigneeFilter &&
      !lastContactFilter &&
      !search &&
      page === 1 &&
      pageSize === 20;

    if (isDefaultBootstrapRequest) {
      const initialData = await getCrmShopsInitialData(session.user);
      const headers = timing.headers();
      headers["Server-Timing"] = mergeServerTimingValues(headers["Server-Timing"], initialData._timing);
      timing.log("crm-shops-api");

      return NextResponse.json(initialData.shops, { headers });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get assigned shop names if restricted.
    // Over-fetch fix (Sprint 2): the previous version used `include: { shop }`,
    // which pulls every column of ShopAssignment + every column of ShopProfile
    // (including `internalShopNote`, a Text blob). We only need the shopName
    // to build the allow-list — select exactly that.
    let assignedShopNames: string[] | null = null;
    if (!canViewAll) {
      const assignments = await timing.measure("assignments", () =>
        prisma.shopAssignment.findMany({
          where: { userId },
          select: { shop: { select: { shopName: true } } },
        }),
      );
      assignedShopNames = assignments.map((a) => a.shop.shopName);
      if (assignedShopNames.length === 0) {
        return NextResponse.json({
          success: true,
          data: { shops: [], pagination: { page: 1, pageSize, total: 0, totalPages: 0 }, message: "Chưa được phân công shop nào." },
        }, { headers: timing.headers() });
      }
    }

    // If filtering by assignee — same over-fetch fix as above.
    if (assigneeFilter) {
      const assigneeAssignments = await prisma.shopAssignment.findMany({
        where: { userId: assigneeFilter },
        select: { shop: { select: { shopName: true } } },
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

    const [allShops, monthlyOrders, returnedOrders, recentOrders, prevOrders, profiles] = await timing.measure("queries", () => Promise.all([
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
      // Shop profiles for classification overrides & assignments.
      // Over-fetch fix (Sprint 2): switched from `include` to `select` so we
      // skip loading `internalShopNote` (Text), `address`, `phone`, `email`,
      // `contactPerson`, `zalo`, `startDate`, `createdAt`, `updatedAt` —
      // none of which this endpoint returns. Saves bytes on responses where
      // many shops have long notes.
      prisma.shopProfile.findMany({
        where: assignedShopNames !== null ? { shopName: { in: assignedShopNames } } : {},
        select: {
          shopName: true,
          classification: true,
          assignments: {
            select: {
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
    ]));

    const transformStartedAt = performance.now();

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

    timing.record("transform", performance.now() - transformStartedAt);
    timing.log("crm-shops-api");

    return NextResponse.json({
      success: true,
      data: {
        shops: paginated,
        pagination: { page, pageSize, total, totalPages },
      },
    }, { headers: timing.headers() });
  } catch (error) {
    logger.error("GET /api/crm/shops", "CRM Shops Error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: timing.headers() });
  }
}
