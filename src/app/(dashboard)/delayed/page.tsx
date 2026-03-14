"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { ProcessedDelayedOrder } from "@/lib/delay-analyzer";
import { DelayedStatsCards } from "@/components/delayed/DelayedStatsCards";
import { DelayDistributionChart } from "@/components/delayed/DelayDistributionChart";
import { DelayReasonChart } from "@/components/delayed/DelayReasonChart";
import { DelayedFilterPanel } from "@/components/delayed/DelayedFilterPanel";
import { DelayedOrderTable } from "@/components/delayed/DelayedOrderTable";
import { PackageX } from "lucide-react";

export default function DelayedOrdersPage() {
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
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Filtering states
  const [searchTerm, setSearchTerm] = useState("");
  const [shopFilter, setShopFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [delayCountFilter, setDelayCountFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");

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
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <PackageX className="w-8 h-8 text-amber-500" />
            Chăm Sóc Đơn Hoãn
          </h2>
          <p className="text-slate-500 mt-2">
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
          <div className="flex flex-col h-[800px]">
            <DelayedFilterPanel 
              orders={orders}
              filteredOrders={filteredOrders}
              searchTerm={searchTerm} setSearchTerm={setSearchTerm}
              shopFilter={shopFilter} setShopFilter={setShopFilter}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              delayCountFilter={delayCountFilter} setDelayCountFilter={setDelayCountFilter}
              reasonFilter={reasonFilter} setReasonFilter={setReasonFilter}
              riskFilter={riskFilter} setRiskFilter={setRiskFilter}
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
