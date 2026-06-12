"use client";

import { memo } from "react";
import { format } from "date-fns";

export type CompensationPreset = "month" | "quarter" | "year" | "custom";

export type CompensationFilters = {
  preset: CompensationPreset;
  dateFrom: string; // yyyy-MM-dd
  dateTo: string; // yyyy-MM-dd
  shopName: string; // "" = tất cả cửa hàng
};

const PRESETS: Array<{ value: CompensationPreset; label: string }> = [
  { value: "month", label: "Tháng này" },
  { value: "quarter", label: "Quý này" },
  { value: "year", label: "Năm nay" },
  { value: "custom", label: "Tùy chọn" },
];

export function getPresetRange(
  preset: CompensationPreset,
  now = new Date(),
): { dateFrom: string; dateTo: string } {
  const dateTo = format(now, "yyyy-MM-dd");

  switch (preset) {
    case "month":
      return { dateFrom: format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd"), dateTo };
    case "quarter":
      return {
        dateFrom: format(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1), "yyyy-MM-dd"),
        dateTo,
      };
    default:
      return { dateFrom: format(new Date(now.getFullYear(), 0, 1), "yyyy-MM-dd"), dateTo };
  }
}

export function createDefaultCompensationFilters(now = new Date()): CompensationFilters {
  return { preset: "year", ...getPresetRange("year", now), shopName: "" };
}

const dateInputStyle: React.CSSProperties = {
  padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: "8px",
  fontSize: "12px", color: "#374151", outline: "none", background: "#fff",
};

const selectStyle: React.CSSProperties = {
  padding: "7px 12px", border: "1.5px solid #2563EB", borderRadius: "8px",
  fontSize: "13px", fontWeight: 600, color: "#2563EB", background: "#eff6ff",
  cursor: "pointer", outline: "none", maxWidth: "220px",
};

interface Props {
  filters: CompensationFilters;
  shopOptions: string[];
  onChange: (filters: CompensationFilters) => void;
}

function CompensationFilterBarInner({ filters, shopOptions, onChange }: Props) {
  const handlePreset = (preset: CompensationPreset) => {
    if (preset === "custom") {
      onChange({ ...filters, preset });
      return;
    }
    onChange({ ...filters, preset, ...getPresetRange(preset) });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "10px",
        alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {PRESETS.map((preset) => {
            const active = filters.preset === preset.value;
            return (
              <button
                key={preset.value}
                onClick={() => handlePreset(preset.value)}
                style={{
                  padding: "7px 14px", borderRadius: "999px", fontSize: "12px", fontWeight: 600,
                  border: active ? "1.5px solid #2563EB" : "1px solid #d1d5db",
                  background: active ? "#2563EB" : "#fff",
                  color: active ? "#fff" : "#475569",
                  cursor: "pointer", whiteSpace: "nowrap",
                }}
                aria-pressed={active}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <select
          value={filters.shopName}
          onChange={(e) => onChange({ ...filters, shopName: e.target.value })}
          style={selectStyle}
          aria-label="Lọc cửa hàng đền bù"
        >
          <option value="">Tất cả cửa hàng</option>
          {shopOptions.map((shop) => (
            <option key={shop} value={shop}>{shop}</option>
          ))}
        </select>
      </div>

      {filters.preset === "custom" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
          <label htmlFor="compensation-date-from" style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Từ</label>
          <input
            id="compensation-date-from"
            type="date"
            value={filters.dateFrom}
            max={filters.dateTo || undefined}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
            style={dateInputStyle}
            aria-label="Từ ngày thống kê đền bù"
          />
          <label htmlFor="compensation-date-to" style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Đến</label>
          <input
            id="compensation-date-to"
            type="date"
            value={filters.dateTo}
            min={filters.dateFrom || undefined}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
            style={dateInputStyle}
            aria-label="Đến ngày thống kê đền bù"
          />
        </div>
      )}
    </div>
  );
}

export const CompensationFilterBar = memo(CompensationFilterBarInner);
