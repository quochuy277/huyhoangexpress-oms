// src/components/finance/pnl/PnlPageClient.tsx
"use client";

import { useReducer, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { PnLSection } from "@/components/finance/PnLSection";
import type { FinancePnlData } from "@/lib/finance/landing";

const INITIAL_AT = Date.now();

type PnlFilterState = { period: string; customFromInput: string; customToInput: string; customFrom: string; customTo: string };
type PnlFilterAction =
  | { type: "SET_PERIOD"; period: string }
  | { type: "SET_CUSTOM_FROM_INPUT"; value: string }
  | { type: "SET_CUSTOM_TO_INPUT"; value: string }
  | { type: "APPLY_CUSTOM" };

function reducer(state: PnlFilterState, action: PnlFilterAction): PnlFilterState {
  switch (action.type) {
    case "SET_PERIOD": return { ...state, period: action.period };
    case "SET_CUSTOM_FROM_INPUT": return { ...state, customFromInput: action.value };
    case "SET_CUSTOM_TO_INPUT": return { ...state, customToInput: action.value };
    case "APPLY_CUSTOM": return { ...state, customFrom: state.customFromInput, customTo: state.customToInput };
    default: return state;
  }
}

function buildPnlDateRange(period: string, from: string, to: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (period === "quarter") {
    const qs = Math.floor(month / 3) * 3;
    return { from: new Date(year, qs, 1), to: new Date(year, qs + 3, 0) };
  }
  if (period === "year") return { from: new Date(year, 0, 1), to: new Date(year, 11, 31) };
  if (period === "custom" && from && to) return { from: new Date(from), to: new Date(to) };
  return { from: new Date(year, month, 1), to: new Date(year, month + 1, 0) };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Lỗi hệ thống");
  return data as T;
}

export default function PnlPageClient({ initialPnl }: { initialPnl?: FinancePnlData | null }) {
  const [filter, dispatch] = useReducer(reducer, {
    period: "month", customFromInput: "", customToInput: "", customFrom: "", customTo: "",
  });
  const dates = useMemo(() => buildPnlDateRange(filter.period, filter.customFrom, filter.customTo), [filter.period, filter.customFrom, filter.customTo]);
  const fromStr = format(dates.from, "yyyy-MM-dd");
  const toStr = format(dates.to, "yyyy-MM-dd");

  const pnlQuery = useQuery({
    queryKey: ["finance-pnl", fromStr, toStr],
    queryFn: () => fetchJson<FinancePnlData>(`/api/finance/pnl?from=${fromStr}&to=${toStr}`),
    initialData: initialPnl && filter.period === "month" && !filter.customFrom ? initialPnl : undefined,
    initialDataUpdatedAt: initialPnl ? INITIAL_AT : undefined,
    placeholderData: (prev) => prev,
  });

  const pnl = pnlQuery.data ?? initialPnl ?? null;

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">📄 Báo cáo P&amp;L</h1>
        <p className="mt-1 text-sm text-slate-500">Kết quả kinh doanh theo kỳ.</p>
      </div>
      {pnl && (
        <PnLSection
          pnl={pnl}
          pnlPeriod={filter.period}
          pnlCustomFromInput={filter.customFromInput}
          pnlCustomToInput={filter.customToInput}
          onPnlPeriodChange={(p) => dispatch({ type: "SET_PERIOD", period: p })}
          onPnlCustomFromInputChange={(v) => dispatch({ type: "SET_CUSTOM_FROM_INPUT", value: v })}
          onPnlCustomToInputChange={(v) => dispatch({ type: "SET_CUSTOM_TO_INPUT", value: v })}
          onApplyPnlCustomRange={() => dispatch({ type: "APPLY_CUSTOM" })}
        />
      )}
    </div>
  );
}
