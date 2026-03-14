"use client";

import { Search, RotateCcw } from "lucide-react";

export type ReturnFilters = {
  search: string;
  shopName: string;
  daysRange: string;
  hasNotes: string;
  confirmAsked: string;
};

interface ReturnFilterPanelProps {
  filters: ReturnFilters;
  onChange: (f: ReturnFilters) => void;
  shopNames: string[];
  activeTab: string;
}

export function ReturnFilterPanel({ filters, onChange, shopNames, activeTab }: ReturnFilterPanelProps) {
  const set = (key: keyof ReturnFilters, value: string) => onChange({ ...filters, [key]: value });

  const selectStyle: React.CSSProperties = {
    fontSize: "13px",
    padding: "7px 10px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    background: "#fff",
    color: "#1a1a1a",
    outline: "none",
    minWidth: "130px",
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", padding: "12px 0" }}>
      {/* Search */}
      <div style={{ position: "relative", flex: "1 1 200px", maxWidth: "280px" }}>
        <Search style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "#9ca3af" }} />
        <input
          type="text"
          placeholder="Mã đơn, người nhận, SĐT..."
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          style={{ ...selectStyle, width: "100%", paddingLeft: "32px" }}
        />
      </div>

      {/* Shop Name */}
      <select value={filters.shopName} onChange={(e) => set("shopName", e.target.value)} style={selectStyle}>
        <option value="">Tất cả cửa hàng</option>
        {shopNames.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Days range */}
      {activeTab !== "warehouse" && (
        <select value={filters.daysRange} onChange={(e) => set("daysRange", e.target.value)} style={selectStyle}>
          <option value="">Tất cả số ngày</option>
          <option value="lte3">≤3 ngày</option>
          <option value="4to7">4-7 ngày</option>
          <option value="gte8">≥8 ngày</option>
        </select>
      )}

      {/* Has notes */}
      <select value={filters.hasNotes} onChange={(e) => set("hasNotes", e.target.value)} style={selectStyle}>
        <option value="">Tất cả ghi chú</option>
        <option value="has">Có ghi chú</option>
        <option value="empty">Chưa có ghi chú</option>
      </select>

      {/* Confirm asked — Tab 3 only */}
      {activeTab === "warehouse" && (
        <select value={filters.confirmAsked} onChange={(e) => set("confirmAsked", e.target.value)} style={selectStyle}>
          <option value="">Tất cả trạng thái hỏi</option>
          <option value="asked">Đã hỏi KH</option>
          <option value="notasked">Chưa hỏi KH</option>
        </select>
      )}

      {/* Reset */}
      <button
        onClick={() => onChange({ search: "", shopName: "", daysRange: "", hasNotes: "", confirmAsked: "" })}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          fontSize: "12px",
          color: "#6b7280",
          background: "transparent",
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          padding: "7px 12px",
          cursor: "pointer",
        }}
      >
        <RotateCcw style={{ width: "12px", height: "12px" }} /> Đặt lại
      </button>
    </div>
  );
}
