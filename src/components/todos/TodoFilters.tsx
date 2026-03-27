"use client";

import { useState } from "react";
import { Search, RotateCcw, SlidersHorizontal, ChevronDown } from "lucide-react";
import { SOURCE_CONFIG, PRIORITY_CONFIG, DUE_FILTER_OPTIONS } from "./constants";
import type { TodoFilters as Filters } from "@/types/todo";

interface TodoFiltersProps {
  filters: Filters;
  hideDone: boolean;
  onFilterChange: (filters: Filters) => void;
  onHideDoneChange: (v: boolean) => void;
  onReset: () => void;
}

const selectClass =
  "px-2.5 py-[7px] border border-gray-300 rounded-lg text-[13px] outline-none bg-white text-slate-700 cursor-pointer focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors";

export function TodoFilters({ filters, hideDone, onFilterChange, onHideDoneChange, onReset }: TodoFiltersProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const update = (key: keyof Filters, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const activeCount = [filters.source, filters.priority, filters.dueFilter].filter(Boolean).length;

  return (
    <>
      <div className="flex gap-2 flex-wrap items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[140px] sm:min-w-[180px]">
          <Search size={14} className="absolute left-2.5 top-[9px] text-gray-400 pointer-events-none" />
          <input
            className="w-full pl-8 pr-3 py-[7px] border border-gray-300 rounded-lg text-[13px] outline-none bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
            placeholder="Tìm kiếm..."
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
          />
        </div>

        {/* Mobile filter toggle */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="flex sm:hidden items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <SlidersHorizontal size={13} />
          Bộ lọc
          {activeCount > 0 && (
            <span className="bg-blue-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{activeCount}</span>
          )}
          <ChevronDown size={12} className={`transition-transform ${mobileOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Source */}
        <select
          className={`${selectClass} hidden sm:block`}
          value={filters.source}
          onChange={(e) => update("source", e.target.value)}
        >
          <option value="">Nguồn: Tất cả</option>
          {Object.entries(SOURCE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {/* Priority */}
        <select
          className={selectClass}
          value={filters.priority}
          onChange={(e) => update("priority", e.target.value)}
        >
          <option value="">Ưu tiên: Tất cả</option>
          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {/* Due filter */}
        <select
          className={`${selectClass} hidden sm:block`}
          value={filters.dueFilter}
          onChange={(e) => update("dueFilter", e.target.value)}
        >
          {DUE_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Reset */}
        <button
          onClick={onReset}
          className="flex items-center gap-1 px-3 py-2 rounded-lg border-[1.5px] border-gray-200 bg-white text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <RotateCcw size={12} /> Đặt lại
        </button>

        {/* Hide done */}
        <label className="text-xs text-gray-500 flex items-center gap-1.5 py-1 ml-auto cursor-pointer select-none whitespace-nowrap">
          <input
            type="checkbox"
            checked={hideDone}
            onChange={(e) => onHideDoneChange(e.target.checked)}
            className="accent-blue-600"
          />
          Ẩn hoàn thành
        </label>
      </div>

      {/* Mobile expanded filters */}
      <div
        className={`sm:hidden overflow-hidden transition-all duration-200 ${
          mobileOpen ? "max-h-40 opacity-100 mt-2" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <select
            className={selectClass + " w-full"}
            value={filters.source}
            onChange={(e) => update("source", e.target.value)}
          >
            <option value="">Nguồn: Tất cả</option>
            {Object.entries(SOURCE_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select
            className={selectClass + " w-full"}
            value={filters.dueFilter}
            onChange={(e) => update("dueFilter", e.target.value)}
          >
            {DUE_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}
