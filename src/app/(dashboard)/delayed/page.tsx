"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useCallback } from "react";
import { ProcessedDelayedOrder } from "@/lib/delay-analyzer";
import { DelayedStatsCards } from "@/components/delayed/DelayedStatsCards";
import { DelayedFilterPanel } from "@/components/delayed/DelayedFilterPanel";
import { DelayedOrderTable } from "@/components/delayed/DelayedOrderTable";
import { PackageX } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const DelayDistributionChart = dynamic(() => import("@/components/delayed/DelayDistributionChart").then(m => ({ default: m.DelayDistributionChart })), { ssr: false, loading: () => <div className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse" /> });
const DelayReasonChart = dynamic(() => import("@/components/delayed/DelayReasonChart").then(m => ({ default: m.DelayReasonChart })), { ssr: false, loading: () => <div className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse" /> });

export default function DelayedOrdersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: {
      orders: ProcessedDelayedOrder[];
      stats: { total: number; high: number; medium: number; low: number; totalCOD: number; highCOD: number };
    }
  }>({
    queryKey: ["delayedOrdersList"],
    queryFn: async () => {
      const res = await fetch("/api/orders/delayed");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 300000,
  });

  // Read initial filter state from URL
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [shopFilter, setShopFilter] = useState(searchParams.get("shop") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [delayCountFilter, setDelayCountFilter] = useState(searchParams.get("delay") || "");
  const [reasonFilter, setReasonFilter] = useState(searchParams.get("reason") || "");
  const [riskFilter, setRiskFilter] = useState<string>(searchParams.get("risk") || "all");

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

  const handleSearchTerm = useCallback((v: string) => { setSearchTerm(v); updateUrl({ search: v }); }, [updateUrl]);
  const handleShopFilter = useCallback((v: string) => { setShopFilter(v); updateUrl({ shop: v }); }, [updateUrl]);
  const handleStatusFilter = useCallback((v: string) => { setStatusFilter(v); updateUrl({ status: v }); }, [updateUrl]);
  const handleDelayCountFilter = useCallback((v: string) => { setDelayCountFilter(v); updateUrl({ delay: v }); }, [updateUrl]);
  const handleReasonFilter = useCallback((v: string) => { setReasonFilter(v); updateUrl({ reason: v }); }, [updateUrl]);
  const handleRiskFilter = useCallback((v: string) => { setRiskFilter(v); updateUrl({ risk: v }); }, [updateUrl]);

  const orders = data?.data?.orders || [];
  const baseStats = data?.data?.stats;

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // 1. Search filter
      const search = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        o.requestCode.toLowerCase().includes(search) ||
        (o.customerOrderCode && o.customerOrderCode.toLowerCase().includes(search)) ||
        (o.carrierOrderCode && o.carrierOrderCode.toLowerCase().includes(search)) ||
        (o.shopName && o.shopName.toLowerCase().includes(search)) ||
        (o.receiverName && o.receiverName.toLowerCase().includes(search)) ||
        (o.receiverPhone && o.receiverPhone.includes(search)) ||
        (o.fullAddress && o.fullAddress.toLowerCase().includes(search));
      
      if (!matchesSearch) return false;

      // 2. Risk filter
      if (riskFilter !== "all" && o.risk !== riskFilter) return false;

      // 3. Shop Filter
      if (shopFilter && o.shopName !== shopFilter) return false;

      // 4. Status Filter
      if (statusFilter && o.status !== statusFilter) return false;

      // 5. Delay Count Filter
      if (delayCountFilter) {
        if (delayCountFilter === "4+" && o.delayCount < 4) return false;
        if (delayCountFilter !== "4+" && o.delayCount.toString() !== delayCountFilter) return false;
      }

      // 6. Reason Filter
      if (reasonFilter && !o.uniqueReasons.includes(reasonFilter)) return false;

      return true;
    });
  }, [orders, searchTerm, riskFilter, shopFilter, statusFilter, delayCountFilter, reasonFilter]);

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
            {/* Pass filteredOrders so charts dynamically react to filters */}
            <DelayDistributionChart orders={filteredOrders} />
            <DelayReasonChart orders={filteredOrders} />
          </div>

          {/* Row 3: Filter & Table */}
          <div className="flex flex-col" style={{ height: 'auto', minHeight: '500px' }}>
            <DelayedFilterPanel 
              orders={orders}
              filteredOrders={filteredOrders}
              searchTerm={searchTerm} setSearchTerm={handleSearchTerm}
              shopFilter={shopFilter} setShopFilter={handleShopFilter}
              statusFilter={statusFilter} setStatusFilter={handleStatusFilter}
              delayCountFilter={delayCountFilter} setDelayCountFilter={handleDelayCountFilter}
              reasonFilter={reasonFilter} setReasonFilter={handleReasonFilter}
              riskFilter={riskFilter} setRiskFilter={handleRiskFilter}
            />
            
            <div className="flex-1 overflow-hidden">
              <DelayedOrderTable data={filteredOrders} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
