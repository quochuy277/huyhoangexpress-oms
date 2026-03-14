"use client";

import { ProcessedDelayedOrder } from "@/lib/delay-analyzer";
import { Search, RefreshCw, FileDown } from "lucide-react";
import * as XLSX from "xlsx";

interface Props {
  orders: ProcessedDelayedOrder[];
  filteredOrders: ProcessedDelayedOrder[];
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  shopFilter: string;
  setShopFilter: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  delayCountFilter: string;
  setDelayCountFilter: (s: string) => void;
  reasonFilter: string;
  setReasonFilter: (s: string) => void;
  riskFilter: string;
  setRiskFilter: (s: string) => void;
}

export function DelayedFilterPanel({
  orders,
  filteredOrders,
  searchTerm, setSearchTerm,
  shopFilter, setShopFilter,
  statusFilter, setStatusFilter,
  delayCountFilter, setDelayCountFilter,
  reasonFilter, setReasonFilter,
  riskFilter, setRiskFilter
}: Props) {

  // Extract unique options
  const shopOptions = Array.from(new Set(orders.map(o => o.shopName).filter(Boolean))).sort();
  const statusOptions = Array.from(new Set(orders.map(o => o.status).filter(Boolean))).sort();
  const allReasons = new Set<string>();
  orders.forEach(o => o.uniqueReasons.forEach(r => allReasons.add(r)));
  const reasonOptions = Array.from(allReasons).sort();

  const resetFilters = () => {
    setSearchTerm("");
    setShopFilter("");
    setStatusFilter("");
    setDelayCountFilter("");
    setReasonFilter("");
    setRiskFilter("all");
  };

  const exportToExcel = () => {
    const dataToExport = filteredOrders.map((o, i) => ({
      "STT": i + 1,
      "Mã Yêu Cầu": o.requestCode,
      "Mã Đơn KH": o.customerOrderCode,
      "Mã Đơn Đối Tác": o.carrierOrderCode,
      "Trạng Thái": o.status,
      "Thu Hộ": o.codAmount,
      "Người Nhận": o.receiverName,
      "SĐT": o.receiverPhone,
      "Địa Chỉ": o.fullAddress,
      "Số Lần Hoãn": o.delayCount,
      "Nguy Cơ": o.risk === "high" ? "CAO" : o.risk === "medium" ? "TRUNG BÌNH" : "THẤP"
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Don_Hoan");
    XLSX.writeFile(wb, `PhanTichDonHoan_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-5 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-xl"></div>
      
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Mã đơn, người nhận, SĐT..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700"
            />
          </div>

          {/* Shop */}
          <select 
            value={shopFilter}
            onChange={(e) => setShopFilter(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            <option value="">Tất cả cửa hàng</option>
            {shopOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Status */}
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            <option value="">Tất cả trạng thái</option>
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Delay Count */}
          <select 
            value={delayCountFilter}
            onChange={(e) => setDelayCountFilter(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            <option value="">Tất cả số lần hoãn</option>
            <option value="1">1 lần</option>
            <option value="2">2 lần</option>
            <option value="3">3 lần</option>
            <option value="4+">4+ lần</option>
          </select>

          {/* Reason */}
          <select 
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            <option value="">Tất cả lý do</option>
            {reasonOptions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4 flex-wrap gap-4">
          {/* Risk Buttons */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setRiskFilter('all')}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${riskFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Tất cả
            </button>
            <button 
              onClick={() => setRiskFilter('high')}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-2 ${riskFilter === 'high' ? 'bg-red-500 text-white shadow-md shadow-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'}`}
            >
              <span className={`w-2 h-2 rounded-full ${riskFilter === "high" ? "bg-white" : "bg-red-500"}`}></span>
              🔴 Cao
            </button>
            <button 
              onClick={() => setRiskFilter('medium')}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-2 ${riskFilter === 'medium' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100'}`}
            >
              <span className={`w-2 h-2 rounded-full ${riskFilter === "medium" ? "bg-white" : "bg-amber-500"}`}></span>
              🟡 Trung bình
            </button>
            <button 
              onClick={() => setRiskFilter('low')}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-2 ${riskFilter === 'low' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100'}`}
            >
              <span className={`w-2 h-2 rounded-full ${riskFilter === "low" ? "bg-white" : "bg-emerald-500"}`}></span>
              🟢 Thấp
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={resetFilters}
              className="px-4 py-2 text-[13px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> ↻ Đặt lại
            </button>
            
            <button 
              onClick={exportToExcel}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-[13px] font-semibold transition-all shadow-sm"
            >
              <FileDown className="w-4 h-4" /> ⬇ Xuất Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
