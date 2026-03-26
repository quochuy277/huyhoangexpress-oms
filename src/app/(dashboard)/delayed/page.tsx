"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useCallback } from "react";
import { ProcessedDelayedOrder } from "@/lib/delay-analyzer";
import { DelayedStatsCards } from "@/components/delayed/DelayedStatsCards";
import { DelayedFilterPanel } from "@/components/delayed/DelayedFilterPanel";
import { DelayedOrderTable } from "@/components/delayed/DelayedOrderTable";
import { PackageX, ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const DelayDistributionChart = dynamic(() => import("@/components/delayed/DelayDistributionChart").then(m => ({ default: m.DelayDistributionChart })), { ssr: false, loading: () => <div className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse" /> });
const DelayReasonChart = dynamic(() => import("@/components/delayed/DelayReasonChart").then(m => ({ default: m.DelayReasonChart })), { ssr: false, loading: () => <div className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse" /> });

const PAGE_SIZE = 50;

export default function DelayedOrdersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read initial filter state from URL
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [shopFilter, setShopFilter] = useState(searchParams.get("shop") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [delayCountFilter, setDelayCountFilter] = useState(searchParams.get("delay") || "");
  const [reasonFilter, setReasonFilter] = useState(searchParams.get("reason") || "");
  const [riskFilter, setRiskFilter] = useState<string>(searchParams.get("risk") || "all");
  const [page, setPage] = useState(1);

  // Build query key from all filters for React Query
  const queryKey = useMemo(() => [
    "delayedOrdersList", { search: searchTerm, shop: shopFilter, status: statusFilter,
      delay: delayCountFilter, reason: reasonFilter, risk: riskFilter, page }
  ], [searchTerm, shopFilter, statusFilter, delayCountFilter, reasonFilter, riskFilter, page]);

  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: {
      orders: ProcessedDelayedOrder[];
      stats: { total: number; high: number; medium: number; low: number; totalCOD: number; highCOD: number };
      pagination: { page: number; pageSize: number; total: number; totalPages: number };
    }
  }>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("pageSize", PAGE_SIZE.toString());
      if (searchTerm) params.set("search", searchTerm);
      if (shopFilter) params.set("shop", shopFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (delayCountFilter) params.set("delay", delayCountFilter);
      if (reasonFilter) params.set("reason", reasonFilter);
      if (riskFilter && riskFilter !== "all") params.set("risk", riskFilter);
      const res = await fetch(`/api/orders/delayed?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 300000,
  });

  // Sync state to URL
  const updateUrl = useCallback((overrides: Record<string, string>) => {
    const current = {
      search: searchTerm, shop: shopFilter, status: statusFilter,
      delay: delayCountFilter, reason: reasonFilter, risk: riskFilter,
      ...overrides,
    };
    const params = new URLSearchParams();
    if (current.search) params.set("search", current.search);
    if (current.shop) params.set("shop", current.shop);
    if (current.status) params.set("status", current.status);
    if (current.delay) params.set("delay", current.delay);
    if (current.reason) params.set("reason", current.reason);
    if (current.risk && current.risk !== "all") params.set("risk", current.risk);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? "?" + qs : ""}`, { scroll: false });
  }, [searchTerm, shopFilter, statusFilter, delayCountFilter, reasonFilter, riskFilter, pathname, router]);

  const handleFilterChange = useCallback((setter: (v: string) => void, key: string) => {
    return (v: string) => { setter(v); setPage(1); updateUrl({ [key]: v }); };
  }, [updateUrl]);

  const handleSearchTerm = useCallback((v: string) => { setSearchTerm(v); setPage(1); updateUrl({ search: v }); }, [updateUrl]);
  const handleShopFilter = handleFilterChange(setShopFilter, "shop");
  const handleStatusFilter = handleFilterChange(setStatusFilter, "status");
  const handleDelayCountFilter = handleFilterChange(setDelayCountFilter, "delay");
  const handleReasonFilter = handleFilterChange(setReasonFilter, "reason");
  const handleRiskFilter = handleFilterChange(setRiskFilter, "risk");

  const orders = data?.data?.orders || [];
  const baseStats = data?.data?.stats;
  const pagination = data?.data?.pagination;

  if (error) {
    return <div className="p-8 text-center text-red-500">Lỗi biên dịch dữ liệu hoãn giao. Vui lòng thử lại sau.</div>;
  }

  return (
    <div className="flex-1 space-y-6 pt-2 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <PackageX className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
            Chăm Sóc Đơn Hoãn
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-2">
            Phân tích tự động nội dung Ghi chú đa luồng để tìm ra tần suất và lý do hoãn giao thực sự.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Đang phân tích dữ liệu hoãn giao...</p>
        </div>
      ) : (
        <>
          {/* Row 1: Stats */}
          <DelayedStatsCards stats={baseStats} />

          {/* Row 2: Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DelayDistributionChart orders={orders} />
            <DelayReasonChart orders={orders} />
          </div>

          {/* Row 3: Filter & Table */}
          <div className="flex flex-col" style={{ height: 'auto', minHeight: '500px' }}>
            <DelayedFilterPanel 
              orders={orders}
              filteredOrders={orders}
              searchTerm={searchTerm} setSearchTerm={handleSearchTerm}
              shopFilter={shopFilter} setShopFilter={handleShopFilter}
              statusFilter={statusFilter} setStatusFilter={handleStatusFilter}
              delayCountFilter={delayCountFilter} setDelayCountFilter={handleDelayCountFilter}
              reasonFilter={reasonFilter} setReasonFilter={handleReasonFilter}
              riskFilter={riskFilter} setRiskFilter={handleRiskFilter}
            />
            
            <div className="flex-1 overflow-hidden">
              <DelayedOrderTable data={orders} />
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-2">
                <p className="text-sm text-slate-500">
                  Hiển thị {((pagination.page - 1) * pagination.pageSize) + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} / {pagination.total} đơn
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium text-slate-700 min-w-[80px] text-center">
                    Trang {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={page >= pagination.totalPages}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

