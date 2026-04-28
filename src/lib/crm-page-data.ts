import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/route-permissions";
import { createServerTiming } from "@/lib/server-timing";

type CrmUser = {
  id: string;
  role: string;
  permissions?: {
    canViewCRM?: boolean;
    canViewAllShops?: boolean;
  } | null;
};

type CrmShopAssignment = {
  id: string;
  name: string;
};

type CrmShopsInitialData = {
  _timing: string;
  dashboard: {
    success: true;
    data: {
      stats: {
        activeShops: number;
        vipShops: number;
        newShops: number;
        warningShops: number;
        inactiveShops: number;
      };
      urgentList: Array<{
        shopName: string;
        reason: string;
        lastContactDate: string | null;
        classification: string | null;
      }>;
      recentActivities: Array<{
        shopName: string;
        authorName: string;
        contactMethod: string;
        content: string;
        createdAt: string;
      }>;
    };
  };
  shops: {
    success: true;
    data: {
      shops: Array<{
        shopName: string;
        totalOrders: number;
        ordersThisMonth: number;
        revenueThisMonth: number;
        returnRate: number;
        classification: string;
        trend: string;
        assignees: CrmShopAssignment[];
        lastContactDate: string | null;
      }>;
      pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      };
      message?: string;
    };
  };
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const CRM_SHOPS_CACHE_TTL_MS = 5 * 60_000;
const CRM_SHOPS_CACHE_MAX_ENTRIES = 10;

const crmShopsBootstrapCache = new Map<string, CacheEntry<CrmShopsInitialData>>();
const crmShopsBootstrapInFlight = new Map<string, Promise<CrmShopsInitialData>>();

function canViewAllCrm(user: CrmUser) {
  return hasPermission(user, "canViewAllShops");
}

function getCrmShopsCacheKey(user: CrmUser) {
  return canViewAllCrm(user) ? "scope:all" : `scope:user:${user.id}`;
}

function trimCrmShopsBootstrapCache() {
  if (crmShopsBootstrapCache.size <= CRM_SHOPS_CACHE_MAX_ENTRIES) return;

  const oldestEntry = [...crmShopsBootstrapCache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0];
  if (oldestEntry) {
    crmShopsBootstrapCache.delete(oldestEntry[0]);
  }
}

export function clearCrmShopsInitialDataCache() {
  crmShopsBootstrapCache.clear();
  crmShopsBootstrapInFlight.clear();
}

export async function getCrmProspectsInitialData(user: CrmUser) {
  const timing = createServerTiming();
  const canViewAll = canViewAllCrm(user);
  const assigneeFilter = canViewAll ? {} : { assigneeId: user.id };
  const where = !canViewAll ? { isLost: false, assigneeId: user.id } : { isLost: false };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [activeProspects, convertedThisMonth, totalAll, totalConverted, convertedProspects, prospects, total] = await timing.measure("prospects_queries", () => Promise.all([
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
  ]));

  let avgConversionDays = 0;
  if (convertedProspects.length > 0) {
    const totalDays = convertedProspects.reduce((sum, item) => sum + (item.updatedAt.getTime() - item.createdAt.getTime()) / (24 * 60 * 60 * 1000), 0);
    avgConversionDays = Math.round(totalDays / convertedProspects.length);
  }

  timing.log("crm-prospects");

  return {
    _timing: timing.headerValue(),
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

async function loadCrmShopsInitialData(user: CrmUser): Promise<CrmShopsInitialData> {
  const timing = createServerTiming();
  const canViewAll = canViewAllCrm(user);
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let assignedShopNames: string[] | null = null;
  if (!canViewAll) {
    const assignments = await timing.measure("assignments_query", () =>
      prisma.shopAssignment.findMany({
        where: { userId: user.id },
        include: { shop: { select: { shopName: true } } },
      }),
    );
    assignedShopNames = assignments.map((assignment) => assignment.shop.shopName);
    if (assignedShopNames.length === 0) {
      timing.log("crm-shops");
      return {
        _timing: timing.headerValue(),
        dashboard: {
          success: true,
          data: {
            stats: { activeShops: 0, vipShops: 0, newShops: 0, warningShops: 0, inactiveShops: 0 },
            urgentList: [],
            recentActivities: [],
          },
        },
        shops: {
          success: true,
          data: {
            shops: [],
            pagination: {
              page: 1,
              pageSize: 20,
              total: 0,
              totalPages: 0,
            },
            message: "Chưa được phân công shop nào.",
          },
        },
      };
    }
  }

  const shopNameFilter = assignedShopNames !== null ? { shopName: { in: assignedShopNames } } : {};
  const profileFilter = assignedShopNames !== null ? { shopName: { in: assignedShopNames } } : {};

  const [allShops, recentShops, prevShops, profileMetadata, recentActivities, monthlyOrders, returnedOrders, recentOrders, prevOrders] = await timing.measure("shops_queries", () => Promise.all([
    prisma.order.groupBy({
      by: ["shopName"],
      where: { shopName: { not: "" }, ...shopNameFilter },
      _count: { id: true },
      _max: { createdTime: true },
      _min: { createdTime: true },
    }),
    prisma.order.groupBy({
      by: ["shopName"],
      where: { shopName: { not: "" }, createdTime: { gte: thirtyDaysAgo }, ...shopNameFilter },
      _count: { id: true },
    }),
    prisma.order.groupBy({
      by: ["shopName"],
      where: { shopName: { not: "" }, createdTime: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }, ...shopNameFilter },
      _count: { id: true },
    }),
    prisma.shopProfile.findMany({
      where: profileFilter,
      select: {
        shopName: true,
        classification: true,
        careLogs: {
          where: { isAutoLog: false },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
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
    prisma.order.groupBy({
      by: ["shopName"],
      where: { shopName: { not: "" }, createdTime: { gte: startOfMonth }, ...shopNameFilter },
      _count: { id: true },
      _sum: { revenue: true },
    }),
    prisma.order.groupBy({
      by: ["shopName"],
      where: {
        shopName: { not: "" },
        deliveryStatus: { in: ["RETURNING_FULL", "RETURNED_FULL", "RETURNED_PARTIAL", "RETURN_DELAYED", "RETURN_CONFIRMED"] },
        ...shopNameFilter,
      },
      _count: { id: true },
    }),
    prisma.order.groupBy({
      by: ["shopName"],
      where: { shopName: { not: "" }, createdTime: { gte: fourteenDaysAgo }, ...shopNameFilter },
      _count: { id: true },
    }),
    prisma.order.groupBy({
      by: ["shopName"],
      where: { shopName: { not: "" }, createdTime: { gte: twentyEightDaysAgo, lt: fourteenDaysAgo }, ...shopNameFilter },
      _count: { id: true },
    }),
  ]));

  const transformStartedAt = performance.now();
  const recentMap = new Map(recentShops.map((shop) => [shop.shopName, shop._count.id]));
  const prevMap = new Map(prevShops.map((shop) => [shop.shopName, shop._count.id]));
  const profileMetadataMap = new Map(profileMetadata.map((profile) => [profile.shopName, profile]));

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
  const urgentList: Array<{
    shopName: string;
    reason: string;
    lastContactDate: string | null;
    classification: string | null;
  }> = [];

  for (const profile of profileMetadata) {
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

  const shopsWithoutAssignments = allShops
    .filter((shop) => !!shop.shopName)
    .map((shop) => {
      const name = shop.shopName as string;
      const total = shop._count.id;
      const returned = returnedMap.get(name) || 0;
      const monthly = monthlyMap.get(name);
      const recent14 = recentOrdersMap.get(name) || 0;
      const prev14 = prevOrdersMap.get(name) || 0;
      const profile = profileMetadataMap.get(name);
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
        lastContactDate: profile?.careLogs[0]?.createdAt?.toISOString() || null,
      };
    })
    .sort((a, b) => b.ordersThisMonth - a.ordersThisMonth);

  const paginatedShops = shopsWithoutAssignments.slice(0, 20);
  const paginatedShopNames = paginatedShops.map((shop) => shop.shopName);
  const assignmentProfiles = paginatedShopNames.length === 0
    ? []
    : await timing.measure("assignees_query", () =>
      prisma.shopProfile.findMany({
        where: { shopName: { in: paginatedShopNames } },
        select: {
          shopName: true,
          assignments: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      }),
    );

  const assignmentsMap = new Map<string, CrmShopAssignment[]>(
    assignmentProfiles.map((profile) => [
      profile.shopName,
      profile.assignments.map((assignment) => ({
        id: assignment.user.id,
        name: assignment.user.name,
      })),
    ]),
  );

  timing.record("transform", performance.now() - transformStartedAt);
  timing.log("crm-shops");

  return {
    _timing: timing.headerValue(),
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
        shops: paginatedShops.map((shop) => ({
          ...shop,
          assignees: assignmentsMap.get(shop.shopName) || [],
        })),
        pagination: {
          page: 1,
          pageSize: 20,
          total: shopsWithoutAssignments.length,
          totalPages: Math.max(1, Math.ceil(shopsWithoutAssignments.length / 20)),
        },
      },
    },
  };
}

export async function getCrmShopsInitialData(user: CrmUser): Promise<CrmShopsInitialData> {
  const cacheKey = getCrmShopsCacheKey(user);
  const startedAt = performance.now();
  const now = Date.now();
  const cached = crmShopsBootstrapCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    const cacheDuration = Number((performance.now() - startedAt).toFixed(1));
    return {
      ...cached.value,
      _timing: `cache_hit;dur=${cacheDuration},total;dur=${cacheDuration}`,
    };
  }

  const inFlight = crmShopsBootstrapInFlight.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const request = loadCrmShopsInitialData(user)
    .then((value) => {
      crmShopsBootstrapCache.set(cacheKey, {
        value,
        expiresAt: now + CRM_SHOPS_CACHE_TTL_MS,
      });
      trimCrmShopsBootstrapCache();
      return value;
    })
    .finally(() => {
      crmShopsBootstrapInFlight.delete(cacheKey);
    });

  crmShopsBootstrapInFlight.set(cacheKey, request);
  return request;
}
