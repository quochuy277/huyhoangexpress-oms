"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { OverviewCharts } from "@/components/finance/OverviewCharts";
import { FinancePanel } from "@/components/finance/shared/FinancePanel";
import { MoneyText } from "@/components/finance/shared/MoneyText";
import { KpiCard } from "@/components/finance/shared/KpiCard";
import { PeriodFilter } from "@/components/finance/shared/PeriodFilter";
import { useFinancePeriod } from "@/lib/finance/use-finance-period";
import { buildPeriodSearch } from "@/lib/finance/period-url";
import { formatVnd } from "@/lib/finance/format";
import { computeDeltaPercent, computeTargetPercent } from "@/lib/finance/compare";
import { AlertCenter } from "@/components/finance/shared/AlertCenter";
import type { FinanceLandingData } from "@/lib/finance/landing";
import type { FinanceDashboardData } from "@/lib/finance/dashboard";
import type { FinanceAlert } from "@/lib/finance/alerts";

const INITIAL_AT = Date.now();

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Lỗi hệ thống");
  return data as T;
}

export default function DashboardPageClient({ initialData }: { initialData: FinanceLandingData }) {
  const { period, from, to, setPeriod, setCustomFrom, setCustomTo } = useFinancePeriod();
  const search = buildPeriodSearch(period, from, to);
  const isMonthDefault = period === "month";

  const landingQuery = useQuery({
    queryKey: ["finance-landing", search],
    queryFn: () => fetchJson<FinanceLandingData>(`/api/finance/landing?${search}`),
    initialData: isMonthDefault ? initialData : undefined,
    initialDataUpdatedAt: isMonthDefault ? INITIAL_AT : undefined,
    placeholderData: (prev) => prev,
  });
  const dashboardQuery = useQuery({
    queryKey: ["finance-dashboard", search],
    queryFn: () => fetchJson<FinanceDashboardData>(`/api/finance/dashboard?${search}`),
    placeholderData: (prev) => prev,
  });
  const alertsQuery = useQuery({
    queryKey: ["finance-alerts", search],
    queryFn: () => fetchJson<{ alerts: FinanceAlert[] }>(`/api/finance/alerts?${search}`),
    placeholderData: (prev) => prev,
  });

  const data = landingQuery.data ?? initialData;
  const { trendData, carrierDistribution, shopDistribution, pnl } = data;
  const shopBarHeight = Math.max(220, shopDistribution.length * 28);
  const dash = dashboardQuery.data;
  const alerts = alertsQuery.data?.alerts ?? [];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-3 py-4 sm:px-4 sm:py-5 sm:space-y-6 md:px-6 md:py-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">📊 Bảng điều khiển Tài chính</h1>
          <p className="mt-1 text-sm text-slate-500">Tổng quan sức khỏe tài chính theo kỳ.</p>
        </div>
        <PeriodFilter
          period={period}
          customFrom={from}
          customTo={to}
          onPeriodChange={setPeriod}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
        />
      </div>

      {dash && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Lợi nhuận ròng"
            tone="green"
            value={formatVnd(dash.current.netProfit)}
            deltaPercent={computeDeltaPercent(dash.current.netProfit, dash.previous.netProfit)}
            deltaSuffix="so kỳ trước"
            targetPercent={computeTargetPercent(dash.current.netProfit, dash.targets.netProfit)}
            targetLabel={dash.targets.netProfit ? `mục tiêu ${formatVnd(dash.targets.netProfit)}` : undefined}
          />
          <KpiCard
            label="Doanh thu ròng"
            tone="blue"
            value={formatVnd(dash.current.netRevenue)}
            deltaPercent={computeDeltaPercent(dash.current.netRevenue, dash.previous.netRevenue)}
            deltaSuffix="so kỳ trước"
            targetPercent={computeTargetPercent(dash.current.netRevenue, dash.targets.netRevenue)}
            targetLabel={dash.targets.netRevenue ? `mục tiêu ${formatVnd(dash.targets.netRevenue)}` : undefined}
          />
          <KpiCard
            label="Margin trung bình"
            tone="amber"
            value={`${dash.current.margin}%`}
            deltaPercent={computeDeltaPercent(dash.current.margin, dash.previous.margin)}
            deltaSuffix="điểm so kỳ trước"
          />
          <KpiCard
            label="Số dư quỹ cuối kỳ"
            tone="violet"
            value={formatVnd(dash.cashBalance.amount)}
            deltaSuffix={dash.cashBalance.date ? `cập nhật ${new Date(dash.cashBalance.date).toLocaleDateString("vi-VN")}` : "từ sổ quỹ"}
          />
        </div>
      )}

      <OverviewCharts trendData={trendData} carrierDistribution={carrierDistribution} shopDistribution={shopDistribution} shopBarHeight={shopBarHeight} formatCurrency={formatVnd} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr,1fr]">
        <AlertCenter alerts={alerts} />
        <FinancePanel title="📄 P&L tóm tắt">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Doanh thu ròng</span><MoneyText value={pnl.revenue.netRevenue} className="font-semibold text-blue-600" /></div>
            <div className="flex justify-between"><span className="text-slate-500">Chênh lệch đền bù</span><MoneyText value={pnl.claims.claimDiff} colored showPlus className="font-semibold" /></div>
            <div className="flex justify-between border-t border-slate-100 pt-2"><span className="text-slate-500">Lợi nhuận gộp</span><MoneyText value={pnl.grossProfit} className="font-semibold" /></div>
            <div className="flex justify-between"><span className="text-slate-500">Chi phí vận hành</span><MoneyText value={-pnl.totalOperatingExpenses} className="font-semibold text-red-500" /></div>
            <div className="flex justify-between border-t-2 border-slate-800 pt-2 text-base font-bold"><span>Lợi nhuận ròng</span><MoneyText value={pnl.netProfit} colored /></div>
          </div>
          <Link href="/finance/pnl" className="mt-3 block text-right text-sm font-bold text-blue-600">Xem báo cáo P&L đầy đủ →</Link>
        </FinancePanel>
      </div>

      <FinancePanel title="🔗 Truy cập nhanh">
        <div className="space-y-2 text-sm">
          <Link href="/finance/analysis?view=shop" className="block rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">🏪 Phân tích cửa hàng →</Link>
          <Link href="/finance/analysis?view=carrier" className="block rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">🚚 So sánh đối tác →</Link>
          <Link href="/finance/cashbook" className="block rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">🏦 Sổ quỹ →</Link>
          <Link href="/finance/expenses" className="block rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">💸 Chi phí & Ngân sách →</Link>
        </div>
      </FinancePanel>
    </div>
  );
}
