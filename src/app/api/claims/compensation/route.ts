import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — Compensation summary (cards + shop table + chart data)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  // Check canViewFinancePage permission
  const user = session.user as any;
  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    // Check permission group
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

  // Calculate date range
  const now = new Date();
  let dateFrom: Date;
  switch (period) {
    case "last_month": {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      dateFrom = d;
      break;
    }
    case "quarter": {
      const quarter = Math.floor(now.getMonth() / 3);
      dateFrom = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    }
    case "half":
      dateFrom = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      break;
    case "year":
      dateFrom = new Date(now.getFullYear(), 0, 1);
      break;
    case "all":
      dateFrom = new Date(2020, 0, 1);
      break;
    default: // month
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const dateFilter = period === "all" ? {} : { detectedDate: { gte: dateFrom } };

  try {
    // Summary cards
    const claims = await prisma.claimOrder.findMany({
      where: dateFilter,
      include: { order: { select: { shopName: true, requestCode: true } } },
    });

    const carrierCompClaims = claims.filter(c => c.claimStatus === "CARRIER_COMPENSATED");
    const customerCompClaims = claims.filter(c => c.claimStatus === "CUSTOMER_COMPENSATED");
    const pendingCustomer = claims.filter(
      c => ["CARRIER_COMPENSATED", "CARRIER_REJECTED"].includes(c.claimStatus)
        && !["CUSTOMER_COMPENSATED", "CUSTOMER_REJECTED"].includes(c.claimStatus)
        && !c.isCompleted
    );

    const totalCarrierComp = carrierCompClaims.reduce((sum, c) => sum + Number(c.carrierCompensation), 0);
    const totalCustomerComp = customerCompClaims.reduce((sum, c) => sum + Number(c.customerCompensation), 0);

    const summary = {
      carrierTotal: totalCarrierComp,
      carrierCount: carrierCompClaims.length,
      customerTotal: totalCustomerComp,
      customerCount: customerCompClaims.length,
      difference: totalCarrierComp - totalCustomerComp,
      pendingCount: pendingCustomer.length,
    };

    // Shop breakdown
    const shopMap = new Map<string, {
      shopName: string;
      totalClaims: number;
      processing: number;
      compensated: number;
      rejected: number;
      totalPaid: number;
      totalPending: number;
    }>();

    for (const c of claims) {
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

    // Monthly chart data (last 6 months)
    const monthlyData: { month: string; carrier: number; customer: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthStr = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

      const monthClaims = claims.filter(c => {
        const date = new Date(c.detectedDate);
        return date >= d && date <= monthEnd;
      });

      monthlyData.push({
        month: monthStr,
        carrier: monthClaims.filter(c => c.claimStatus === "CARRIER_COMPENSATED").reduce((s, c) => s + Number(c.carrierCompensation), 0),
        customer: monthClaims.filter(c => c.claimStatus === "CUSTOMER_COMPENSATED").reduce((s, c) => s + Number(c.customerCompensation), 0),
      });
    }

    // Issue type distribution
    const issueDistribution = [
      { type: "SLOW_JOURNEY", label: "Hành trình chậm", count: 0, color: "#3b82f6" },
      { type: "SUSPICIOUS", label: "Nghi ngờ", count: 0, color: "#f97316" },
      { type: "LOST", label: "Thất lạc", count: 0, color: "#ef4444" },
      { type: "DAMAGED", label: "Hư hỏng", count: 0, color: "#8b5cf6" },
      { type: "OTHER", label: "Vấn đề khác", count: 0, color: "#6b7280" },
    ];
    for (const c of claims) {
      const item = issueDistribution.find(d => d.type === c.issueType);
      if (item) item.count++;
    }

    return NextResponse.json({
      summary,
      shops,
      monthlyData,
      issueDistribution,
    });
  } catch (e) {
    console.error("Compensation error:", e);
    return NextResponse.json({ error: "Lỗi truy vấn" }, { status: 500 });
  }
}
