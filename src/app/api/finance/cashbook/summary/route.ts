import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFinanceAccess } from "@/lib/finance-auth";
import { parsePeriodFromURL } from "@/lib/finance-period";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireFinanceAccess();
    if (error) return error;

    const url = new URL(req.url);
    const range = parsePeriodFromURL(url);
    const from = range.from, to = range.to;
    const timeFilter = { transactionTime: { gte: from, lte: to } };

    // Use aggregation queries instead of fetching all entries into memory
    const [
      codAgg,
      shopPayoutAgg,
      topUpAgg,
      latestEntry,
      groupAgg,
    ] = await Promise.all([
      prisma.cashbookEntry.aggregate({
        where: { ...timeFilter, groupType: "COD" },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.cashbookEntry.aggregate({
        where: { ...timeFilter, groupType: "SHOP_PAYOUT" },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.cashbookEntry.aggregate({
        where: { ...timeFilter, groupType: "TOP_UP" },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.cashbookEntry.findFirst({
        where: timeFilter,
        orderBy: { transactionTime: "desc" },
        select: { balance: true, transactionTime: true },
      }),
      prisma.cashbookEntry.groupBy({
        by: ["groupType"],
        where: timeFilter,
        _sum: { amount: true },
      }),
    ]);

    const summary = {
      codTotal: Number(codAgg._sum.amount || 0),
      codCount: codAgg._count,
      shopPayoutTotal: Number(shopPayoutAgg._sum.amount || 0),
      shopPayoutCount: shopPayoutAgg._count,
      topUpTotal: Number(topUpAgg._sum.amount || 0),
      topUpCount: topUpAgg._count,
      latestBalance: latestEntry ? Number(latestEntry.balance) : 0,
      latestDate: latestEntry?.transactionTime || null,
    };

    const groupDistribution = groupAgg.map(g => ({
      group: g.groupType,
      amount: Math.abs(Number(g._sum.amount || 0)),
    }));

    // Daily chart — aggregate at DB level using raw SQL
    const dailyRows = await prisma.$queryRaw<Array<{
      day: string;
      cod_in: number;
      shop_out: number;
      last_balance: number;
    }>>`
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

    const dailyChart = dailyRows.map(r => ({
      date: r.day,
      codIn: r.cod_in,
      shopOut: r.shop_out,
      balance: r.last_balance,
    }));

    // Shop payout summary — use groupBy for aggregation
    const [shopPayouts, shopFees] = await Promise.all([
      prisma.cashbookEntry.groupBy({
        by: ["shopName"],
        where: { ...timeFilter, groupType: "SHOP_PAYOUT" },
        _sum: { amount: true },
        _count: true,
        _max: { transactionTime: true },
      }),
      prisma.cashbookEntry.groupBy({
        by: ["shopName"],
        where: { ...timeFilter, groupType: "RECONCILIATION_FEE" },
        _sum: { amount: true },
      }),
    ]);

    const feeMap: Record<string, number> = {};
    shopFees.forEach(f => {
      feeMap[f.shopName || "Không rõ"] = Math.abs(Number(f._sum.amount || 0));
    });

    const shopPayoutSummary = shopPayouts
      .map(s => ({
        shop: s.shopName || "Không rõ",
        count: s._count,
        total: Math.abs(Number(s._sum.amount || 0)),
        fee: feeMap[s.shopName || "Không rõ"] || 0,
        lastDate: s._max.transactionTime,
      }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      summary,
      dailyChart,
      groupDistribution,
      shopPayoutSummary,
    });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
