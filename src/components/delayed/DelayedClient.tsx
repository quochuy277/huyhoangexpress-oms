"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { Search, Loader2, AlertTriangle, ShieldCheck, AlertCircle, RefreshCw, FileDown } from "lucide-react";
import { DelayedTable } from "./DelayedTable";

export function DelayedClient({ userRole }: { userRole: string }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [shopFilter, setShopFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [delayCountFilter, setDelayCountFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");

  const { data: fetchResult, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["delayedOrders"],
    queryFn: async () => {
      const res = await fetch("/api/orders/delayed");
      if (!res.ok) throw new Error("Network error");
      return res.json();
    },
    refetchInterval: 300000, // 5 phút reload 1 lần
  });

  const orders = fetchResult?.data || [];

  // 1. Phân loại Thống kê (Stats)
  const stats = useMemo(() => {
    let rawTotal = orders.length;
    let high = 0, medium = 0, low = 0;
    let highCod = 0, totalCod = 0;

    orders.forEach((o: any) => {
      if (o.risk === "high") { high++; highCod += o.codAmount; }
      else if (o.risk === "medium") medium++;
      else low++;
      totalCod += o.codAmount;
    });

    return { rawTotal, high, medium, low, highCod, totalCod };
  }, [orders]);

  // 2. Data cho Biểu đồ
  const chartsData = useMemo(() => {
    if (!orders.length) return { delayCountData: [], reasonData: [] };

    // Phân bố số lần hoãn
    const countMap: Record<string, number> = { "1 lần": 0, "2 lần": 0, "3 lần": 0, "4+ lần": 0 };
    orders.forEach((o: any) => {
      if (o.delayCount >= 4) countMap["4+ lần"]++;
      else countMap[`${o.delayCount} lần`]++;
    });
    const delayCountData = Object.entries(countMap).map(([name, value]) => ({ name, value }));

    // Top lý do hoãn
    const rMap: Record<string, number> = {};
    orders.forEach((o: any) => {
      o.uniqueReasons.forEach((r: string) => {
        rMap[r] = (rMap[r] || 0) + 1;
      });
    });
    const reasonData = Object.entries(rMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Lấy Top 5

    return { delayCountData, reasonData };
  }, [orders]);

  // 2b. Lấy danh sách duy nhất cho các bộ lọc
  const filterOptions = useMemo(() => {
    const shops = Array.from(new Set(orders.map((o: any) => o.shopName).filter(Boolean))) as string[];
    const statuses = Array.from(new Set(orders.map((o: any) => o.status).filter(Boolean))) as string[];
    const allReasons = new Set<string>();
    orders.forEach((o: any) => o.uniqueReasons.forEach((r: string) => allReasons.add(r)));
    const reasons = Array.from(allReasons).sort();

    return { shops: shops.sort(), statuses: statuses.sort(), reasons };
  }, [orders]);

  // 3. Lọc dữ liệu Table
  const filteredOrders = useMemo(() => {
    return orders.filter((o: any) => {
      // Filter by risk
      if (riskFilter !== "all" && o.risk !== riskFilter) return false;
      
      // Filter by Search (Mã yêu cầu, Mã Đơn, Tên Khách, SĐT, Shop)
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        const combinedString = `${o.requestCode} ${o.carrierOrderCode} ${o.receiverName} ${o.receiverPhone} ${o.shopName}`.toLowerCase();
        if (!combinedString.includes(lowerSearch)) return false;
      }

      // New Filters
      if (shopFilter && o.shopName !== shopFilter) return false;
      if (statusFilter && o.status !== statusFilter) return false;
      if (delayCountFilter) {
        if (delayCountFilter === "4+") {
          if (o.delayCount < 4) return false;
        } else if (o.delayCount !== parseInt(delayCountFilter)) {
          return false;
        }
      }
      if (reasonFilter && !o.uniqueReasons.includes(reasonFilter)) return false;

      return true;
    });
  }, [orders, riskFilter, searchTerm, shopFilter, statusFilter, delayCountFilter, reasonFilter]);

  const resetFilters = () => {
    setSearchTerm("");
    setRiskFilter("all");
    setShopFilter("");
    setStatusFilter("");
    setDelayCountFilter("");
    setReasonFilter("");
  };

  // 4. Xuất Excel (lazy load xlsx)
  const exportToExcel = async () => {
    const XLSX = await import("xlsx");
    const dataToExport = filteredOrders.map((o: any, i: number) => ({
      "STT": i + 1,
      "Mã Yêu Cầu": o.requestCode,
      "Mã Đơn ĐT": o.carrierOrderCode || "",
      "Shop": o.shopName,
      "Người Nhận": o.receiverName,
      "SĐT": o.receiverPhone,
      "Địa Chỉ": o.fullAddress,
      "Trạng Thái": o.status,
      "Hoãn": o.delayCount,
      "Ngày Tạo": o.createdTime ? new Date(o.createdTime).toLocaleDateString("vi-VN") : "",
      "Lý Do": o.uniqueReasons.join(", "),
      "Mức Độ Rủi Ro": o.risk === "high" ? "CAO" : o.risk === "medium" ? "TRUNG BÌNH" : "THẤP",
      "Thu Hộ": o.codAmount
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Don_Hoan");
    XLSX.writeFile(wb, `PhanTichDonHoan_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            📦 Phân Tích Đơn Hoãn Giao
          </h1>
          <p className="text-slate-500 mt-1">
            Hệ thống nhận diện & chấm điểm Rủi ro (AI Scoring) các đơn gặp sự cố giao hàng.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-4 py-2 border border-slate-200 bg-white text-slate-600 rounded-lg hover:bg-slate-50 flex items-center gap-2 font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} /> 
            Làm mới
          </button>
          
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 flex items-center gap-2 font-semibold transition-all shadow-md shadow-blue-500/20"
          >
            <FileDown className="w-4 h-4" /> 
            Xuất Excel {filteredOrders.length > 0 && `(${filteredOrders.length})`}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col xl:flex-row min-h-0 gap-5">
        {/* Left Column: Stats & Charts */}
        <div className="w-full xl:w-[350px] 2xl:w-[450px] flex flex-col gap-5 shrink-0 overflow-y-auto pr-1">
          {/* Card 1: Risk Stats Base */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-blue-500">
              <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Tổng Đơn Hoãn</h3>
              <div className="text-2xl font-black text-slate-800 mt-1">{stats.rawTotal}</div>
              <p className="text-[11px] text-slate-400 mt-1 font-medium bg-slate-50 inline-block px-1.5 py-0.5 rounded">COD: {(stats.totalCod/1000000).toFixed(1)}Tr</p>
            </div>
            
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 border-t-4 border-t-red-500 shadow-[inset_0_1px_4px_rgba(239,68,68,0.1)] relative overflow-hidden">
              <AlertTriangle className="absolute -right-2 -bottom-2 w-16 h-16 text-red-500/10" />
              <h3 className="text-[12px] font-bold text-red-600 uppercase tracking-wider">Nguy Cơ Cao</h3>
              <div className="text-2xl font-black text-red-600 mt-1">{stats.high} <span className="text-sm font-medium text-red-400">đơn</span></div>
              <p className="text-[11px] text-red-500 mt-1 font-semibold">Rủi ro {stats.highCod.toLocaleString("vi-VN")}đ</p>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 border-t-4 border-t-amber-500 relative overflow-hidden">
              <AlertCircle className="absolute -right-3 -bottom-3 w-16 h-16 text-amber-500/10" />
              <h3 className="text-[12px] font-bold text-amber-600 uppercase tracking-wider">Cảnh Báo (T.Bình)</h3>
              <div className="text-2xl font-black text-amber-600 mt-1">{stats.medium}</div>
            </div>
            
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 border-t-4 border-t-emerald-500 relative overflow-hidden">
              <ShieldCheck className="absolute -right-2 -bottom-2 w-16 h-16 text-emerald-500/10" />
              <h3 className="text-[12px] font-bold text-emerald-600 uppercase tracking-wider">Nguy Cơ Thấp</h3>
              <div className="text-2xl font-black text-emerald-600 mt-1">{stats.low}</div>
            </div>
          </div>

          {/* Biểu đồ phân bố lần hoãn */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex-1 min-h-[220px]">
            <h3 className="text-[13px] font-bold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Phân Bố Số Lần Hoãn
            </h3>
            {isLoading ? (
               <div className="h-[150px] flex items-center justify-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin"/></div>
            ) : chartsData.delayCountData.length > 0 ? (
              <div className="h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartsData.delayCountData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{fill: '#f1f5f9'}}
                      contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {
                        chartsData.delayCountData.map((entry, index) => {
                          const c = entry.name === '4+ lần' ? '#ef4444' : entry.name === '3 lần' ? '#f59e0b' : entry.name === '2 lần' ? '#3b82f6' : '#10b981';
                          return <Cell key={`cell-${index}`} fill={c} />;
                        })
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[150px] flex items-center justify-center text-sm text-slate-400 italic">Không có dữ liệu</div>
            )}
          </div>

          {/* Top lý do */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm min-h-[240px]">
            <h3 className="text-[13px] font-bold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Top 5 Lý Do Hoãn Nhiều Nhất
            </h3>
            {isLoading ? (
                <div className="h-[150px] flex items-center justify-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin"/></div>
            ) : chartsData.reasonData.length > 0 ? (
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartsData.reasonData} layout="vertical" margin={{ top: 0, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={110} tick={{fontSize: 10, fill: '#475569', fontWeight: 500}} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{fill: '#f1f5f9'}}
                      contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px'}}
                    />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={16}>
                      {
                        chartsData.reasonData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : index === 1 ? '#6366f1' : '#818cf8'} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
                <div className="h-[150px] flex items-center justify-center text-sm text-slate-400 italic">Không có dữ liệu</div>
            )}
          </div>
        </div>

        {/* Right Column: Table & Filters */}
        <div className="flex-1 flex flex-col min-h-[600px] min-w-0">
          
          {/* Filters Panel - Premium Version */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 mb-5 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-2xl"></div>
            
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <span className="p-1 bg-slate-100 rounded-md"><Search className="w-4 h-4 text-slate-500" /></span>
                  Công cụ tìm kiếm & Lọc nâng cao
                </h3>
                <button 
                  onClick={resetFilters}
                  className="text-[12px] font-semibold text-slate-400 hover:text-blue-600 flex items-center gap-1.5 transition-colors p-1 px-2 hover:bg-blue-50 rounded-md"
                >
                  <RefreshCw className="w-3 h-3" />
                  Đặt lại bộ lọc
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tìm kiếm thông tin</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="SĐT, Mã đơn, khách..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all font-medium text-slate-700 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Cửa hàng</label>
                  <select 
                    value={shopFilter}
                    onChange={(e) => setShopFilter(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  >
                    <option value="">Tất cả cửa hàng</option>
                    {filterOptions.shops.map((s: string) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Trạng thái</label>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  >
                    <option value="">Tất cả trạng thái</option>
                    {filterOptions.statuses.map((s: string) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Số lần hoãn</label>
                  <select 
                    value={delayCountFilter}
                    onChange={(e) => setDelayCountFilter(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  >
                    <option value="">Tất cả</option>
                    <option value="1">1 lần</option>
                    <option value="2">2 lần</option>
                    <option value="3">3 lần</option>
                    <option value="4+">4+ lần</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Lý do chính</label>
                  <select 
                    value={reasonFilter}
                    onChange={(e) => setReasonFilter(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  >
                    <option value="">Tất cả lý do</option>
                    {filterOptions.reasons.map((r: string) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 flex-wrap gap-4">
                <div className="flex items-center gap-2 p-1 bg-slate-100/50 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
                  <button 
                    onClick={() => setRiskFilter('all')}
                    className={`px-5 py-2 rounded-lg text-[13px] font-bold transition-all whitespace-nowrap ${riskFilter === 'all' ? 'bg-white shadow-md text-slate-800 ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                  >
                    Mọi nguy cơ
                  </button>
                  <button 
                    onClick={() => setRiskFilter('high')}
                    className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all whitespace-nowrap flex items-center gap-2 ${riskFilter === 'high' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'text-red-500 hover:bg-red-50'}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${riskFilter === "high" ? "bg-white animate-pulse" : "bg-red-500"}`}></div>
                    Rủi ro cao
                  </button>
                  <button 
                    onClick={() => setRiskFilter('medium')}
                    className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all whitespace-nowrap flex items-center gap-2 ${riskFilter === 'medium' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'text-amber-500 hover:bg-amber-50'}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${riskFilter === "medium" ? "bg-white" : "bg-amber-500"}`}></div>
                    Trung bình
                  </button>
                  <button 
                    onClick={() => setRiskFilter('low')}
                    className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all whitespace-nowrap flex items-center gap-2 ${riskFilter === 'low' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'text-emerald-500 hover:bg-emerald-50'}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${riskFilter === "low" ? "bg-white" : "bg-emerald-500"}`}></div>
                    Rủi ro thấp
                  </button>
                </div>

                <div className="text-[12px] text-slate-500 font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  Kết quả: <b className="text-blue-600">{filteredOrders.length}</b> / {orders.length} đơn hàng
                </div>
              </div>
            </div>
          </div>

          <DelayedTable data={filteredOrders} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
