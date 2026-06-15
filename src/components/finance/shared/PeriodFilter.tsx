"use client";

import { memo } from "react";

export const FINANCE_PERIODS = [
  { value: "month", label: "Tháng này" },
  { value: "last_month", label: "Tháng trước" },
  { value: "quarter", label: "Quý này" },
  { value: "year", label: "Năm nay" },
  { value: "custom", label: "Tùy chọn" },
] as const;

interface PeriodFilterProps {
  period: string;
  customFrom: string;
  customTo: string;
  onPeriodChange: (period: string) => void;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
}

function pillClass(active: boolean) {
  return `whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
    active
      ? "border-blue-200 bg-blue-600 text-white"
      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800"
  }`;
}

function PeriodFilterInner({
  period,
  customFrom,
  customTo,
  onPeriodChange,
  onCustomFromChange,
  onCustomToChange,
}: PeriodFilterProps) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {FINANCE_PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => onPeriodChange(p.value)}
              className={pillClass(period === p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {period === "custom" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[auto,1fr,auto,1fr] lg:items-center">
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
    </div>
  );
}

export const PeriodFilter = memo(PeriodFilterInner);
