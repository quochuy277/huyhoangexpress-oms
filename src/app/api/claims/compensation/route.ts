import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — Compensation summary using aggregate/groupBy (no full table scan)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    if (user.permissionGroupId) {
      const pg = await prisma.permissionGroup.findUnique({ where: { id: user.permissionGroupId } });
      if (!pg?.canViewFinancePage) {
        return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
  }

  const url = new URL(req.url);
  const period = url.searchParams.get("period") || "month";

  const now = new Date();
  let dateFrom: Date;
  switch (period) {
    case "last_month":
      dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      break;
    case "quarter":
      dateFrom = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      break;
    case "half":
      dateFrom = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      break;
    case "year":
      dateFrom = new Date(now.getFullYear(), 0, 1);
      break;
    case "all":
      dateFrom = new Date(2020, 0, 1);
      break;
    default:
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const dateFilter = period === "all" ? {} : { detectedDate: { gte: dateFrom } };

  try {
    // Use aggregate queries instead of loading all claims
    const [
      carrierAgg,
      customerAgg,
      pendingCount,
      shopBreakdown,
      issueTypeBreakdown,
    ] = await Promise.all([
      // Carrier compensation aggregate
      prisma.claimOrder.aggregate({
        where: { ...dateFilter, claimStatus: "CARRIER_COMPENSATED" },
        _sum: { carrierCompensation: true },
        _count: true,
      }),
      // Customer compensation aggregate
      prisma.claimOrder.aggregate({
        where: { ...dateFilter, claimStatus: "CUSTOMER_COMPENSATED" },
        _sum: { customerCompensation: true },
        _count: true,
      }),
      // Pending customer compensation count
      prisma.claimOrder.count({
        where: {
          ...dateFilter,
          claimStatus: { in: ["CARRIER_COMPENSATED", "CARRIER_REJECTED"] as any[] },
          isCompleted: false,
        },
      }),
      // Shop breakdown — fetch only needed fields for grouping
      prisma.claimOrder.findMany({
        where: dateFilter,
        select: {
          claimStatus: true,
          isCompleted: true,
          carrierCompensation: true,
          customerCompensation: true,
          order: { select: { shopName: true } },
        },
      }),
      // Issue type distribution via groupBy
      prisma.claimOrder.groupBy({
        by: ["issueType"],
        where: dateFilter,
        _count: true,
      }),
    ]);

    const carrierTotal = Number(carrierAgg._sum.carrierCompensation || 0);
    const customerTotal = Number(customerAgg._sum.customerCompensation || 0);

    const summary = {
      carrierTotal,
      carrierCount: carrierAgg._count,
      customerTotal,
      customerCount: customerAgg._count,
      difference: carrierTotal - customerTotal,
      pendingCount,
    };

    // Build shop map from lightweight query
    const shopMap = new Map<string, {
      shopName: string;
      totalClaims: number;
      processing: number;
      compensated: number;
      rejected: number;
      totalPaid: number;
      totalPending: number;
    }>();

    for (const c of shopBreakdown) {
      const shop = c.order?.shopName || "Không rõ";
      if (!shopMap.has(shop)) {
        shopMap.set(shop, { shopName: shop, totalClaims: 0, processing: 0, compensated: 0, rejected: 0, totalPaid: 0, totalPending: 0 });
      }
      const s = shopMap.get(shop)!;
      s.totalClaims++;
      if (!c.isCompleted) s.processing++;
      if (c.claimStatus === "CUSTOMER_COMPENSATED") {
        s.compensated++;
        s.totalPaid += Number(c.customerCompensation);
      }
      if (c.claimStatus === "CUSTOMER_REJECTED") s.rejected++;
      if (!c.isCompleted && Number(c.customerCompensation) === 0 && Number(c.carrierCompensation) > 0) {
        s.totalPending += Number(c.carrierCompensation);
      }
    }

    const shops = Array.from(shopMap.values()).sort((a, b) => b.totalClaims - a.totalClaims);

    // Monthly chart data — use 6 separate aggregate queries in parallel
    const monthlyPromises = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthStr = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      monthlyPromises.push(
        Promise.all([
          prisma.claimOrder.aggregate({
            where: { detectedDate: { gte: d, lte: monthEnd }, claimStatus: "CARRIER_COMPENSATED" },
            _sum: { carrierCompensation: true },
          }),
          prisma.claimOrder.aggregate({
            where: { detectedDate: { gte: d, lte: monthEnd }, claimStatus: "CUSTOMER_COMPENSATED" },
            _sum: { customerCompensation: true },
          }),
        ]).then(([ca, cu]) => ({
          month: monthStr,
          carrier: Number(ca._sum.carrierCompensation || 0),
          customer: Number(cu._sum.customerCompensation || 0),
        }))
      );
    }
    const monthlyData = await Promise.all(monthlyPromises);

    // Issue distribution from groupBy
    const ISSUE_CONFIG: Record<string, { label: string; color: string }> = {
      SLOW_JOURNEY: { label: "Hành trình chậm", color: "#3b82f6" },
      SUSPICIOUS: { label: "Nghi ngờ", color: "#f97316" },
      LOST: { label: "Thất lạc", color: "#ef4444" },
      DAMAGED: { label: "Hư hỏng", color: "#8b5cf6" },
      OTHER: { label: "Vấn đề khác", color: "#6b7280" },
    };

    const issueDistribution = Object.entries(ISSUE_CONFIG).map(([type, cfg]) => {
      const found = issueTypeBreakdown.find(g => g.issueType === type);
      return { type, label: cfg.label, count: found?._count || 0, color: cfg.color };
    });

    return NextResponse.json({ summary, shops, monthlyData, issueDistribution });
  } catch (e) {
    console.error("Compensation error:", e);
    return NextResponse.json({ error: "Lỗi truy vấn" }, { status: 500 });
  }
}
