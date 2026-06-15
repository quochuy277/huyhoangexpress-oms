import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getFinancePnlData, type DateRange, type FinancePnlData } from "@/lib/finance/landing";
import { getFinanceTargets, type FinanceTargets } from "@/lib/finance/targets";
import { getPreviousRange } from "@/lib/finance/compare";

export interface FinanceKpi {
  netRevenue: number;
  netProfit: number;
  margin: number;
}

export interface FinanceDashboardData {
  current: FinanceKpi;
  previous: FinanceKpi;
  cashBalance: { amount: number; date: string | null };
  targets: FinanceTargets;
}

function toKpi(pnl: FinancePnlData): FinanceKpi {
  const netRevenue = pnl.revenue.netRevenue;
  const totalFee = pnl.revenue.totalFeeFromShop;
  const margin = totalFee > 0 ? Math.round((netRevenue / totalFee) * 1000) / 10 : 0;
  return { netRevenue, netProfit: pnl.netProfit, margin };
}

export async function getFinanceDashboardData(range: DateRange): Promise<FinanceDashboardData> {
  const prev = getPreviousRange(range);
  const [currentPnl, previousPnl, latest, targets] = await Promise.all([
    getFinancePnlData(range),
    getFinancePnlData(prev),
    prisma.cashbookEntry.findFirst({
      where: { transactionTime: { lte: range.to } },
      orderBy: { transactionTime: "desc" },
      select: { balance: true, transactionTime: true },
    }),
    getFinanceTargets(format(range.from, "yyyy-MM")),
  ]);

  return {
    current: toKpi(currentPnl),
    previous: toKpi(previousPnl),
    cashBalance: {
      amount: latest ? Number(latest.balance) : 0,
      date: latest?.transactionTime ? latest.transactionTime.toISOString() : null,
    },
    targets,
  };
}
