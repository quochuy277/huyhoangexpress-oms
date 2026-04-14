"use client";

import { useMemo, useState } from "react";
import { FileDown, Filter, RefreshCw, Search, X } from "lucide-react";

import { getDelayedFilterSheetClassNames } from "@/components/delayed/delayedResponsive";
import { formatDelayedStatusLabel } from "@/lib/delayed-labels";
import { DEFAULT_DELAYED_FILTERS } from "@/lib/delayed-url-state";
import type { DelayedFiltersState } from "@/types/delayed";

type DelayedFilterOptions = {
  shops: string[];
  statuses: string[];
  reasons: string[];
};

type Props = {
  filters: DelayedFiltersState;
  searchInput: string;
  options: DelayedFilterOptions;
  resultCount: number;
  currentPageCount: number;
  isFetching: boolean;
  onFiltersChange: (partial: Partial<DelayedFiltersState>) => void;
  onSearchInputChange: (value: string) => void;
  onSearchSubmit: () => void;
  onReplaceFilters: (filters: DelayedFiltersState) => void;
  onReset: () => void;
  onExport: () => void;
};

const sheetClassNames = getDelayedFilterSheetClassNames();

export function buildDelayedActiveChips(filters: DelayedFiltersState) {
  const chips: string[] = [];

  if (filters.shopFilter) chips.push(filters.shopFilter);
  if (filters.statusFilter) chips.push(formatDelayedStatusLabel(filters.statusFilter));
  if (filters.reasonFilter) chips.push(filters.reasonFilter);
  if (filters.delayCountFilter) chips.push(`Hoãn ${filters.delayCountFilter}`);
  if (filters.todayOnly) chips.push("Đơn hoãn hôm nay");

  return chips;
}

function FilterFields({
  filters,
  searchInput,
  options,
  onChange,
  onSearchInputChange,
  onSearchSubmit,
}: {
  filters: DelayedFiltersState;
  searchInput: string;
  options: DelayedFilterOptions;
  onChange: (partial: Partial<DelayedFiltersState>) => void;
  onSearchInputChange?: (value: string) => void;
  onSearchSubmit?: () => void;
}) {
  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10";

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSearchSubmit?.();
        }}
        className="flex gap-2 xl:col-span-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Mã đơn, shop, người nhận, SĐT..."
            aria-label="Tìm kiếm đơn delayed"
            value={searchInput}
            onChange={(event) => {
              if (onSearchInputChange) {
                onSearchInputChange(event.target.value);
                return;
              }

              onChange({ searchTerm: event.target.value });
            }}
            className={`${inputClass} min-h-11 pl-10`}
          />
        </div>
        <button
          type="submit"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-blue-600 bg-blue-600 px-3 text-white transition-colors hover:bg-blue-700"
          aria-label="Tìm kiếm đơn delayed"
        >
          <Search className="h-4 w-4" />
        </button>
      </form>

      <select
        aria-label="Lọc theo cửa hàng"
        value={filters.shopFilter}
        onChange={(event) => onChange({ shopFilter: event.target.value })}
        className={inputClass}
      >
        <option value="">Tất cả cửa hàng</option>
        {options.shops.map((shop) => (
          <option key={shop} value={shop}>
            {shop}
          </option>
        ))}
      </select>

      <select
        aria-label="Lọc theo trạng thái"
        value={filters.statusFilter}
        onChange={(event) => onChange({ statusFilter: event.target.value })}
        className={inputClass}
      >
        <option value="">Tất cả trạng thái</option>
        {options.statuses.map((status) => (
          <option key={status} value={status}>
            {formatDelayedStatusLabel(status)}
          </option>
        ))}
      </select>

      <select
        aria-label="Lọc theo lý do"
        value={filters.reasonFilter}
        onChange={(event) => onChange({ reasonFilter: event.target.value })}
        className={inputClass}
      >
        <option value="">Tất cả lý do</option>
        {options.reasons.map((reason) => (
          <option key={reason} value={reason}>
            {reason}
          </option>
        ))}
      </select>

      <select
        aria-label="Lọc theo số lần hoãn"
        value={filters.delayCountFilter}
        onChange={(event) => onChange({ delayCountFilter: event.target.value })}
        className={inputClass}
      >
        <option value="">Tất cả số lần hoãn</option>
        <option value="1">1 lần</option>
        <option value="2">2 lần</option>
        <option value="3">3 lần</option>
        <option value="4+">4+ lần</option>
      </select>
    </div>
  );
}

export function DelayedFilterPanel({
  filters,
  searchInput,
  options,
  resultCount,
  currentPageCount,
  isFetching,
  onFiltersChange,
  onSearchInputChange,
  onSearchSubmit,
  onReplaceFilters,
  onReset,
  onExport,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileDraft, setMobileDraft] = useState(filters);

  const activeChips = useMemo(() => buildDelayedActiveChips(filters), [filters]);

  const applyMobileFilters = () => {
    onReplaceFilters(mobileDraft);
    setMobileOpen(false);
  };

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">
              Tìm kiếm và lọc đơn hoãn
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {currentPageCount} / {resultCount} đơn trong bộ lọc hiện tại
            </p>
            <p aria-live="polite" className="mt-1 min-h-4 text-xs font-medium text-blue-600">
              {isFetching ? "Đang áp dụng bộ lọc..." : ""}
            </p>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <RefreshCw className="h-4 w-4" />
              Đặt lại
            </button>
            <button
              type="button"
              onClick={onExport}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <FileDown className="h-4 w-4" />
              Xuất Excel
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setMobileDraft(filters);
              setMobileOpen(true);
            }}
            className={sheetClassNames.trigger}
          >
            <Filter className="mr-2 h-4 w-4" />
            Lọc
          </button>
        </div>

        <div className="hidden md:block">
          <FilterFields
            filters={filters}
            searchInput={searchInput}
            options={options}
            onChange={onFiltersChange}
            onSearchInputChange={onSearchInputChange}
            onSearchSubmit={onSearchSubmit}
          />
          <label className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600">
            <input
              type="checkbox"
              checked={filters.todayOnly}
              onChange={(event) => onFiltersChange({ todayOnly: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Đơn hoãn hôm nay
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          {[
            { key: "all", label: "Tất cả" },
            { key: "high", label: "Cao" },
            { key: "medium", label: "Trung bình" },
            { key: "low", label: "Thấp" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onFiltersChange({ riskFilter: item.key })}
              className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition-all ${
                filters.riskFilter === item.key
                  ? item.key === "high"
                    ? "bg-red-500 text-white"
                    : item.key === "medium"
                      ? "bg-amber-500 text-white"
                      : item.key === "low"
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {activeChips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 md:hidden">
            {activeChips.map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600"
              >
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>

      {mobileOpen && (
        <>
          <div className={sheetClassNames.overlay} onClick={() => setMobileOpen(false)} />
          <div className={sheetClassNames.panel}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-800">Bộ lọc đơn hoãn</h4>
                <p className="text-xs text-slate-500">Chọn điều kiện lọc trên mobile.</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Đóng bộ lọc"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto">
              <FilterFields
                filters={mobileDraft}
                searchInput={mobileDraft.searchTerm}
                options={options}
                onChange={(partial) => setMobileDraft((previous) => ({ ...previous, ...partial }))}
              />

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={mobileDraft.todayOnly}
                  onChange={(event) =>
                    setMobileDraft((previous) => ({
                      ...previous,
                      todayOnly: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Đơn hoãn hôm nay
              </label>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Mức độ rủi ro
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "all", label: "Tất cả" },
                    { key: "high", label: "Cao" },
                    { key: "medium", label: "Trung bình" },
                    { key: "low", label: "Thấp" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setMobileDraft((previous) => ({ ...previous, riskFilter: item.key }))
                      }
                      className={`rounded-lg px-4 py-2 text-[13px] font-semibold ${
                        mobileDraft.riskFilter === item.key
                          ? "bg-slate-800 text-white"
                          : "bg-white text-slate-600"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setMobileDraft(DEFAULT_DELAYED_FILTERS);
                  onReset();
                  setMobileOpen(false);
                }}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                Xóa bộ lọc
              </button>
              <button
                type="button"
                onClick={applyMobileFilters}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
