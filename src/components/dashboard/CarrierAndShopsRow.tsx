"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell, CartesianGrid
} from "recharts";

const DAYS_OPTIONS = [7, 30, 90];

const CARRIER_COLORS: Record<string, string> = {
  "GHN": "#2563EB",
  "GTK": "#10B981",
  "SPX": "#8B5CF6",
  "JAT": "#F59E0B",
  "BSI": "#EC4899"
};

export function CarrierAndShopsRow() {
  const router = useRouter();
  const [carrierDays, setCarrierDays] = useState(30);
  const [shopDays, setShopDays] = useState(30);
  
  const { data: carrierData, isLoading: isLoadingCarriers } = useQuery({
    queryKey: ["dashboard-carriers", carrierDays],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/carriers?days=${carrierDays}`);
      if (!res.ok) throw new Error("Lỗi tải nhà cung cấp");
      return res.json();
    },
  });

  const { data: shopsData, isLoading: isLoadingShops } = useQuery({
    queryKey: ["dashboard-shops", shopDays],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/top-shops?days=${shopDays}`);
      if (!res.ok) throw new Error("Lỗi tải D/S Shop");
      return res.json();
    },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* LEFT: CARRIER DISTRIBUTION */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold text-slate-800">Đơn theo Đối tác vận chuyển</h3>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {DAYS_OPTIONS.map(days => (
              <button
                key={days}
                onClick={() => setCarrierDays(days)}
                className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors ${
                  carrierDays === days 
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200" 
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {days} ng
              </button>
            ))}
          </div>
        </div>

        <div className="h-[240px] w-full mt-auto">
          {isLoadingCarriers ? (
            <div className="w-full h-full bg-slate-50 rounded-lg animate-pulse flex items-center justify-center">
              <span className="text-slate-400 text-sm">Đang tải biểu đồ...</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={carrierData?.carrierDistribution || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="carrier" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748B' }}
                />
                <RechartsTooltip 
                  cursor={{fill: '#F8FAFC'}}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                  dataKey="count" 
                  name="Số đơn"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                  onClick={(data: any) => router.push(`/orders?carrier=${data.carrier}`)}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {(carrierData?.carrierDistribution || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={CARRIER_COLORS[entry.carrier] || "#94A3B8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* RIGHT: TOP SHOPS */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-800">Top 5 Cửa Hàng (Theo số đơn)</h3>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {DAYS_OPTIONS.map(days => (
              <button
                key={days}
                onClick={() => setShopDays(days)}
                className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors ${
                  shopDays === days 
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200" 
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {days} ng
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {isLoadingShops ? (
            <div className="flex-1 bg-slate-50 rounded-lg animate-pulse flex items-center justify-center min-h-[150px]">
              <span className="text-slate-400 text-sm">Đang tải D/S shop...</span>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {(shopsData?.topShops || []).map((shop: any, idx: number) => (
                <li 
                  key={idx}
                  onClick={() => router.push(`/finance?shop=${shop.shopName}`)}
                  className="flex items-center p-3 rounded-lg bg-slate-50 hover:bg-blue-50/50 border border-slate-100 transition-colors cursor-pointer group"
                >
                  <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold mr-3 shrink-0 ${
                    idx === 0 ? "bg-yellow-100 text-yellow-600" :
                    idx === 1 ? "bg-slate-200 text-slate-600" :
                    idx === 2 ? "bg-orange-100 text-orange-600" :
                    "bg-blue-50 text-blue-500"
                  }`}>
                    {idx + 1}
                  </div>
                  <span className="text-sm font-medium text-slate-700 truncate flex-1 group-hover:text-blue-700">
                    {shop.shopName}
                  </span>
                  <span className="text-sm font-semibold text-slate-900 ml-3">
                    {shop.count} <span className="text-xs font-normal text-slate-500">đơn</span>
                  </span>
                </li>
              ))}
              {(shopsData?.topShops || []).length === 0 && (
                <li className="text-center py-6 text-sm text-slate-400">Không có dữ liệu</li>
              )}
            </ul>
          )}
        </div>
        
        <button 
          onClick={() => router.push("/finance")}
          className="mt-4 text-xs font-medium text-blue-600 hover:text-blue-800 text-left pt-2 border-t border-slate-100 inline-block w-full"
        >
          Xem tất cả báo cáo cửa hàng →
        </button>
      </div>
    </div>
  );
}
