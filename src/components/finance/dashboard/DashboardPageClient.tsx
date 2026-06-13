// src/components/finance/dashboard/DashboardPageClient.tsx
"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { OverviewSummaryCards } from "@/components/finance/OverviewSummaryCards";
import { OverviewCharts } from "@/components/finance/OverviewCharts";
import { FinancePanel } from "@/components/finance/shared/FinancePanel";
import { MoneyText } from "@/components/finance/shared/MoneyText";
import { formatVnd } from "@/lib/finance/format";
import type { FinanceLandingData } from "@/lib/finance/landing";

const INITIAL_AT = Date.now();

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Lỗi hệ thống");
  return data as T;
}

export default function DashboardPageClient({ initialData }: { initialData: FinanceLandingData }) {
  const query = useQuery({
    queryKey: ["finance-landing", "period=month"],
    queryFn: () => fetchJson<FinanceLandingData>(`/api/finance/landing?period=month`),
    initialData,
    initialDataUpdatedAt: INITIAL_AT,
    placeholderData: (prev) => prev,
  });

  const data = query.data ?? initialData;
  const { summary, trendData, carrierDistribution, shopDistribution, pnl } = data;
  const shopBarHeight = Math.max(220, shopDistribution.length * 28);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-3 py-4 sm:px-4 sm:py-5 sm:space-y-6 md:px-6 md:py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">📊 Bảng điều khiển Tài chính</h1>
        <p className="mt-1 text-sm text-slate-500">Tổng quan sức khỏe tài chính tháng này.</p>
      </div>

      <OverviewSummaryCards summary={summary} pnl={pnl} formatCurrency={formatVnd} />
      <OverviewCharts trendData={trendData} carrierDistribution={carrierDistribution} shopDistribution={shopDistribution} shopBarHeight={shopBarHeight} formatCurrency={formatVnd} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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

        <FinancePanel title="🔗 Truy cập nhanh">
          <div className="space-y-2 text-sm">
            <Link href="/finance/analysis?view=shop" className="block rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">🏪 Phân tích cửa hàng →</Link>
            <Link href="/finance/analysis?view=carrier" className="block rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">🚚 So sánh đối tác →</Link>
            <Link href="/finance/cashbook" className="block rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">🏦 Sổ quỹ →</Link>
            <Link href="/finance/expenses" className="block rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">💸 Chi phí & Ngân sách →</Link>
          </div>
        </FinancePanel>
      </div>
    </div>
  );
}
