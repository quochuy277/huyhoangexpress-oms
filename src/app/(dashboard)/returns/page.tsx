"use client";

import { useState, useEffect, useCallback } from "react";
import { Package, Truck, Warehouse, Download } from "lucide-react";
import { PartialReturnTab } from "@/components/returns/PartialReturnTab";
import { ReturnOrder } from "@/types/returns";
import { FullReturnTab } from "@/components/returns/FullReturnTab";
import { WaitingReturnTab } from "@/components/returns/WaitingReturnTab";
import { ReturnFilterPanel, ReturnFilters } from "@/components/returns/ReturnFilterPanel";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

type TabKey = "partial" | "full" | "warehouse";
const VALID_TABS: TabKey[] = ["partial", "full", "warehouse"];

export default function ReturnsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read initial state from URL
  const tabParam = searchParams.get("tab");
  const initialTab: TabKey = VALID_TABS.includes(tabParam as TabKey) ? (tabParam as TabKey) : "partial";

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [partialData, setPartialData] = useState<ReturnOrder[]>([]);
  const [fullData, setFullData] = useState<ReturnOrder[]>([]);
  const [warehouseData, setWarehouseData] = useState<ReturnOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<ReturnFilters>({
    search: searchParams.get("search") || "",
    shopName: searchParams.get("shop") || "",
    daysRange: searchParams.get("days") || "",
    hasNotes: searchParams.get("notes") || "",
    confirmAsked: searchParams.get("confirm") || "",
  });

  // Sync state to URL when tab or filters change
  const updateUrl = useCallback((tab: TabKey, f: ReturnFilters) => {
    const params = new URLSearchParams();
    params.set("tab", tab);
    if (f.search) params.set("search", f.search);
    if (f.shopName) params.set("shop", f.shopName);
    if (f.daysRange) params.set("days", f.daysRange);
    if (f.hasNotes) params.set("notes", f.hasNotes);
    if (f.confirmAsked) params.set("confirm", f.confirmAsked);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router]);

  const handleSetActiveTab = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    updateUrl(tab, filters);
  }, [filters, updateUrl]);

  const handleSetFilters = useCallback((f: ReturnFilters) => {
    setFilters(f);
    updateUrl(activeTab, f);
  }, [activeTab, updateUrl]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2, r3] = await Promise.all([
        fetch("/api/orders/returns?tab=partial"),
        fetch("/api/orders/returns?tab=full"),
        fetch("/api/orders/returns?tab=warehouse"),
      ]);
      const [d1, d2, d3] = await Promise.all([r1.json(), r2.json(), r3.json()]);
      setPartialData(d1.data || []);
      setFullData(d2.data || []);
      setWarehouseData(d3.data || []);
    } catch (err) {
      console.error("Failed to fetch return data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleWarehouseConfirm = async (requestCode: string) => {
    try {
      const res = await fetch(`/api/orders/${requestCode}/warehouse`, { method: "PATCH" });
      if (res.ok) {
        // Refresh data to move order from tab 1 → tab 3
        fetchData();
      }
    } catch { /* silent */ }
  };

  const handleConfirmAskedToggle = async (requestCode: string, value: boolean) => {
    try {
      const res = await fetch(`/api/orders/${requestCode}/confirm-asked`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (res.ok) {
        // Refetch to get updated name/timestamp from server
        const r3 = await fetch("/api/orders/returns?tab=warehouse");
        const d3 = await r3.json();
        setWarehouseData(d3.data || []);
      }
    } catch { /* silent */ }
  };

  const handleCustomerConfirmedToggle = async (requestCode: string, value: boolean) => {
    try {
      const res = await fetch(`/api/orders/${requestCode}/customer-confirmed`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (res.ok) {
        const r3 = await fetch("/api/orders/returns?tab=warehouse");
        const d3 = await r3.json();
        setWarehouseData(d3.data || []);
      }
    } catch { /* silent */ }
  };

  // Collect unique shop names across all tabs for filter dropdown
  const allShopNames = [...new Set([...partialData, ...fullData, ...warehouseData].map((o) => o.shopName).filter(Boolean))] as string[];
  allShopNames.sort();

  const currentData = activeTab === "partial" ? partialData : activeTab === "full" ? fullData : warehouseData;

  // Export Excel
  const handleExport = () => {
    const tabNames: Record<TabKey, string> = { partial: "Hoàn 1 phần", full: "Hoàn toàn bộ", warehouse: "Đã về kho" };
    const headers = ["STT", "Mã Yêu Cầu", "Mã Đơn Đối Tác", "Tên Cửa Hàng", "Trạng Thái", "Ghi Chú"];
    const rows = currentData.map((o, i) => [
      i + 1,
      o.requestCode,
      o.carrierOrderCode || "",
      o.shopName || "",
      o.status,
      o.staffNotes || "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `don-hoan-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const tabs: { key: TabKey; label: string; count: number; color: string; bgColor: string; borderColor: string }[] = [
    { key: "partial", label: "Đang hoàn 1 phần", count: partialData.length, color: "#2563EB", bgColor: "#EFF6FF", borderColor: "#2563EB" },
    { key: "full", label: "Đang hoàn toàn bộ", count: fullData.length, color: "#D97706", bgColor: "#FFFBEB", borderColor: "#D97706" },
    { key: "warehouse", label: "Đã về kho-Chờ trả", count: warehouseData.length, color: "#059669", bgColor: "#ECFDF5", borderColor: "#059669" },
  ];

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Theo Dõi Đơn Hoàn</h1>
        <p className="text-sm text-slate-500 mt-0.5">Quản lý và theo dõi đơn hàng đang hoàn</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => handleSetActiveTab(t.key)}
            style={{
              background: activeTab === t.key ? t.bgColor : "#fff",
              border: `1.5px solid ${activeTab === t.key ? t.borderColor : "#e5e7eb"}`,
              borderRadius: "12px",
              padding: "16px 20px",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s",
              boxShadow: activeTab === t.key ? `0 2px 8px ${t.color}20` : "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "10px",
                background: `${t.color}15`, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {t.key === "partial" ? <Package style={{ width: "18px", height: "18px", color: t.color }} /> :
                 t.key === "full" ? <Truck style={{ width: "18px", height: "18px", color: t.color }} /> :
                 <Warehouse style={{ width: "18px", height: "18px", color: t.color }} />}
              </div>
              <div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: t.color, lineHeight: 1 }}>{t.count}</div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px", fontWeight: 500 }}>{t.label}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Tab Headers */}
      <div style={{ display: "flex", borderBottom: "2px solid #e5e7eb", gap: "0" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => handleSetActiveTab(t.key)}
            style={{
              padding: "10px 20px",
              fontSize: "13px",
              fontWeight: activeTab === t.key ? 600 : 500,
              color: activeTab === t.key ? t.color : "#6b7280",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === t.key ? `2px solid ${t.color}` : "2px solid transparent",
              marginBottom: "-2px",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {t.label} ({t.count})
          </button>
        ))}

        {/* Right side: page size + export */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px", paddingBottom: "6px" }}>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            style={{
              fontSize: "12px", padding: "4px 8px", border: "1px solid #d1d5db",
              borderRadius: "6px", background: "#fff", color: "#374151", outline: "none",
            }}
          >
            <option value={20}>20/trang</option>
            <option value={50}>50/trang</option>
            <option value={100}>100/trang</option>
          </select>
          <button
            onClick={handleExport}
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              fontSize: "12px", fontWeight: 600, color: "#2563EB",
              background: "#EFF6FF", border: "1px solid #BFDBFE",
              borderRadius: "8px", padding: "6px 12px", cursor: "pointer",
            }}
          >
            <Download style={{ width: "13px", height: "13px" }} /> Xuất Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <ReturnFilterPanel
        filters={filters}
        onChange={handleSetFilters}
        shopNames={allShopNames}
        activeTab={activeTab}
      />

      {/* Table Content */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col" style={{ minHeight: "400px" }}>
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-slate-500 text-sm">Đang tải dữ liệu...</div>
          </div>
        ) : (
          <>
            {activeTab === "partial" && (
              <PartialReturnTab
                data={partialData}
                filters={filters}
                pageSize={pageSize}
                onWarehouseConfirm={handleWarehouseConfirm}
              />
            )}
            {activeTab === "full" && (
              <FullReturnTab
                data={fullData}
                filters={filters}
                pageSize={pageSize}
              />
            )}
            {activeTab === "warehouse" && (
              <WaitingReturnTab
                data={warehouseData}
                filters={filters}
                pageSize={pageSize}
                onConfirmAskedToggle={handleConfirmAskedToggle}
                onCustomerConfirmedToggle={handleCustomerConfirmedToggle}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
