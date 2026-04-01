import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface StatsCache {
  data: { totalOrders: number; activeShops: number; successRate: number };
  timestamp: number;
}

let statsCache: StatsCache | null = null;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour
const LANDING_BASE_ORDERS = 200_000;
const LANDING_BASE_SHOPS = 250;

export async function GET() {
  // Check cache
  if (statsCache && Date.now() - statsCache.timestamp < CACHE_DURATION_MS) {
    return NextResponse.json(statsCache.data);
  }

  try {
    let overrideSuccessRate: number | null = null;

    // Check admin override
    const override = await prisma.systemSetting.findUnique({
      where: { key: "landing_stats_override" },
    });

    if (override?.value) {
      try {
        const parsed = JSON.parse(override.value);
        overrideSuccessRate =
          typeof parsed.successRate === "number" ? parsed.successRate : null;
      } catch {
        // Invalid JSON, fall through to query
      }
    }

    // Query actual stats from DB
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const [totalOrders, activeShopsResult, deliveredCount, totalFinished] =
      await Promise.all([
        prisma.order.count(),
        prisma.order.groupBy({
          by: ["shopName"],
          where: {
            createdTime: { gte: sixtyDaysAgo },
            shopName: { not: null },
          },
          _count: true,
        }),
        prisma.order.count({
          where: {
            deliveryStatus: { in: ["DELIVERED", "RECONCILED"] },
          },
        }),
        prisma.order.count({
          where: {
            deliveryStatus: {
              notIn: ["PROCESSING", "IN_TRANSIT", "DELIVERING"],
            },
          },
        }),
      ]);

    const activeShops = activeShopsResult.length;
    const successRate =
      totalFinished > 0
        ? Math.round((deliveredCount / totalFinished) * 1000) / 10
        : 0;

    const data = {
      totalOrders: LANDING_BASE_ORDERS + totalOrders,
      activeShops: LANDING_BASE_SHOPS + activeShops,
      successRate: overrideSuccessRate ?? successRate,
    };

    statsCache = { data, timestamp: Date.now() };
    return NextResponse.json(data);
  } catch (error) {
    console.error("Landing stats error:", error);
    // Return safe fallback
    return NextResponse.json({
      totalOrders: LANDING_BASE_ORDERS,
      activeShops: LANDING_BASE_SHOPS,
      successRate: 0,
    });
  }
}
