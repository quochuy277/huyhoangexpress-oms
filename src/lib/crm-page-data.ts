import { prisma } from "@/lib/prisma";

type CrmUser = {
  id: string;
  role: string;
  permissions?: {
    canViewCRM?: boolean;
    canViewAllShops?: boolean;
  } | null;
};

function canViewAllCrm(user: CrmUser) {
  return !!user.permissions?.canViewAllShops || user.role === "ADMIN";
}

export async function getCrmProspectsInitialData(user: CrmUser) {
  const canViewAll = canViewAllCrm(user);
  const assigneeFilter = canViewAll ? {} : { assigneeId: user.id };
  const where = !canViewAll ? { isLost: false, assigneeId: user.id } : { isLost: false };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [activeProspects, convertedThisMonth, totalAll, totalConverted, convertedProspects, prospects, total] = await Promise.all([
    prisma.shopProspect.count({ where: { isLost: false, stage: { not: "CONVERTED" }, ...assigneeFilter } }),
    prisma.shopProspect.count({ where: { stage: "CONVERTED", updatedAt: { gte: startOfMonth }, ...assigneeFilter } }),
    prisma.shopProspect.count({ where: assigneeFilter }),
    prisma.shopProspect.count({ where: { stage: "CONVERTED", ...assigneeFilter } }),
    prisma.shopProspect.findMany({ where: { stage: "CONVERTED", ...assigneeFilter }, select: { createdAt: true, updatedAt: true } }),
    prisma.shopProspect.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true } },
        contactLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true, followUpDate: true },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      skip: 0,
      take: 200,
    }),
    prisma.shopProspect.count({ where }),
  ]);

  let avgConversionDays = 0;
  if (convertedProspects.length > 0) {
    const totalDays = convertedProspects.reduce((sum, item) => sum + (item.updatedAt.getTime() - item.createdAt.getTime()) / (24 * 60 * 60 * 1000), 0);
    avgConversionDays = Math.round(totalDays / convertedProspects.length);
  }

  return {
    stats: {
      success: true,
      data: {
        activeProspects,
        convertedThisMonth,
        conversionRate: totalAll > 0 ? Math.round((totalConverted / totalAll) * 100) : 0,
        avgConversionDays,
      },
    },
    prospects: {
      success: true,
      data: {
        prospects: prospects.map((prospect) => ({
          ...prospect,
          createdAt: prospect.createdAt.toISOString(),
          updatedAt: prospect.updatedAt.toISOString(),
          lastContactDate: prospect.contactLogs[0]?.createdAt?.toISOString() || null,
          nextFollowUp: prospect.contactLogs[0]?.followUpDate?.toISOString() || null,
        })),
        pagination: {
          page: 1,
          pageSize: 200,
          total,
          totalPages: Math.ceil(total / 200),
        },
      },
    },
  };
}

export async function getCrmShopsInitialData(user: CrmUser) {
  const canViewAll = canViewAllCrm(user);
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let assignedShopNames: string[] | null = null;
  if (!canViewAll) {
    const assignments = await prisma.shopAssignment.findMany({
      where: { userId: user.id },
      include: { shop: { select: { shopName: true } } },
    });
    assignedShopNames = assignments.map((assignment) => assignment.shop.shopName);
  }

  const shopNameFilter = assignedShopNames !== null ? { shopName: { in: assignedShopNames } } : {};

  const [allShops, recentShops, prevShops, shopProfiles, recentActivities, monthlyOrders, returnedOrders, recentOrders, prevOrders, profiles] = await Promise.all([
    prisma.order.groupBy({
      by: ["shopName"],
      where: { shopName: { not: "" }, ...shopNameFilter },
      _count: { id: true },
      _max: { createdTime: true },
      _min: { createdTime: true },
    }),
    prisma.order.groupBy({ by: ["shopName"], where: { shopName: { not: "" }, createdTime: { gte: thirtyDaysAgo }, ...shopNameFilter }, _count: { id: true } }),
    prisma.order.groupBy({ by: ["shopName"], where: { shopName: { not: "" }, createdTime: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }, ...shopNameFilter }, _count: { id: true } }),
    prisma.shopProfile.findMany({
      where: assignedShopNames !== null ? { shopName: { in: assignedShopNames } } : {},
      include: { careLogs: { where: { isAutoLog: false }, orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    prisma.shopCareLog.findMany({
      where: {
        isAutoLog: false,
        ...(assignedShopNames !== null ? { shop: { shopName: { in: assignedShopNames } } } : {}),
      },
      include: { shop: { select: { shopName: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.order.groupBy({ by: ["shopName"], where: { shopName: { not: "" }, createdTime: { gte: startOfMonth }, ...shopNameFilter }, _count: { id: true }, _sum: { revenue: true } }),
    prisma.order.groupBy({ by: ["shopName"], where: { shopName: { not: "" }, deliveryStatus: { in: ["RETURNING_FULL", "RETURNED_FULL", "RETURNED_PARTIAL", "RETURN_DELAYED", "RETURN_CONFIRMED"] }, ...shopNameFilter }, _count: { id: true } }),
    prisma.order.groupBy({ by: ["shopName"], where: { shopName: { not: "" }, createdTime: { gte: fourteenDaysAgo }, ...shopNameFilter }, _count: { id: true } }),
    prisma.order.groupBy({ by: ["shopName"], where: { shopName: { not: "" }, createdTime: { gte: twentyEightDaysAgo, lt: fourteenDaysAgo }, ...shopNameFilter }, _count: { id: true } }),
    prisma.shopProfile.findMany({
      where: assignedShopNames !== null ? { shopName: { in: assignedShopNames } } : {},
      include: {
        assignments: { include: { user: { select: { id: true, name: true } } } },
        careLogs: { where: { isAutoLog: false }, orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
    }),
  ]);

  const recentMap = new Map(recentShops.map((shop) => [shop.shopName, shop._count.id]));
  const prevMap = new Map(prevShops.map((shop) => [shop.shopName, shop._count.id]));

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
    const isInactive = !lastOrder || lastOrder < thirtyDaysAgo;
    const isNew = !!(firstOrder && firstOrder >= thirtyDaysAgo);
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

  const allShopsMap = new Map(allShops.map((shop) => [shop.shopName, shop]));
  const urgentList: Array<{ shopName: string; reason: string; lastContactDate: string | null; classification: string | null }> = [];

  for (const profile of shopProfiles) {
    const lastContact = profile.careLogs[0]?.createdAt || null;
    const needsContact = !lastContact || lastContact < fourteenDaysAgo;
    if (!needsContact) continue;

    const recent = recentMap.get(profile.shopName) || 0;
    const prev = prevMap.get(profile.shopName) || 0;
    const decline = prev > 0 ? Math.round(((prev - recent) / prev) * 100) : 0;
    const shopData = allShopsMap.get(profile.shopName);
    const lastOrder = shopData?._max.createdTime;
    const isInactive = !lastOrder || lastOrder < thirtyDaysAgo;

    let reason = "Chưa liên hệ 14+ ngày";
    if (isInactive) reason = `Ngừng gửi hàng ${lastOrder ? Math.ceil((now.getTime() - lastOrder.getTime()) / (24 * 60 * 60 * 1000)) : "?"} ngày`;
    else if (decline >= 30) reason = `Giảm ${decline}% đơn`;

    urgentList.push({
      shopName: profile.shopName,
      reason,
      lastContactDate: lastContact ? lastContact.toISOString() : null,
      classification: profile.classification,
    });
  }

  urgentList.sort((a, b) => {
    const priority = (reason: string) => (reason.includes("Giảm") ? 0 : reason.includes("Ngừng") ? 1 : 2);
    return priority(a.reason) - priority(b.reason);
  });

  const monthlyMap = new Map(monthlyOrders.map((shop) => [shop.shopName, { count: shop._count.id, revenue: shop._sum.revenue }]));
  const returnedMap = new Map(returnedOrders.map((shop) => [shop.shopName, shop._count.id]));
  const recentOrdersMap = new Map(recentOrders.map((shop) => [shop.shopName, shop._count.id]));
  const prevOrdersMap = new Map(prevOrders.map((shop) => [shop.shopName, shop._count.id]));
  const profileMap = new Map(profiles.map((profile) => [profile.shopName, profile]));

  const shops = allShops
    .filter((shop) => !!shop.shopName)
    .map((shop) => {
      const name = shop.shopName as string;
      const total = shop._count.id;
      const returned = returnedMap.get(name) || 0;
      const monthly = monthlyMap.get(name);
      const recent14 = recentOrdersMap.get(name) || 0;
      const prev14 = prevOrdersMap.get(name) || 0;
      const profile = profileMap.get(name);
      const lastOrder = shop._max.createdTime;
      const firstOrder = shop._min.createdTime;

      let classification: string;
      if (profile?.classification) {
        classification = profile.classification;
      } else {
        const isInactive = !lastOrder || lastOrder < thirtyDaysAgo;
        const isNew = !!(firstOrder && firstOrder >= thirtyDaysAgo);
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

      let trend = "stable";
      if (!firstOrder || firstOrder >= thirtyDaysAgo) trend = "new";
      else if (prev14 > 0 && recent14 > prev14 * 1.2) trend = "up";
      else if (prev14 > 0 && recent14 < prev14 * 0.7) trend = "down";

      return {
        shopName: name,
        totalOrders: total,
        ordersThisMonth: monthly?.count || 0,
        revenueThisMonth: Number(monthly?.revenue || 0),
        returnRate: total > 0 ? Math.round((returned / total) * 100) : 0,
        classification,
        trend,
        assignees: profile?.assignments?.map((assignment) => ({ id: assignment.user.id, name: assignment.user.name })) || [],
        lastContactDate: profile?.careLogs?.[0]?.createdAt?.toISOString() || null,
      };
    })
    .sort((a, b) => b.ordersThisMonth - a.ordersThisMonth)
    .slice(0, 20);

  return {
    dashboard: {
      success: true,
      data: {
        stats: { activeShops, vipShops, newShops, warningShops, inactiveShops },
        urgentList: urgentList.slice(0, 10),
        recentActivities: recentActivities.map((activity) => ({
          shopName: activity.shop.shopName,
          authorName: activity.authorName,
          contactMethod: activity.contactMethod,
          content: activity.content.substring(0, 100),
          createdAt: activity.createdAt.toISOString(),
        })),
      },
    },
    shops: {
      success: true,
      data: {
        shops,
        pagination: { page: 1, pageSize: 20, total: shops.length, totalPages: Math.max(1, Math.ceil(shops.length / 20)) },
      },
    },
  };
}
