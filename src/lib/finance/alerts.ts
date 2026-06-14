import { format, subDays } from "date-fns";
import { DeliveryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatVnd } from "@/lib/finance/format";
import { getPreviousRange } from "@/lib/finance/compare";
import { getFinanceBudgetSummary, type DateRange, type FinanceBudgetSummary } from "@/lib/finance/landing";

export type AlertSeverity = "critical" | "warning";
export type AlertCategory = "budget" | "shop_decline" | "negative_revenue" | "carrier_margin";
export interface FinanceAlert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  detail: string;
  href: string;
}

const REVENUE_STATUSES: DeliveryStatus[] = ["RECONCILED", "RETURNED_FULL", "RETURNED_PARTIAL"] as DeliveryStatus[];

export function buildBudgetAlerts(summary: FinanceBudgetSummary): FinanceAlert[] {
  return summary.budgets
    .filter((b) => b.budgetAmount > 0 && b.ratio > 90)
    .map((b) => ({
      id: `budget:${b.categoryId}`,
      severity: b.ratio > 100 ? "critical" : "warning",
      category: "budget" as const,
      title: `Ngân sách "${b.categoryName}" đã dùng ${b.ratio}%`,
      detail: `Đã chi ${formatVnd(b.spent)} / ${formatVnd(b.budgetAmount)}`,
      href: "/finance/expenses",
    }));
}

async function shopDeclineAlerts(): Promise<FinanceAlert[]> {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const aStart = subDays(today, 14);
  const bStart = subDays(today, 28);
  const bEnd = subDays(today, 15);
  const [recent, previous] = await Promise.all([
    prisma.order.groupBy({ by: ["shopName"], where: { createdTime: { gte: aStart, lte: today } }, _count: true }),
    prisma.order.groupBy({ by: ["shopName"], where: { createdTime: { gte: bStart, lte: bEnd } }, _count: true }),
  ]);
  const recentMap = new Map(recent.map((r) => [r.shopName ?? "Không rõ", r._count]));
  const alerts: FinanceAlert[] = [];
  for (const p of previous) {
    const shop = p.shopName ?? "Không rõ";
    if (p._count < 5) continue;
    const rec = recentMap.get(shop) ?? 0;
    const change = Math.round(((rec - p._count) / p._count) * 100);
    if (change <= -30) {
      alerts.push({
        id: `shop:${shop}`,
        severity: change <= -50 ? "critical" : "warning",
        category: "shop_decline",
        title: `Cửa hàng "${shop}" giảm đơn ${Math.abs(change)}%`,
        detail: `2 tuần trước ${p._count} đơn → 2 tuần gần ${rec} đơn`,
        href: "/finance/analysis?view=shop",
      });
    }
  }
  return alerts;
}

async function negativeRevenueAlert(range: DateRange): Promise<FinanceAlert[]> {
  const agg = await prisma.order.aggregate({
    where: { revenue: { lt: 0 }, createdTime: { gte: range.from, lte: range.to } },
    _sum: { revenue: true },
    _count: true,
  });
  if (agg._count === 0) return [];
  return [{
    id: "negative",
    severity: "warning",
    category: "negative_revenue",
    title: `${agg._count} đơn doanh thu âm trong kỳ`,
    detail: `Tổng lỗ ${formatVnd(Number(agg._sum.revenue ?? 0))}`,
    href: "/finance/analysis?view=negative",
  }];
}

async function carrierMarginAlerts(range: DateRange): Promise<FinanceAlert[]> {
  const prev = getPreviousRange(range);
  const where = (r: DateRange) => ({ deliveryStatus: { in: REVENUE_STATUSES }, createdTime: { gte: r.from, lte: r.to } });
  const [cur, prv] = await Promise.all([
    prisma.order.groupBy({ by: ["carrierName"], where: where(range), _sum: { totalFee: true, carrierFee: true }, _count: true }),
    prisma.order.groupBy({ by: ["carrierName"], where: where(prev), _sum: { totalFee: true, carrierFee: true } }),
  ]);
  const marginOf = (fee: number, carrier: number) => (fee > 0 ? Math.round(((fee - carrier) / fee) * 1000) / 10 : 0);
  const prevMap = new Map(prv.map((c) => [c.carrierName ?? "Khác", marginOf(Number(c._sum.totalFee ?? 0), Number(c._sum.carrierFee ?? 0))]));
  const alerts: FinanceAlert[] = [];
  for (const c of cur) {
    if (c._count < 20) continue;
    const carrier = c.carrierName ?? "Khác";
    const curMargin = marginOf(Number(c._sum.totalFee ?? 0), Number(c._sum.carrierFee ?? 0));
    const prevMargin = prevMap.get(carrier);
    if (prevMargin === undefined) continue;
    if (prevMargin - curMargin >= 5 && curMargin < 25) {
      alerts.push({
        id: `carrier:${carrier}`,
        severity: "warning",
        category: "carrier_margin",
        title: `Margin đối tác "${carrier}" giảm còn ${curMargin}%`,
        detail: `Kỳ trước ${prevMargin}% → kỳ này ${curMargin}%`,
        href: "/finance/analysis?view=carrier",
      });
    }
  }
  return alerts;
}

export async function getFinanceAlerts(range: DateRange): Promise<FinanceAlert[]> {
  const budgetSummary = await getFinanceBudgetSummary(format(range.from, "yyyy-MM"));
  const [shop, negative, carrier] = await Promise.all([
    shopDeclineAlerts(),
    negativeRevenueAlert(range),
    carrierMarginAlerts(range),
  ]);
  const all = [...buildBudgetAlerts(budgetSummary), ...shop, ...negative, ...carrier];
  const order: Record<AlertSeverity, number> = { critical: 0, warning: 1 };
  return all.sort((a, b) => order[a.severity] - order[b.severity]);
}
