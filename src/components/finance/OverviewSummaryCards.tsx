"use client";

import { memo } from "react";
import type { FinanceOverviewData, FinancePnlData } from "@/lib/finance/landing";

/**
 * Summary cards row for the finance OverviewTab.
 *
 * Sprint 2 (2026-04) extraction: previously this grid lived inline in
 * OverviewTab.tsx (~45 lines of JSX + formatter). Pulling it out + wrapping
 * in `memo` prevents the 6 cards from re-rendering every time OverviewTab's
 * unrelated state changes — e.g. toggling a dialog, typing in the category
 * input, or editing a budget input. Those inputs fire dozens of renders
 * during a typical edit session.
 */
type Summary = FinanceOverviewData["summary"];

interface OverviewSummaryCardsProps {
  summary: Summary;
  pnl: FinancePnlData | null;
  formatCurrency: (n: number) => string;
}

function SummaryCard({
  borderColor,
  label,
  value,
  valueColor,
  subtitle,
  subtitleColor,
}: {
  borderColor: string;
  label: string;
  value: string;
  valueColor: string;
  subtitle?: string;
  subtitleColor?: string;
}) {
  return (
    <div
      className={`flex-1 rounded-xl border-l-4 bg-white p-[18px_20px] shadow-sm ${borderColor}`}
      style={{ minWidth: 200 }}
    >
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-[22px] font-bold ${valueColor}`}>{value}</div>
      {subtitle && (
        <div className={`text-[11px] ${subtitleColor || "text-slate-500"}`}>{subtitle}</div>
      )}
    </div>
  );
}

function OverviewSummaryCardsInner({ summary, pnl, formatCurrency }: OverviewSummaryCardsProps) {
  const netProfitColor = pnl
    ? pnl.netProfit >= 0
      ? "text-emerald-500"
      : "text-red-500"
    : "text-slate-400";
  const netProfitBorder = pnl
    ? pnl.netProfit >= 0
      ? "border-l-emerald-500"
      : "border-l-red-500"
    : "border-l-emerald-500";

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <SummaryCard
        borderColor="border-l-blue-600"
        label="Tổng doanh thu"
        value={formatCurrency(summary.grossProfit)}
        valueColor="text-blue-600"
        subtitle={`${summary.revenueChange >= 0 ? "+" : ""}${summary.revenueChange}% so với kỳ trước`}
        subtitleColor={summary.revenueChange >= 0 ? "text-emerald-500" : "text-red-500"}
      />
      <SummaryCard
        borderColor="border-l-red-500"
        label="Tổng chi phí"
        value={pnl ? formatCurrency(pnl.totalOperatingExpenses - pnl.claims.claimDiff) : "—"}
        valueColor="text-red-500"
        subtitle="Đền bù và chi phí vận hành"
      />
      <SummaryCard
        borderColor={netProfitBorder}
        label="Lợi nhuận ròng"
        value={pnl ? formatCurrency(pnl.netProfit) : "—"}
        valueColor={netProfitColor}
      />
      <SummaryCard
        borderColor="border-l-emerald-500"
        label="Tổng COD đã đối soát"
        value={formatCurrency(summary.totalCod)}
        valueColor="text-emerald-500"
      />
      <SummaryCard
        borderColor="border-l-blue-600"
        label="Tổng đơn đã đối soát"
        value={summary.orderCount.toLocaleString()}
        valueColor="text-blue-600"
      />
      <SummaryCard
        borderColor="border-l-blue-600"
        label="Margin trung bình"
        value={`${summary.margin}%`}
        valueColor="text-blue-600"
      />
    </div>
  );
}

export const OverviewSummaryCards = memo(OverviewSummaryCardsInner);
