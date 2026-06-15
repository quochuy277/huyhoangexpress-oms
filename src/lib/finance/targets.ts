import { prisma } from "@/lib/prisma";

export interface FinanceTargets {
  netRevenue: number | null;
  netProfit: number | null;
}

type TargetRow = { metric: string; targetAmount: unknown };

export function mapTargetRows(rows: TargetRow[]): FinanceTargets {
  const find = (metric: string) => {
    const row = rows.find((r) => r.metric === metric);
    return row ? Number(row.targetAmount) : null;
  };
  return { netRevenue: find("NET_REVENUE"), netProfit: find("NET_PROFIT") };
}

function monthToDate(month: string): Date {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1);
}

export async function getFinanceTargets(month: string): Promise<FinanceTargets> {
  const rows = await prisma.financeTarget.findMany({
    where: { month: monthToDate(month) },
    select: { metric: true, targetAmount: true },
  });
  return mapTargetRows(rows);
}

export async function setFinanceTargets(month: string, targets: FinanceTargets, createdBy: string): Promise<void> {
  const monthDate = monthToDate(month);
  const entries: Array<[string, number | null]> = [
    ["NET_REVENUE", targets.netRevenue],
    ["NET_PROFIT", targets.netProfit],
  ];
  for (const [metric, amount] of entries) {
    if (amount && amount > 0) {
      await prisma.financeTarget.upsert({
        where: { month_metric: { month: monthDate, metric } },
        create: { month: monthDate, metric, targetAmount: amount, createdBy },
        update: { targetAmount: amount },
      });
    } else {
      await prisma.financeTarget.deleteMany({ where: { month: monthDate, metric } });
    }
  }
}
