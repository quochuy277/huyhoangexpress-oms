"use client";

import { memo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import type { FinanceOverviewData } from "@/lib/finance/landing";

/**
 * Trend + distribution charts for the finance OverviewTab.
 *
 * Sprint 2 (2026-04) extraction: these three Recharts trees are expensive to
 * reconcile — each ResponsiveContainer measures its parent on every render
 * and Recharts rebuilds layout from scratch if we don't memoize. Moving them
 * into a memoized component means they only re-render when the underlying
 * data arrays or the bar-height changes, not on every dialog/input keystroke
 * in the parent.
 */
const COLORS = ["#2563eb", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#ec4899"];
const PANEL_CLASS = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5";

type TrendPoint = FinanceOverviewData["trendData"][number];
type CarrierPoint = FinanceOverviewData["carrierDistribution"][number];
type ShopPoint = FinanceOverviewData["shopDistribution"][number];

interface OverviewChartsProps {
  trendData: TrendPoint[];
  carrierDistribution: CarrierPoint[];
  shopDistribution: ShopPoint[];
  shopBarHeight: number;
  formatCurrency: (n: number) => string;
}

function OverviewChartsInner({
  trendData,
  carrierDistribution,
  shopDistribution,
  shopBarHeight,
  formatCurrency,
}: OverviewChartsProps) {
  // Recharts ships its Formatter type as `ValueType | undefined`, which is
  // hard to narrow cleanly without pulling in its internal generics. `any` is
  // the idiomatic Recharts escape hatch (the library README uses it too), and
  // we always feed numeric `revenue`/`profit` values, so the runtime is safe.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tooltipFormatter = (v: any) => formatCurrency(Number(v));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const axisFormatter = (v: any) => `${Math.round(Number(v) / 1e6)}M`;

  return (
    <>
      {trendData.length > 0 && (
        <div className={PANEL_CLASS}>
          <h3 className="mb-4 text-base font-bold text-slate-800">📈 Xu hướng doanh thu</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={axisFormatter} />
              <Tooltip formatter={tooltipFormatter} />
              <Area type="monotone" dataKey="profit" stroke="#2563eb" fill="#dbeafe" name="Doanh thu ròng" />
              <Area type="monotone" dataKey="totalCost" stroke="#ef4444" fill="#fee2e2" name="Tổng chi phí" />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {carrierDistribution.length > 0 && (
          <div className={PANEL_CLASS}>
            <h3 className="mb-3 text-sm font-bold text-slate-800 sm:text-[15px]">Doanh thu theo Đối tác</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={carrierDistribution}
                  dataKey="revenue"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  labelLine={false}
                >
                  {carrierDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={tooltipFormatter} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {shopDistribution.length > 0 && (
          <div className={PANEL_CLASS}>
            <h3 className="mb-3 text-sm font-bold text-slate-800 sm:text-[15px]">Doanh thu theo Cửa hàng</h3>
            <ResponsiveContainer width="100%" height={shopBarHeight}>
              <BarChart data={shopDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={11} tickFormatter={axisFormatter} />
                <YAxis type="category" dataKey="name" fontSize={11} width={120} />
                <Tooltip formatter={tooltipFormatter} />
                <Bar dataKey="revenue" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </>
  );
}

export const OverviewCharts = memo(OverviewChartsInner);
