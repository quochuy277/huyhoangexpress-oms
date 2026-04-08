import { DeliveryStatus, Prisma } from "@prisma/client";
import { format, startOfMonth, startOfWeek, subDays, subMonths, subWeeks } from "date-fns";

import { parsePeriodFromURL } from "@/lib/finance-period";
import { prisma } from "@/lib/prisma";

const COMPLETED: DeliveryStatus[] = ["RECONCILED", "RETURNED_FULL", "RETURNED_PARTIAL", "DELIVERED"] as DeliveryStatus[];

function buildRangeURL(searchParams: URLSearchParams) {
  const url = new URL("http://localhost/finance");
  for (const [key, value] of searchParams.entries()) {
    url.searchParams.set(key, value);
  }
  return url;
}

export async function getFinanceAnalysisInitialData(searchParams: URLSearchParams) {
  const view = searchParams.get("view") || "carrier";
  const range = parsePeriodFromURL(buildRangeURL(searchParams));
  const from = range.from;
  const to = range.to;
  const shopSearch = searchParams.get("shop") || "";
  const granularity = searchParams.get("granularity") || "day";

  if (view === "carrier") {
    const whereBase = { deliveryStatus: { in: COMPLETED }, createdTime: { gte: from, lte: to } };
    const [mainGroups, negativeGroups, returnGroups] = await Promise.all([
      prisma.order.groupBy({
        by: ["carrierName"],
        where: whereBase,
        _sum: { totalFee: true, carrierFee: true, revenue: true, codAmount: true },
        _count: true,
      }),
      prisma.order.groupBy({
        by: ["carrierName"],
        where: { ...whereBase, revenue: { lt: 0 } },
        _count: true,
      }),
      prisma.order.groupBy({
        by: ["carrierName"],
        where: { deliveryStatus: { in: ["RETURNED_FULL", "RETURNED_PARTIAL"] as DeliveryStatus[] }, createdTime: { gte: from, lte: to } },
        _sum: { returnFee: true },
      }),
    ]);

    const negativeMap = new Map(negativeGroups.map((group) => [group.carrierName ?? "Khác", group._count]));
    const returnFeeMap = new Map(returnGroups.map((group) => [group.carrierName ?? "Khác", Number(group._sum.returnFee ?? 0)]));

    return {
      view,
      carriers: mainGroups
        .map((group) => {
          const carrier = group.carrierName ?? "Khác";
          const totalFee = Number(group._sum.totalFee ?? 0);
          const carrierFee = Number(group._sum.carrierFee ?? 0);
          const revenue = Number(group._sum.revenue ?? 0);
          const codTotal = Number(group._sum.codAmount ?? 0);
          const orderCount = group._count;
          const negativeCount = negativeMap.get(carrier) ?? 0;
          const returnFee = returnFeeMap.get(carrier) ?? 0;
          const margin = totalFee > 0 ? Math.round((revenue / totalFee) * 1000) / 10 : 0;
          return { carrier, orderCount, totalFee, carrierFee, revenue, negativeCount, returnFee, codTotal, margin };
        })
        .sort((a, b) => b.revenue - a.revenue),
    };
  }

  if (view === "shop") {
    const shopFilterClause = shopSearch
      ? Prisma.sql`AND "shopName" ILIKE ${"%" + shopSearch + "%"}`
      : Prisma.empty;

    const shops = await prisma.$queryRaw<Array<{
      shop: string;
      total: bigint;
      delivered: bigint;
      returned: bigint;
      revenue: number;
      codTotal: number;
      totalFee: number;
    }>>`
      SELECT
        COALESCE("shopName", 'Không rõ') as shop,
        COUNT(*)::bigint as total,
        COUNT(*) FILTER (WHERE "deliveryStatus" IN ('DELIVERED','RECONCILED'))::bigint as delivered,
        COUNT(*) FILTER (WHERE "deliveryStatus" IN ('RETURNED_FULL','RETURNED_PARTIAL'))::bigint as returned,
        COALESCE(SUM(CASE WHEN "deliveryStatus" IN ('RECONCILED','RETURNED_FULL','RETURNED_PARTIAL') THEN "totalFee" - "carrierFee" ELSE 0 END), 0)::float8 as revenue,
        COALESCE(SUM("codAmount"), 0)::float8 as "codTotal",
        COALESCE(SUM("totalFee"), 0)::float8 as "totalFee"
      FROM "Order"
      WHERE "createdTime" >= ${from} AND "createdTime" <= ${to}
        ${shopFilterClause}
      GROUP BY "shopName"
      ORDER BY revenue DESC
    `;

    const normalizedShops = shops.map((shop) => {
      const total = Number(shop.total);
      const delivered = Number(shop.delivered);
      const returned = Number(shop.returned);
      return {
        shop: shop.shop,
        total,
        delivered,
        returned,
        revenue: Number(shop.revenue),
        codTotal: Number(shop.codTotal),
        totalFee: Number(shop.totalFee),
        deliveryRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
        returnRate: total > 0 ? Math.round((returned / total) * 100) : 0,
        avgFee: total > 0 ? Math.round(Number(shop.totalFee) / total) : 0,
      };
    });

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const periodAStart = subDays(today, 14);
    const periodBStart = subDays(today, 28);
    const periodBEnd = subDays(today, 15);

    const [recentGroups, previousGroups, shopFirstOrders] = await Promise.all([
      prisma.order.groupBy({ by: ["shopName"], where: { createdTime: { gte: periodAStart, lte: today } }, _count: true }),
      prisma.order.groupBy({ by: ["shopName"], where: { createdTime: { gte: periodBStart, lte: periodBEnd } }, _count: true }),
      prisma.order.groupBy({ by: ["shopName"], _min: { createdTime: true } }),
    ]);

    const firstOrderMap: Record<string, Date> = {};
    shopFirstOrders.forEach((entry) => {
      if (entry.shopName && entry._min.createdTime) firstOrderMap[entry.shopName] = entry._min.createdTime;
    });

    const shopCounts: Record<string, { recent: number; previous: number }> = {};
    recentGroups.forEach((group) => {
      const shop = group.shopName || "Không rõ";
      if (!shopCounts[shop]) shopCounts[shop] = { recent: 0, previous: 0 };
      shopCounts[shop].recent = group._count;
    });
    previousGroups.forEach((group) => {
      const shop = group.shopName || "Không rõ";
      if (!shopCounts[shop]) shopCounts[shop] = { recent: 0, previous: 0 };
      shopCounts[shop].previous = group._count;
    });

    const trends = Object.entries(shopCounts)
      .map(([shopName, counts]) => {
        const firstOrder = firstOrderMap[shopName];
        const isNew = firstOrder && today.getTime() - firstOrder.getTime() < 28 * 86400000;

        if (isNew) {
          return { shopName, recentCount: counts.recent, previousCount: counts.previous, changePercent: 0, alertLevel: "new", firstOrderDate: firstOrder.toISOString() };
        }
        if (counts.previous < 5) return null;

        const changePercent = Math.round(((counts.recent - counts.previous) / counts.previous) * 100);
        let alertLevel: "critical" | "warning" | "stable" | "growing" | "new";
        if (changePercent <= -50) alertLevel = "critical";
        else if (changePercent <= -30) alertLevel = "warning";
        else if (changePercent >= 10) alertLevel = "growing";
        else alertLevel = "stable";

        return { shopName, recentCount: counts.recent, previousCount: counts.previous, changePercent, alertLevel, firstOrderDate: firstOrder ? firstOrder.toISOString() : null };
      })
      .filter((trend): trend is NonNullable<typeof trend> => trend !== null)
      .sort((a, b) => a.changePercent - b.changePercent);

    const top5 = normalizedShops.slice(0, 5).map((shop) => shop.shop);
    let chartData: Array<Record<string, string | number>> = [];
    if (top5.length > 0) {
      let chartFrom: Date;
      let truncInterval: string;
      let bucketFn: (date: Date) => string;

      if (granularity === "week") {
        chartFrom = subWeeks(new Date(), 12);
        truncInterval = "week";
        bucketFn = (date) => format(startOfWeek(date, { weekStartsOn: 1 }), "dd/MM");
      } else if (granularity === "month") {
        chartFrom = subMonths(new Date(), 6);
        truncInterval = "month";
        bucketFn = (date) => format(startOfMonth(date), "MM/yyyy");
      } else {
        chartFrom = subDays(new Date(), 30);
        truncInterval = "day";
        bucketFn = (date) => format(date, "dd/MM");
      }

      const rows = await prisma.$queryRawUnsafe<{ period: Date; shop: string; count: bigint }[]>(
        `SELECT
          DATE_TRUNC($1, "createdTime") AS period,
          COALESCE("creatorShopName", 'Khác') AS shop,
          COUNT(*)::bigint AS count
        FROM "Order"
        WHERE "creatorShopName" = ANY($2::text[])
          AND "createdTime" >= $3
          AND "createdTime" <= $4
        GROUP BY period, shop
        ORDER BY period`,
        truncInterval,
        top5,
        chartFrom,
        new Date(),
      );

      const buckets: Record<string, Record<string, number>> = {};
      rows.forEach((row) => {
        const bucket = bucketFn(new Date(row.period));
        if (!buckets[bucket]) buckets[bucket] = {};
        buckets[bucket][row.shop] = Number(row.count);
      });

      chartData = Object.entries(buckets)
        .map(([period, shopsByBucket]) => ({ period, ...shopsByBucket }))
        .sort((a, b) => String(a.period).localeCompare(String(b.period)));
    }

    return {
      view,
      shops: normalizedShops,
      trends,
      chartData,
      chartShops: top5,
      granularity,
      shopSearch,
    };
  }

  const rawPage = searchParams.get("page");
  const rawPageSize = searchParams.get("pageSize");
  const page = Math.max(1, parseInt(rawPage || "1", 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(rawPageSize || "50", 10)));
  const negWhere = { revenue: { lt: 0 } as const, createdTime: { gte: from, lte: to } };

  const [lossAgg, carrierGroups, statusGroups, orders] = await Promise.all([
    prisma.order.aggregate({ where: negWhere, _sum: { revenue: true }, _count: true }),
    prisma.order.groupBy({ by: ["carrierName"], where: negWhere, _count: true }),
    prisma.order.groupBy({ by: ["deliveryStatus"], where: negWhere, _count: true }),
    prisma.order.findMany({
      where: negWhere,
      select: {
        requestCode: true,
        carrierName: true,
        shopName: true,
        creatorShopName: true,
        status: true,
        deliveryStatus: true,
        totalFee: true,
        carrierFee: true,
        revenue: true,
        codAmount: true,
        regionGroup: true,
      },
      orderBy: { revenue: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const totalLoss = Number(lossAgg._sum.revenue ?? 0);
  const sortedCarriers = [...carrierGroups].sort((a, b) => b._count - a._count);
  const topCarrier = sortedCarriers.length > 0 ? sortedCarriers[0].carrierName ?? "Khác" : "—";
  const returnStatuses = new Set(["RETURNED_FULL", "RETURNED_PARTIAL"]);
  const returnCount = statusGroups.reduce((sum, group) => (returnStatuses.has(group.deliveryStatus) ? sum + group._count : sum), 0);
  const feeOverCount = Math.max(0, lossAgg._count - returnCount);
  const topReason = returnCount >= feeOverCount ? "Đơn hoàn" : "Phí vượt";

  return {
    view,
    negData: {
      summary: { totalOrders: lossAgg._count, totalLoss, topCarrier, topReason },
      orders: orders.map((order) => ({
        ...order,
        totalFee: Number(order.totalFee || 0),
        carrierFee: Number(order.carrierFee || 0),
        revenue: Number(order.revenue || 0),
        codAmount: Number(order.codAmount || 0),
      })),
      pagination: {
        page,
        pageSize,
        total: lossAgg._count,
        totalPages: Math.max(1, Math.ceil(lossAgg._count / pageSize)),
      },
    },
  };
}

export async function getFinanceCashbookInitialData(searchParams: URLSearchParams) {
  const range = parsePeriodFromURL(buildRangeURL(searchParams));
  const from = range.from;
  const to = range.to;
  const group = searchParams.get("group") || "";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
  const timeFilter = { transactionTime: { gte: from, lte: to } };
  const where: any = { ...timeFilter };

  if (group) {
    where.groupType = { in: group.split(",") };
  }
  if (search) {
    where.OR = [
      { receiptCode: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
      { shopName: { contains: search, mode: "insensitive" } },
    ];
  }

  const [codAgg, shopPayoutAgg, topUpAgg, latestEntry, groupAgg, transactions, totalTransactions, uploads] = await Promise.all([
    prisma.cashbookEntry.aggregate({ where: { ...timeFilter, groupType: "COD" }, _sum: { amount: true }, _count: true }),
    prisma.cashbookEntry.aggregate({ where: { ...timeFilter, groupType: "SHOP_PAYOUT" }, _sum: { amount: true }, _count: true }),
    prisma.cashbookEntry.aggregate({ where: { ...timeFilter, groupType: "TOP_UP" }, _sum: { amount: true }, _count: true }),
    prisma.cashbookEntry.findFirst({ where: timeFilter, orderBy: { transactionTime: "desc" }, select: { balance: true, transactionTime: true } }),
    prisma.cashbookEntry.groupBy({ by: ["groupType"], where: timeFilter, _sum: { amount: true } }),
    prisma.cashbookEntry.findMany({ where, orderBy: { transactionTime: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.cashbookEntry.count({ where }),
    prisma.cashbookUpload.findMany({ orderBy: { uploadedAt: "desc" }, take: 20 }),
  ]);

  const dailyRows = await prisma.$queryRaw<Array<{ day: string; cod_in: number; shop_out: number; last_balance: number }>>`
    SELECT
      TO_CHAR("transactionTime", 'DD/MM') as day,
      COALESCE(SUM(CASE WHEN "groupType" = 'COD' THEN "amount" ELSE 0 END), 0)::float8 as cod_in,
      COALESCE(SUM(CASE WHEN "groupType" = 'SHOP_PAYOUT' THEN ABS("amount") ELSE 0 END), 0)::float8 as shop_out,
      (ARRAY_AGG("balance" ORDER BY "transactionTime" DESC))[1]::float8 as last_balance
    FROM "CashbookEntry"
    WHERE "transactionTime" >= ${from} AND "transactionTime" <= ${to}
    GROUP BY TO_CHAR("transactionTime", 'DD/MM'), DATE("transactionTime")
    ORDER BY DATE("transactionTime") ASC
  `;

  const [shopPayouts, shopFees] = await Promise.all([
    prisma.cashbookEntry.groupBy({ by: ["shopName"], where: { ...timeFilter, groupType: "SHOP_PAYOUT" }, _sum: { amount: true }, _count: true, _max: { transactionTime: true } }),
    prisma.cashbookEntry.groupBy({ by: ["shopName"], where: { ...timeFilter, groupType: "RECONCILIATION_FEE" }, _sum: { amount: true } }),
  ]);

  const feeMap: Record<string, number> = {};
  shopFees.forEach((fee) => {
    feeMap[fee.shopName || "Không rõ"] = Math.abs(Number(fee._sum.amount || 0));
  });

  return {
    summary: {
      summary: {
        codTotal: Number(codAgg._sum.amount || 0),
        codCount: codAgg._count,
        shopPayoutTotal: Number(shopPayoutAgg._sum.amount || 0),
        shopPayoutCount: shopPayoutAgg._count,
        topUpTotal: Number(topUpAgg._sum.amount || 0),
        topUpCount: topUpAgg._count,
        latestBalance: latestEntry ? Number(latestEntry.balance) : 0,
        latestDate: latestEntry?.transactionTime ? latestEntry.transactionTime.toISOString() : null,
      },
      dailyChart: dailyRows.map((row) => ({ date: row.day, codIn: row.cod_in, shopOut: row.shop_out, balance: row.last_balance })),
      groupDistribution: groupAgg.map((groupItem) => ({ group: groupItem.groupType, amount: Math.abs(Number(groupItem._sum.amount || 0)) })),
      shopPayoutSummary: shopPayouts
        .map((item) => ({
          shop: item.shopName || "Không rõ",
          count: item._count,
          total: Math.abs(Number(item._sum.amount || 0)),
          fee: feeMap[item.shopName || "Không rõ"] || 0,
          lastDate: item._max.transactionTime ? item._max.transactionTime.toISOString() : null,
        }))
        .sort((a, b) => b.total - a.total),
    },
    transactions: transactions.map((transaction) => ({
      ...transaction,
      amount: Number(transaction.amount),
      balance: Number(transaction.balance),
      transactionTime: transaction.transactionTime.toISOString(),
    })),
    pagination: { total: totalTransactions, page, pageSize, pages: Math.ceil(totalTransactions / pageSize) },
    uploads: uploads.map((upload) => ({
      ...upload,
      uploadedAt: upload.uploadedAt.toISOString(),
      dateFrom: upload.dateFrom ? upload.dateFrom.toISOString() : null,
      dateTo: upload.dateTo ? upload.dateTo.toISOString() : null,
    })),
  };
}
