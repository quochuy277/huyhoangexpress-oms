"use client";

import { useMemo, useReducer, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { PnlComparisonTable } from "@/components/finance/pnl/PnlComparisonTable";
import { PeriodFilter } from "@/components/finance/shared/PeriodFilter";
import { FinancePanel } from "@/components/finance/shared/FinancePanel";
import { ExportButton } from "@/components/finance/shared/ExportButton";
import { formatVnd } from "@/lib/finance/format";
import { computeTargetPercent } from "@/lib/finance/compare";
import type { FinancePnlData } from "@/lib/finance/landing";
import type { FinanceTargets } from "@/lib/finance/targets";

const TargetDialog = dynamic(() => import("@/components/finance/pnl/TargetDialog"), { ssr: false });

type Filter = { period: string; from: string; to: string };
function reducer(s: Filter, a: Partial<Filter>): Filter {
  return { ...s, ...a };
}

function rangeFor(period: string, from: string, to: string) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (period === "quarter") {
    const qs = Math.floor(m / 3) * 3;
    return { from: new Date(y, qs, 1), to: new Date(y, qs + 3, 0) };
  }
  if (period === "year") return { from: new Date(y, 0, 1), to: new Date(y, 11, 31) };
  if (period === "custom" && from && to) return { from: new Date(from), to: new Date(to) };
  return { from: new Date(y, m, 1), to: new Date(y, m + 1, 0) };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Lỗi hệ thống");
  return data as T;
}

interface Props {
  isAdmin: boolean;
  initialCompare?: { current: FinancePnlData; previous: FinancePnlData } | null;
  initialTargets?: FinanceTargets;
}

export default function PnlPageClient({ isAdmin, initialCompare, initialTargets }: Props) {
  const [filter, setFilter] = useReducer(reducer, { period: "month", from: "", to: "" });
  const [compareTo, setCompareTo] = useState<"prev" | "yoy">("prev");
  const [dialogOpen, setDialogOpen] = useState(false);

  const dates = useMemo(() => rangeFor(filter.period, filter.from, filter.to), [filter]);
  const fromStr = format(dates.from, "yyyy-MM-dd");
  const toStr = format(dates.to, "yyyy-MM-dd");
  const monthStr = format(dates.from, "yyyy-MM");
  const isDefault = filter.period === "month" && compareTo === "prev";

  const pnlQuery = useQuery({
    queryKey: ["finance-pnl-compare", fromStr, toStr, compareTo],
    queryFn: () => fetchJson<{ current: FinancePnlData; previous: FinancePnlData }>(`/api/finance/pnl?from=${fromStr}&to=${toStr}&compareTo=${compareTo}`),
    initialData: isDefault ? (initialCompare ?? undefined) : undefined,
    placeholderData: (prev) => prev,
  });
  const targetsQuery = useQuery({
    queryKey: ["finance-targets", monthStr],
    queryFn: () => fetchJson<FinanceTargets>(`/api/finance/targets?month=${monthStr}`),
    initialData: filter.period === "month" ? initialTargets : undefined,
    placeholderData: (prev) => prev,
  });

  const data = pnlQuery.data;
  const targets = targetsQuery.data ?? { netRevenue: null, netProfit: null };
  const compareBtn = (v: "prev" | "yoy", label: string) => (
    <button
      onClick={() => setCompareTo(v)}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${compareTo === v ? "border-blue-200 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">📄 Báo cáo P&L</h1>
          <p className="mt-1 text-sm text-slate-500">Kết quả kinh doanh + so sánh kỳ.</p>
        </div>
        <div className="flex flex-col gap-2">
          <PeriodFilter
            period={filter.period}
            customFrom={filter.from}
            customTo={filter.to}
            onPeriodChange={(p) => setFilter({ period: p })}
            onCustomFromChange={(v) => setFilter({ from: v })}
            onCustomToChange={(v) => setFilter({ to: v })}
          />
          <ExportButton href={`/api/finance/pnl/export?from=${fromStr}&to=${toStr}&compareTo=${compareTo}`} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-600">So với:</span>
        {compareBtn("prev", "Kỳ trước")}
        {compareBtn("yoy", "Cùng kỳ năm ngoái")}
      </div>

      {data && (
        <FinancePanel>
          <PnlComparisonTable current={data.current} previous={data.previous} />
        </FinancePanel>
      )}

      <FinancePanel>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">
            🎯 <b>Mục tiêu {monthStr}:</b>{" "}
            {targets.netRevenue ? `DT ròng ${formatVnd(targets.netRevenue)}` : "DT ròng —"} ·{" "}
            {targets.netProfit ? `LN ròng ${formatVnd(targets.netProfit)}` : "LN ròng —"}
            {data && targets.netProfit ? ` · đạt ${computeTargetPercent(data.current.netProfit, targets.netProfit)}%` : ""}
          </div>
          {isAdmin && (
            <button onClick={() => setDialogOpen(true)} className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200">⚙ Đặt mục tiêu</button>
          )}
        </div>
      </FinancePanel>

      {dialogOpen && (
        <TargetDialog
          month={monthStr}
          initialNetRevenue={targets.netRevenue}
          initialNetProfit={targets.netProfit}
          onSaved={() => targetsQuery.refetch()}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}
