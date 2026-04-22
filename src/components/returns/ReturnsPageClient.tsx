"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Download, Package, Truck, Warehouse } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ReturnFilterPanel, type ReturnFilters } from "@/components/returns/ReturnFilterPanel";
import {
  clearReturnsPaginationParams,
  createReturnsTabRequestSignature,
  DEFAULT_RETURNS_PAGE_SIZE,
  fetchReturnsSummary,
  fetchReturnsTabData,
  getReturnShopNames,
  invalidateReturnsTabs,
  resolveReturnsTabPage,
  shouldFetchReturnsTab,
  type ReturnsFilterParams,
  type ReturnsSummaryCounts,
  type ReturnsTabKey,
  type ReturnsTabDataMap,
} from "@/lib/returns-tab-data";
import type { ReturnOrder } from "@/types/returns";

const PartialReturnTab = dynamic(
  () => import("@/components/returns/PartialReturnTab").then((mod) => mod.PartialReturnTab),
  {
    loading: () => (
      <div className="flex h-40 items-center justify-center text-slate-400">
        Đang tải tab...
      </div>
    ),
  },
);
const FullReturnTab = dynamic(
  () => import("@/components/returns/FullReturnTab").then((mod) => mod.FullReturnTab),
  {
    loading: () => (
      <div className="flex h-40 items-center justify-center text-slate-400">
        Đang tải tab...
      </div>
    ),
  },
);
const WaitingReturnTab = dynamic(
  () => import("@/components/returns/WaitingReturnTab").then((mod) => mod.WaitingReturnTab),
  {
    loading: () => (
      <div className="flex h-40 items-center justify-center text-slate-400">
        Đang tải tab...
      </div>
    ),
  },
);

type TabKey = ReturnsTabKey;

interface ReturnsPageClientProps {
  initialActiveTab: TabKey;
  initialTabData: ReturnsTabDataMap;
  initialSummaryCounts: ReturnsSummaryCounts;
  initialFilters: ReturnFilters;
}

export function ReturnsPageClient({
  initialActiveTab,
  initialTabData,
  initialSummaryCounts,
  initialFilters,
}: ReturnsPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState<TabKey>(initialActiveTab);
  const [tabData, setTabData] = useState<ReturnsTabDataMap>(initialTabData);
  const tabDataRef = useRef(tabData);
  tabDataRef.current = tabData;
  const initialSignature = createReturnsTabRequestSignature(initialActiveTab, {
    search: initialFilters.search || undefined,
    shop: initialFilters.shopName || undefined,
    days: initialFilters.daysRange || undefined,
    notes: initialFilters.hasNotes || undefined,
    confirm: initialFilters.confirmAsked || undefined,
    page: resolveReturnsTabPage(searchParams, initialActiveTab),
    pageSize: DEFAULT_RETURNS_PAGE_SIZE,
  });
  const lastLoadedSignatureRef = useRef<Record<TabKey, string | null>>({
    partial: initialActiveTab === "partial" ? initialSignature : null,
    full: initialActiveTab === "full" ? initialSignature : null,
    warehouse: initialActiveTab === "warehouse" ? initialSignature : null,
  });
  const [summaryCounts, setSummaryCounts] = useState<ReturnsSummaryCounts>(initialSummaryCounts);
  const [summaryReady, setSummaryReady] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(DEFAULT_RETURNS_PAGE_SIZE);
  const [filters, setFilters] = useState<ReturnFilters>(initialFilters);
  const didMountRef = useRef(false);

  const updateUrl = useCallback((
    tab: TabKey,
    nextFilters: ReturnFilters,
    options?: { resetPagination?: boolean },
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    if (options?.resetPagination) {
      clearReturnsPaginationParams(params);
    }

    params.set("tab", tab);

    if (nextFilters.search) params.set("search", nextFilters.search);
    else params.delete("search");

    if (nextFilters.shopName) params.set("shop", nextFilters.shopName);
    else params.delete("shop");

    if (nextFilters.daysRange) params.set("days", nextFilters.daysRange);
    else params.delete("days");

    if (nextFilters.hasNotes) params.set("notes", nextFilters.hasNotes);
    else params.delete("notes");

    if (nextFilters.confirmAsked) params.set("confirm", nextFilters.confirmAsked);
    else params.delete("confirm");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const handleSetActiveTab = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    updateUrl(tab, filters);
  }, [filters, updateUrl]);

  const handleSetFilters = useCallback((nextFilters: ReturnFilters) => {
    setFilters(nextFilters);
    updateUrl(activeTab, nextFilters, { resetPagination: true });
  }, [activeTab, updateUrl]);

  const loadSummary = useCallback(async () => {
    try {
      const counts = await fetchReturnsSummary(fetch);
      setSummaryCounts(counts);
      setSummaryReady(true);
      setErrorMessage(null);
    } catch {
      setErrorMessage("Không thể tải tổng quan đơn hoàn. Vui lòng thử lại.");
    }
  }, []);

  const buildFilterParams = useCallback((
    tab: TabKey,
    f: ReturnFilters,
    ps: number,
  ): ReturnsFilterParams => ({
    search: f.search || undefined,
    shop: f.shopName || undefined,
    days: f.daysRange || undefined,
    notes: f.hasNotes || undefined,
    confirm: f.confirmAsked || undefined,
    page: resolveReturnsTabPage(searchParams, tab),
    pageSize: ps,
  }), [searchParams]);

  const invalidateTabs = useCallback((tabs: TabKey[]) => {
    setTabData((prev) => invalidateReturnsTabs(prev, tabs));
    for (const tab of tabs) {
      lastLoadedSignatureRef.current[tab] = null;
    }
  }, []);

  const loadTab = useCallback(async (tab: TabKey, force = false) => {
    const params = buildFilterParams(tab, filters, pageSize);
    const requestSignature = createReturnsTabRequestSignature(tab, params);
    const needsFetch = shouldFetchReturnsTab(tabDataRef.current, tab, force, {
      currentSignature: requestSignature,
      lastLoadedSignature: lastLoadedSignatureRef.current[tab],
    });
    if (!needsFetch) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const rows = await fetchReturnsTabData(fetch, tab, params);
      setTabData((prev) => ({
        ...prev,
        [tab]: rows,
      }));
      lastLoadedSignatureRef.current[tab] = requestSignature;
    } catch {
      setErrorMessage("Không thể tải dữ liệu đơn hoàn. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [filters, pageSize, buildFilterParams]); // tabData removed — use ref instead

  // Re-fetch when active tab changes
  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab, loadTab]);

  // Re-fetch when filters or pageSize change — invalidate current tab then fetch
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    invalidateTabs([activeTab]);
    loadTab(activeTab, true);
  }, [activeTab, filters, invalidateTabs, loadTab, pageSize]);

  const handleWarehouseConfirm = async (requestCode: string) => {
    // Optimistic update (Sprint 2, 2026-04): remove the row from the current
    // tab's data immediately so the user sees the action take effect without
    // waiting for the network round-trip + summary refetch + tab refetch
    // (which together can be 500-1500 ms on slow connections).
    //
    // We snapshot the row so we can restore it on failure. Only the current
    // tab gets an optimistic edit — other tabs will be re-fetched from the
    // server as normal once the mutation succeeds.
    const snapshot = tabDataRef.current;
    const currentRows = snapshot[activeTab];
    const optimisticRows = currentRows?.filter((row) => row.requestCode !== requestCode) ?? null;
    if (optimisticRows && currentRows && optimisticRows.length !== currentRows.length) {
      setTabData((prev) => ({ ...prev, [activeTab]: optimisticRows }));
    }

    try {
      const response = await fetch(`/api/orders/${requestCode}/warehouse`, { method: "PATCH" });
      if (response.ok) {
        // Success: invalidate both affected tabs so the next visit refetches
        // authoritative data, and refresh the current tab + summary now.
        invalidateTabs(["partial", "warehouse"]);
        await Promise.all([loadSummary(), loadTab(activeTab, true)]);
        setErrorMessage(null);
      } else {
        // Rollback optimistic removal.
        if (currentRows) {
          setTabData((prev) => ({ ...prev, [activeTab]: currentRows }));
        }
        setErrorMessage("Không thể xác nhận trạng thái về kho. Vui lòng thử lại.");
      }
    } catch {
      if (currentRows) {
        setTabData((prev) => ({ ...prev, [activeTab]: currentRows }));
      }
      setErrorMessage("Không thể xác nhận trạng thái về kho. Vui lòng thử lại.");
    }
  };

  // Shared optimistic toggle for the two boolean flags on warehouse rows.
  // Flips the flag locally before firing the PATCH; on failure rolls back and
  // surfaces an error. Avoids the full tab refetch on success since the
  // displayed fields for this row have already been updated — we only need
  // the server source of truth if another user's edit is pending, and the
  // next natural refetch will pick that up.
  const applyWarehouseRowPatch = useCallback(
    (requestCode: string, patch: Partial<ReturnOrder>) => {
      setTabData((prev) => {
        const warehouseRows = prev.warehouse;
        if (!warehouseRows) return prev;
        return {
          ...prev,
          warehouse: warehouseRows.map((row) =>
            row.requestCode === requestCode ? { ...row, ...patch } : row,
          ),
        };
      });
    },
    [],
  );

  const handleConfirmAskedToggle = async (requestCode: string, value: boolean) => {
    // Optimistic: flip flag immediately (Sprint 2, 2026-04).
    const previousRow = tabDataRef.current.warehouse?.find((row) => row.requestCode === requestCode);
    applyWarehouseRowPatch(requestCode, { customerConfirmAsked: value });

    try {
      const response = await fetch(`/api/orders/${requestCode}/confirm-asked`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (response.ok) {
        invalidateTabs(["warehouse"]);
        await loadTab("warehouse", true);
        setErrorMessage(null);
      } else {
        if (previousRow) {
          applyWarehouseRowPatch(requestCode, {
            customerConfirmAsked: previousRow.customerConfirmAsked,
          });
        }
        setErrorMessage("Không thể cập nhật trạng thái hỏi khách hàng. Vui lòng thử lại.");
      }
    } catch {
      if (previousRow) {
        applyWarehouseRowPatch(requestCode, {
          customerConfirmAsked: previousRow.customerConfirmAsked,
        });
      }
      setErrorMessage("Không thể cập nhật trạng thái hỏi khách hàng. Vui lòng thử lại.");
    }
  };

  const handleCustomerConfirmedToggle = async (requestCode: string, value: boolean) => {
    // Optimistic: flip flag immediately (Sprint 2, 2026-04).
    const previousRow = tabDataRef.current.warehouse?.find((row) => row.requestCode === requestCode);
    applyWarehouseRowPatch(requestCode, { customerConfirmed: value });

    try {
      const response = await fetch(`/api/orders/${requestCode}/customer-confirmed`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (response.ok) {
        invalidateTabs(["warehouse"]);
        await loadTab("warehouse", true);
        setErrorMessage(null);
      } else {
        if (previousRow) {
          applyWarehouseRowPatch(requestCode, {
            customerConfirmed: previousRow.customerConfirmed,
          });
        }
        setErrorMessage("Không thể cập nhật xác nhận của khách hàng. Vui lòng thử lại.");
      }
    } catch {
      if (previousRow) {
        applyWarehouseRowPatch(requestCode, {
          customerConfirmed: previousRow.customerConfirmed,
        });
      }
      setErrorMessage("Không thể cập nhật xác nhận của khách hàng. Vui lòng thử lại.");
    }
  };

  const partialData = tabData.partial ?? [];
  const fullData = tabData.full ?? [];
  const warehouseData = tabData.warehouse ?? [];
  const allShopNames = getReturnShopNames(tabData);
  const currentData =
    activeTab === "partial" ? partialData : activeTab === "full" ? fullData : warehouseData;

  const countFor = (tab: TabKey, fallback: number) => (summaryReady ? summaryCounts[tab] : fallback);

  const handleExport = () => {
    const headers = [
      "STT",
      "Mã Yêu Cầu",
      "Mã Đơn Đối Tác",
      "Tên Cửa Hàng",
      "Trạng Thái",
      "Ghi Chú",
    ];
    const rows = currentData.map((order, index) => [
      index + 1,
      order.requestCode,
      order.carrierOrderCode || "",
      order.shopName || "",
      order.status,
      order.staffNotes || "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `don-hoan-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const tabs: Array<{
    key: TabKey;
    label: string;
    count: number;
    color: string;
    bgColor: string;
    borderColor: string;
  }> = [
    { key: "partial", label: "Đang hoàn 1 phần", count: countFor("partial", partialData.length), color: "#2563EB", bgColor: "#EFF6FF", borderColor: "#2563EB" },
    { key: "full", label: "Đang hoàn toàn bộ", count: countFor("full", fullData.length), color: "#D97706", bgColor: "#FFFBEB", borderColor: "#D97706" },
    { key: "warehouse", label: "Đã về kho - Chờ trả", count: countFor("warehouse", warehouseData.length), color: "#059669", bgColor: "#ECFDF5", borderColor: "#059669" },
  ];

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Theo Dõi Đơn Hoàn</h1>
        <p className="mt-0.5 text-sm text-slate-500">Quản lý và theo dõi đơn hàng đang hoàn</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => handleSetActiveTab(tab.key)} style={{ background: activeTab === tab.key ? tab.bgColor : "#fff", border: `1.5px solid ${activeTab === tab.key ? tab.borderColor : "#e5e7eb"}`, borderRadius: "12px", padding: "16px 20px", cursor: "pointer", textAlign: "left", transition: "all 0.2s", boxShadow: activeTab === tab.key ? `0 2px 8px ${tab.color}20` : "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${tab.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {tab.key === "partial" ? <Package style={{ width: "18px", height: "18px", color: tab.color }} /> : tab.key === "full" ? <Truck style={{ width: "18px", height: "18px", color: tab.color }} /> : <Warehouse style={{ width: "18px", height: "18px", color: tab.color }} />}
              </div>
              <div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: tab.color, lineHeight: 1 }}>{tab.count}</div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px", fontWeight: 500 }}>{tab.label}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:gap-0">
        <div className="flex overflow-x-auto" style={{ borderBottom: "2px solid #e5e7eb" }}>
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => handleSetActiveTab(tab.key)} style={{ padding: "10px 16px", fontSize: "13px", fontWeight: activeTab === tab.key ? 600 : 500, color: activeTab === tab.key ? tab.color : "#6b7280", background: "transparent", border: "none", borderBottom: activeTab === tab.key ? `2px solid ${tab.color}` : "2px solid transparent", marginBottom: "-2px", cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" }}>
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px", padding: "6px 0" }}>
          <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} style={{ fontSize: "12px", padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: "6px", background: "#fff", color: "#374151", outline: "none" }}>
            <option value={20}>20/trang</option>
            <option value={50}>50/trang</option>
            <option value={100}>100/trang</option>
          </select>
          <button onClick={handleExport} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 600, color: "#2563EB", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "8px", padding: "6px 12px", cursor: "pointer" }}>
            <Download style={{ width: "13px", height: "13px" }} /> Xuất CSV
          </button>
        </div>
      </div>

      <ReturnFilterPanel filters={filters} onChange={handleSetFilters} shopNames={allShopNames} activeTab={activeTab} />

      {errorMessage && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" style={{ minHeight: "400px" }}>
        {loading ? (
          <div className="flex flex-1 flex-col animate-pulse">
            <div className="flex items-center gap-4 border-b border-slate-100 px-4 py-3">
              <div className="h-4 w-8 rounded bg-slate-200" />
              <div className="h-4 w-28 rounded bg-slate-200" />
              <div className="h-4 w-24 rounded bg-slate-200" />
              <div className="h-4 flex-1 rounded bg-slate-200" />
              <div className="h-4 w-20 rounded bg-slate-200" />
            </div>
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 border-b border-slate-50 px-4 py-3">
                <div className="h-3 w-8 rounded bg-slate-100" />
                <div className="h-3 w-28 rounded bg-slate-100" />
                <div className="h-3 w-24 rounded bg-slate-100" />
                <div className="h-3 flex-1 rounded bg-slate-100" />
                <div className="h-5 w-20 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {activeTab === "partial" && <PartialReturnTab data={partialData} pageSize={pageSize} onWarehouseConfirm={handleWarehouseConfirm} />}
            {activeTab === "full" && <FullReturnTab data={fullData} pageSize={pageSize} />}
            {activeTab === "warehouse" && <WaitingReturnTab data={warehouseData} pageSize={pageSize} onConfirmAskedToggle={handleConfirmAskedToggle} onCustomerConfirmedToggle={handleCustomerConfirmedToggle} />}
          </>
        )}
      </div>
    </div>
  );
}
