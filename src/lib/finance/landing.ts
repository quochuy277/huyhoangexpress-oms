import { DeliveryStatus } from "@prisma/client";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";

import { prisma } from "@/lib/prisma";

export interface FinanceCategoryOption {
  id: string;
  name: string;
  isSystem: boolean;
  sortOrder: number;
}

export interface FinanceBudgetItem {
  categoryId: string;
  categoryName: string;
  budgetAmount: number;
  spent: number;
  remaining: number;
  ratio: number;
}

export interface FinanceBudgetSummary {
  budgets: FinanceBudgetItem[];
  month: string;
  hasAlert: boolean;
}

export interface FinanceOverviewData {
  summary: {
    totalRevenue: number;
    totalCarrierFee: number;
    grossProfit: number;
    totalCod: number;
    orderCount: number;
    margin: number;
    revenueChange: number;
  };
  trendData: Array<{ month: string; profit: number; totalCost: number }>;
  carrierDistribution: Array<{ name: string; revenue: number; fee: number; count: number }>;
  shopDistribution: Array<{ name: string; revenue: number }>;
}

export interface FinancePnlData {
  revenue: {
    totalFeeFromShop: number;
    totalCarrierFee: number;
    netRevenue: number;
  };
  claims: {
    customerComp: number;
    carrierComp: number;
    claimDiff: number;
  };
  grossProfit: number;
  operatingExpenses: Array<{ name: string; total: number }>;
  totalOperatingExpenses: number;
  netProfit: number;
  month: string;
}

export interface FinanceLandingData extends FinanceOverviewData {
  pnl: FinancePnlData;
  categories: FinanceCategoryOption[];
  budgets: FinanceBudgetSummary;
}

export interface DateRange {
  from: Date;
  to: Date;
}

const REVENUE_STATUSES: DeliveryStatus[] = [
  "RECONCILED",
  "RETURNED_FULL",
  "RETURNED_PARTIAL",
] as DeliveryStatus[];

function formatMonthKey(date: Date) {
  return format(date, "yyyy-MM");
}

function isWholeMonthRange(from: Date, to: Date) {
  return (
    from.getDate() === 1 &&
    from.getFullYear() === to.getFullYear() &&
    from.getMonth() === to.getMonth() &&
    endOfMonth(from).getDate() === to.getDate()
  );
}

export function getCurrentMonthRange(): DateRange {
  const now = new Date();
  return {
    from: startOfMonth(now),
    to: endOfMonth(now),
  };
}

export function resolvePnlRange(fromParam?: string | null, toParam?: string | null): DateRange {
  if (fromParam && toParam) {
    const from = new Date(fromParam);
    const to = new Date(toParam);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  return getCurrentMonthRange();
}

export function buildPnlLabel(from: Date, to: Date) {
  if (isWholeMonthRange(from, to)) {
    return formatMonthKey(from);
  }

  return `${format(from, "yyyy-MM-dd")} → ${format(to, "yyyy-MM-dd")}`;
}

export async function getFinanceLandingCategories(): Promise<FinanceCategoryOption[]> {
  const categories = await prisma.expenseCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      isSystem: true,
      sortOrder: true,
    },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    isSystem: category.isSystem,
    sortOrder: category.sortOrder,
  }));
}

export async function getFinanceBudgetSummary(
  month: string,
  categories?: FinanceCategoryOption[],
): Promise<FinanceBudgetSummary> {
  const [year, monthIndex] = month.split("-").map(Number);
  const monthDate = new Date(year, monthIndex - 1, 1);
  const monthEnd = endOfMonth(monthDate);

  const [categoryList, budgets, spentGroups] = await Promise.all([
    categories ? Promise.resolve(categories) : getFinanceLandingCategories(),
    prisma.monthlyBudget.findMany({
      where: { month: monthDate },
      select: { categoryId: true, budgetAmount: true },
    }),
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: { date: { gte: monthDate, lte: monthEnd } },
      _sum: { amount: true },
    }),
  ]);

  const spentMap = new Map(
    spentGroups.map((item) => [item.categoryId, Number(item._sum.amount ?? 0)]),
  );
  const budgetMap = new Map(
    budgets.map((item) => [item.categoryId, Number(item.budgetAmount)]),
  );

  const result = categoryList.map((category) => {
    const budgetAmount = budgetMap.get(category.id) ?? 0;
    const spent = spentMap.get(category.id) ?? 0;

    return {
      categoryId: category.id,
      categoryName: category.name,
      budgetAmount,
      spent,
      remaining: budgetAmount - spent,
      ratio: budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0,
    };
  });

  return {
    budgets: result,
    month,
    hasAlert: result.some((item) => item.budgetAmount > 0 && item.ratio > 90),
  };
}

export async function getFinancePnlData(
  range: DateRange,
  label = buildPnlLabel(range.from, range.to),
  categories?: FinanceCategoryOption[],
): Promise<FinancePnlData> {
  const [orderAgg, claimAgg, expenseGroups, categoryList] = await Promise.all([
    prisma.order.aggregate({
      where: {
        deliveryStatus: { in: REVENUE_STATUSES },
        createdTime: { gte: range.from, lte: range.to },
      },
      _sum: { totalFee: true, carrierFee: true },
    }),
    prisma.claimOrder.aggregate({
      where: { detectedDate: { gte: range.from, lte: range.to } },
      _sum: { customerCompensation: true, carrierCompensation: true },
    }),
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: { date: { gte: range.from, lte: range.to } },
      _sum: { amount: true },
    }),
    categories ? Promise.resolve(categories) : getFinanceLandingCategories(),
  ]);

  const totalFeeFromShop = Number(orderAgg._sum.totalFee ?? 0);
  const totalCarrierFee = Number(orderAgg._sum.carrierFee ?? 0);
  const netRevenue = totalFeeFromShop - totalCarrierFee;
  const customerComp = Number(claimAgg._sum.customerCompensation ?? 0);
  const carrierComp = Number(claimAgg._sum.carrierCompensation ?? 0);
  const claimDiff = carrierComp - customerComp;
  const grossProfit = netRevenue + claimDiff;

  const categoryMap = new Map(categoryList.map((item) => [item.id, item]));
  const operatingExpenses = expenseGroups
    .map((group) => {
      const category = categoryMap.get(group.categoryId);

      return {
        name: category?.name || "Khác",
        total: Number(group._sum.amount ?? 0),
        sortOrder: category?.sortOrder ?? 999,
      };
    })
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map(({ sortOrder: _sortOrder, ...item }) => item);

  const totalOperatingExpenses = operatingExpenses.reduce(
    (sum, item) => sum + item.total,
    0,
  );

  return {
    revenue: { totalFeeFromShop, totalCarrierFee, netRevenue },
    claims: { customerComp, carrierComp, claimDiff },
    grossProfit,
    operatingExpenses,
    totalOperatingExpenses,
    netProfit: grossProfit - totalOperatingExpenses,
    month: label,
  };
}

export async function getFinanceOverviewData(range: DateRange): Promise<FinanceOverviewData> {
  const revenueWhere = {
    deliveryStatus: { in: REVENUE_STATUSES },
    createdTime: { gte: range.from, lte: range.to },
  };

  const [summaryAgg, orderCount, codAgg, prevAgg, trendOrderRows, trendClaimRows, trendExpenseRows, carrierGroups, shopGroups] =
    await Promise.all([
      prisma.order.aggregate({
        where: revenueWhere,
        _sum: { totalFee: true, carrierFee: true },
      }),
      prisma.order.count({ where: revenueWhere }),
      prisma.order.aggregate({
        where: { ...revenueWhere, codAmount: { gt: 0 } },
        _sum: { codAmount: true },
      }),
      (async () => {
        const duration = range.to.getTime() - range.from.getTime();
        const prevFrom = new Date(range.from.getTime() - duration);
        const prevTo = new Date(range.from.getTime() - 1);

        return prisma.order.aggregate({
          where: {
            deliveryStatus: { in: REVENUE_STATUSES },
            createdTime: { gte: prevFrom, lte: prevTo },
          },
          _sum: { totalFee: true, carrierFee: true },
        });
      })(),
      (async () => {
        const trendFrom = startOfMonth(subMonths(new Date(), 5));
        const trendTo = endOfMonth(new Date());
        return prisma.$queryRaw<Array<{ month: string; revenue: number; carrier_cost: number }>>`
          SELECT TO_CHAR("createdTime", 'MM/YYYY') as month,
                 COALESCE(SUM("totalFee"), 0)::float8 as revenue,
                 COALESCE(SUM("carrierFee"), 0)::float8 as carrier_cost
          FROM "Order"
          WHERE "deliveryStatus" IN ('RECONCILED','RETURNED_FULL','RETURNED_PARTIAL')
            AND "createdTime" >= ${trendFrom} AND "createdTime" <= ${trendTo}
          GROUP BY TO_CHAR("createdTime", 'MM/YYYY')
        `;
      })(),
      (async () => {
        const trendFrom = startOfMonth(subMonths(new Date(), 5));
        const trendTo = endOfMonth(new Date());
        return prisma.$queryRaw<Array<{ month: string; customer_comp: number; carrier_comp: number }>>`
          SELECT TO_CHAR("detectedDate", 'MM/YYYY') as month,
                 COALESCE(SUM("customerCompensation"), 0)::float8 as customer_comp,
                 COALESCE(SUM("carrierCompensation"), 0)::float8 as carrier_comp
          FROM "ClaimOrder"
          WHERE "detectedDate" >= ${trendFrom} AND "detectedDate" <= ${trendTo}
          GROUP BY TO_CHAR("detectedDate", 'MM/YYYY')
        `;
      })(),
      (async () => {
        const trendFrom = startOfMonth(subMonths(new Date(), 5));
        const trendTo = endOfMonth(new Date());
        return prisma.$queryRaw<Array<{ month: string; total: number }>>`
          SELECT TO_CHAR("date", 'MM/YYYY') as month,
                 COALESCE(SUM("amount"), 0)::float8 as total
          FROM "Expense"
          WHERE "date" >= ${trendFrom} AND "date" <= ${trendTo}
          GROUP BY TO_CHAR("date", 'MM/YYYY')
        `;
      })(),
      prisma.order.groupBy({
        by: ["carrierName"],
        where: revenueWhere,
        _sum: { totalFee: true, carrierFee: true },
        _count: true,
      }),
      prisma.order.groupBy({
        by: ["shopName"],
        where: revenueWhere,
        _sum: { totalFee: true, carrierFee: true },
      }),
    ]);

  const totalRevenue = Number(summaryAgg._sum.totalFee ?? 0);
  const totalCarrierFee = Number(summaryAgg._sum.carrierFee ?? 0);
  const grossProfit = totalRevenue - totalCarrierFee;
  const totalCod = Number(codAgg._sum.codAmount ?? 0);
  const margin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 1000) / 10 : 0;
  const prevGrossProfit =
    Number(prevAgg._sum.totalFee ?? 0) - Number(prevAgg._sum.carrierFee ?? 0);
  const revenueChange =
    prevGrossProfit > 0
      ? Math.round(((grossProfit - prevGrossProfit) / prevGrossProfit) * 100)
      : 0;

  const orderMap = new Map(trendOrderRows.map((row) => [row.month, row]));
  const claimMap = new Map(trendClaimRows.map((row) => [row.month, row]));
  const expenseMap = new Map(trendExpenseRows.map((row) => [row.month, row]));

  const trendData = [];
  for (let index = 5; index >= 0; index -= 1) {
    const monthDate = subMonths(new Date(), index);
    const key = format(monthDate, "MM/yyyy");
    const orderRow = orderMap.get(key);
    const claimRow = claimMap.get(key);
    const expenseRow = expenseMap.get(key);
    const profit = orderRow ? orderRow.revenue - orderRow.carrier_cost : 0;
    const claimNetCost = claimRow ? claimRow.customer_comp - claimRow.carrier_comp : 0;
    const expenseTotal = expenseRow ? expenseRow.total : 0;

    trendData.push({
      month: key,
      profit,
      totalCost: Math.max(0, claimNetCost) + expenseTotal,
    });
  }

  return {
    summary: {
      totalRevenue,
      totalCarrierFee,
      grossProfit,
      totalCod,
      orderCount,
      margin,
      revenueChange,
    },
    trendData,
    carrierDistribution: carrierGroups
      .map((group) => ({
        name: group.carrierName || "Khác",
        revenue: Number(group._sum.totalFee ?? 0),
        fee: Number(group._sum.carrierFee ?? 0),
        count: group._count,
      }))
      .sort((left, right) => right.revenue - left.revenue),
    shopDistribution: shopGroups
      .map((group) => ({
        name: group.shopName || "Khác",
        revenue: Number(group._sum.totalFee ?? 0) - Number(group._sum.carrierFee ?? 0),
      }))
      .sort((left, right) => right.revenue - left.revenue)
      .slice(0, 15),
  };
}

export async function getFinanceLandingData(options: {
  overviewRange: DateRange;
  pnlRange: DateRange;
}): Promise<FinanceLandingData> {
  const categories = await getFinanceLandingCategories();
  const [overview, pnl, budgets] = await Promise.all([
    getFinanceOverviewData(options.overviewRange),
    getFinancePnlData(options.pnlRange, undefined, categories),
    getFinanceBudgetSummary(formatMonthKey(options.pnlRange.from), categories),
  ]);

  return {
    ...overview,
    pnl,
    categories,
    budgets,
  };
}
