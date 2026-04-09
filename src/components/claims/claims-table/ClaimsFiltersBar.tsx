import { Search } from "lucide-react";

import type { ClaimFilters } from "@/hooks/useClaimsFilters";

type ClaimsFiltersBarProps = {
  filters: ClaimFilters;
  searchInput: string;
  shopOptions: string[];
  orderStatusOptions: string[];
  issueTypeConfig: Record<string, { label: string; bg: string; text: string; border: string }>;
  claimStatusConfig: Record<string, { label: string; bg: string; text: string }>;
  inputStyle: React.CSSProperties;
  onSearchInputChange: (value: string) => void;
  onSearchSubmit: () => void;
  onToggleIssueFilter: (type: string) => void;
  onStatusChange: (value: string) => void;
  onShopChange: (value: string) => void;
  onOrderStatusChange: (value: string) => void;
  onShowCompletedChange: (value: boolean) => void;
};

export function ClaimsFiltersBar({
  filters,
  searchInput,
  shopOptions,
  orderStatusOptions,
  issueTypeConfig,
  claimStatusConfig,
  inputStyle,
  onSearchInputChange,
  onSearchSubmit,
  onToggleIssueFilter,
  onStatusChange,
  onShopChange,
  onOrderStatusChange,
  onShowCompletedChange,
}: ClaimsFiltersBarProps) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "16px", alignItems: "center" }}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSearchSubmit();
        }}
        style={{ display: "flex", gap: "8px", flex: "1 1 auto", minWidth: "220px", alignItems: "stretch" }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
          <input
            style={{ ...inputStyle, paddingLeft: "32px", padding: "10px 12px 10px 32px", fontSize: "13px", minHeight: "40px" }}
            placeholder="Tìm mã đơn, SĐT, shop..."
            value={searchInput}
            onChange={(event) => onSearchInputChange(event.target.value)}
            aria-label="Tìm kiếm đơn có vấn đề"
          />
        </div>
        <button
          type="submit"
          style={{
            minWidth: "44px",
            minHeight: "40px",
            borderRadius: "10px",
            border: "1px solid #2563eb",
            background: "#2563eb",
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            padding: "0 12px",
            fontWeight: 600,
          }}
          aria-label="Tìm kiếm đơn có vấn đề"
          title="Tìm kiếm"
        >
          <Search size={16} />
        </button>
      </form>

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {Object.entries(issueTypeConfig).map(([key, value]) => (
          <button
            key={key}
            onClick={() => onToggleIssueFilter(key)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${filters.issueType.includes(key) ? `${value.bg} ${value.text} ${value.border}` : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}
          >
            {value.label}
          </button>
        ))}
      </div>

      <select
        style={{ ...inputStyle, width: "auto", padding: "7px 10px", fontSize: "12px" }}
        value={filters.status}
        onChange={(event) => onStatusChange(event.target.value)}
      >
        <option value="">Tất cả TT xử lý</option>
        {Object.entries(claimStatusConfig).map(([key, value]) => (
          <option key={key} value={key}>{value.label}</option>
        ))}
      </select>

      <div style={{ minWidth: "220px", flex: "0 1 240px" }}>
        <input
          list="claims-shop-options"
          style={{ ...inputStyle, padding: "7px 10px", fontSize: "12px" }}
          placeholder="Lọc theo Tên cửa hàng"
          value={filters.shopName}
          onChange={(event) => onShopChange(event.target.value)}
        />
        <datalist id="claims-shop-options">
          {shopOptions.map((shop) => (
            <option key={shop} value={shop} />
          ))}
        </datalist>
      </div>

      <select
        style={{ ...inputStyle, width: "auto", padding: "7px 10px", fontSize: "12px", maxWidth: "220px" }}
        value={filters.orderStatus}
        onChange={(event) => onOrderStatusChange(event.target.value)}
      >
        <option value="">Tất cả TT đơn hàng</option>
        {orderStatusOptions.map((status) => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>

      <div style={{ display: "flex", gap: "4px" }}>
        <button
          onClick={() => onShowCompletedChange(false)}
          style={{
            padding: "6px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", cursor: "pointer",
            background: !filters.showCompleted ? "#2563eb" : "#fff", color: !filters.showCompleted ? "#fff" : "#64748b",
            fontWeight: 600, fontSize: "12px", transition: "all 0.2s",
          }}
        >
          Chưa hoàn tất
        </button>
        <button
          onClick={() => onShowCompletedChange(true)}
          style={{
            padding: "6px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", cursor: "pointer",
            background: filters.showCompleted ? "#10b981" : "#fff", color: filters.showCompleted ? "#fff" : "#64748b",
            fontWeight: 600, fontSize: "12px", transition: "all 0.2s",
          }}
        >
          Đã hoàn tất
        </button>
      </div>
    </div>
  );
}
