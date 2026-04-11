"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  searchable?: boolean;
  maxHeight?: number;
}

export function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder,
  searchable = false,
  maxHeight = 280,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = searchable && search
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        o.value.toLowerCase().includes(search.toLowerCase()),
      )
    : options;

  const handleToggle = useCallback(
    (value: string) => {
      if (selected.includes(value)) {
        onChange(selected.filter((v) => v !== value));
      } else {
        onChange([...selected, value]);
      }
    },
    [selected, onChange],
  );

  const handleClearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const selectedLabels = selected
    .map((v) => options.find((o) => o.value === v)?.label)
    .filter(Boolean);

  const displayText =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? selectedLabels[0]
        : `Đã chọn (${selected.length})`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between gap-1 rounded-lg border bg-white px-3 py-2 text-left text-xs transition-colors ${
          open
            ? "border-blue-500 ring-2 ring-blue-500/20"
            : selected.length > 0
              ? "border-blue-300 text-slate-700"
              : "border-slate-200 text-slate-500"
        }`}
      >
        <span className={`truncate ${selected.length > 0 ? "font-medium text-slate-700" : ""}`}>
          {displayText}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {selected.length > 0 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll();
              }}
              className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-slate-500 transition-colors hover:bg-red-100 hover:text-red-500"
            >
              <X className="h-2.5 w-2.5" />
            </span>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          {searchable && (
            <div className="border-b border-slate-100 p-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm..."
                  className="w-full rounded border border-slate-200 py-1.5 pl-7 pr-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>
          )}

          <div
            className="overflow-y-auto"
            style={{ maxHeight: `${maxHeight}px` }}
          >
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400">
                Không tìm thấy
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-slate-50 sm:py-1.5 ${
                      isSelected ? "bg-blue-50/50 font-medium text-blue-700" : "text-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(option.value)}
                      className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="truncate">{option.label}</span>
                  </label>
                );
              })
            )}
          </div>

          {selected.length > 0 && (
            <div className="border-t border-slate-100 px-3 py-1.5">
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] text-red-500 transition-colors hover:text-red-700"
              >
                Bỏ chọn tất cả
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
