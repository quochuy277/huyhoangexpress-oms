"use client";

import { memo } from "react";

/**
 * Period selector row + custom date-range inputs for the finance OverviewTab.
 *
 * Sprint 2 (2026-04) extraction: small but called alongside every parent
 * render. Memoized so the buttons don't reconcile when unrelated state
 * (dialogs, forms, budget edits) flips upstream.
 */
const PERIODS = [
  { value: "month", label: "Tháng này" },
  { value: "last_month", label: "Tháng trước" },
  { value: "quarter", label: "Quý này" },
  { value: "half", label: "6 tháng" },
  { value: "year", label: "Năm nay" },
  { value: "custom", label: "Tùy chọn" },
] as const;

const PANEL_CLASS = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5";

interface OverviewPeriodSelectorProps {
  period: string;
  customFrom: string;
  customTo: string;
  onPeriodChange: (period: string) => void;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
}

function periodButtonClass(active: boolean) {
  return `whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
    active
      ? "border-blue-200 bg-blue-600 text-white"
      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800"
  }`;
}

function OverviewPeriodSelectorInner({
  period,
  customFrom,
  customTo,
  onPeriodChange,
  onCustomFromChange,
  onCustomToChange,
}: OverviewPeriodSelectorProps) {
  return (
    <>
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => onPeriodChange(p.value)}
              className={periodButtonClass(period === p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {period === "custom" && (
        <div
          className={`${PANEL_CLASS} grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[auto,1fr,auto,1fr] lg:items-center`}
        >
          <label className="text-sm font-semibold text-slate-600">Từ</label>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => onCustomFromChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <label className="text-sm font-semibold text-slate-600">Đến</label>
          <input
            type="date"
            value={customTo}
            onChange={(e) => onCustomToChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      )}
    </>
  );
}

export const OverviewPeriodSelector = memo(OverviewPeriodSelectorInner);
