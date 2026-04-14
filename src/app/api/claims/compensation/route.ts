import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { hasClaimsPermission } from "@/lib/claims-permissions";
import { hasPermission } from "@/lib/route-permissions";
import { prisma } from "@/lib/prisma";
import { ISSUE_TYPE_CONFIG } from "@/lib/claims-config";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const user = session.user;
  if (
    !hasClaimsPermission(user, "canViewCompensation")
    && !hasPermission(user, "canViewFinancePage")
  ) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const period = new URL(req.url).searchParams.get("period") || "month";
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
      break;
  }

  const dateFilter = period === "all" ? {} : { detectedDate: { gte: dateFrom } };

  try {
    const [carrierAgg, customerAgg, pendingCount, shopBreakdown, issueTypeBreakdown] = await Promise.all([
      prisma.claimOrder.aggregate({
        where: { ...dateFilter, claimStatus: "CARRIER_COMPENSATED" },
        _sum: { carrierCompensation: true },
        _count: true,
      }),
      prisma.claimOrder.aggregate({
        where: { ...dateFilter, claimStatus: "CUSTOMER_COMPENSATED" },
        _sum: { customerCompensation: true },
        _count: true,
      }),
      prisma.claimOrder.count({
        where: {
          ...dateFilter,
          claimStatus: { in: ["CARRIER_COMPENSATED", "CARRIER_REJECTED"] as any[] },
          isCompleted: false,
        },
      }),
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

    const shopMap = new Map<string, {
      shopName: string;
      totalClaims: number;
      processing: number;
      compensated: number;
      rejected: number;
      totalPaid: number;
      totalPending: number;
    }>();

    for (const claim of shopBreakdown) {
      const shop = claim.order?.shopName || "Không rõ";
      if (!shopMap.has(shop)) {
        shopMap.set(shop, {
          shopName: shop,
          totalClaims: 0,
          processing: 0,
          compensated: 0,
          rejected: 0,
          totalPaid: 0,
          totalPending: 0,
        });
      }

      const summaryRow = shopMap.get(shop)!;
      summaryRow.totalClaims++;
      if (!claim.isCompleted) summaryRow.processing++;
      if (claim.claimStatus === "CUSTOMER_COMPENSATED") {
        summaryRow.compensated++;
        summaryRow.totalPaid += Number(claim.customerCompensation);
      }
      if (claim.claimStatus === "CUSTOMER_REJECTED") {
        summaryRow.rejected++;
      }
      if (!claim.isCompleted && Number(claim.customerCompensation) === 0 && Number(claim.carrierCompensation) > 0) {
        summaryRow.totalPending += Number(claim.carrierCompensation);
      }
    }

    const shops = Array.from(shopMap.values()).sort((a, b) => b.totalClaims - a.totalClaims);

    const monthlyWindowFrom = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthlyRows = await prisma.$queryRaw<Array<{ month: string; carrier_total: unknown; customer_total: unknown }>>(
      Prisma.sql`
        SELECT
          to_char(date_trunc('month', "detectedDate"), 'MM/YYYY') AS month,
          COALESCE(SUM(CASE WHEN "claimStatus" = 'CARRIER_COMPENSATED' THEN "carrierCompensation" ELSE 0 END), 0) AS carrier_total,
          COALESCE(SUM(CASE WHEN "claimStatus" = 'CUSTOMER_COMPENSATED' THEN "customerCompensation" ELSE 0 END), 0) AS customer_total
        FROM "ClaimOrder"
        WHERE "detectedDate" >= ${monthlyWindowFrom}
        GROUP BY date_trunc('month', "detectedDate")
        ORDER BY date_trunc('month', "detectedDate") ASC
      `,
    );

    const monthlyMap = new Map(
      monthlyRows.map((row) => [
        row.month,
        {
          carrier: Number(row.carrier_total || 0),
          customer: Number(row.customer_total || 0),
        },
      ]),
    );

    const monthlyData = Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const monthLabel = `${String(monthDate.getMonth() + 1).padStart(2, "0")}/${monthDate.getFullYear()}`;
      const monthTotals = monthlyMap.get(monthLabel);

      return {
        month: monthLabel,
        carrier: monthTotals?.carrier || 0,
        customer: monthTotals?.customer || 0,
      };
    });

    const issueDistribution = Object.entries(ISSUE_TYPE_CONFIG).map(([type, config]) => {
      const found = issueTypeBreakdown.find((group) => group.issueType === type);
      return {
        type,
        label: config.label,
        count: found?._count || 0,
        color: config.color,
      };
    });

    return NextResponse.json({ summary, shops, monthlyData, issueDistribution });
  } catch (error) {
    logger.error("GET /api/claims/compensation", "Error", error);
    return NextResponse.json({ error: "Lỗi truy vấn" }, { status: 500 });
  }
}
