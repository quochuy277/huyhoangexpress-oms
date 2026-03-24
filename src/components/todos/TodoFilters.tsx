"use client";

import { Search, RotateCcw } from "lucide-react";
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
  const update = (key: keyof Filters, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
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
        className="flex items-center gap-1 px-3 py-[7px] rounded-lg border-[1.5px] border-gray-200 bg-white text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <RotateCcw size={12} /> Đặt lại
      </button>

      {/* Hide done */}
      <label className="text-xs text-gray-500 flex items-center gap-1.5 ml-auto cursor-pointer select-none whitespace-nowrap">
        <input
          type="checkbox"
          checked={hideDone}
          onChange={(e) => onHideDoneChange(e.target.checked)}
          className="accent-blue-600"
        />
        Ẩn hoàn thành
      </label>
    </div>
  );
}
