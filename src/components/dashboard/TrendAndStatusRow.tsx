"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from "recharts";

const DAYS_OPTIONS = [7, 30, 90];

// Custom colors based on group for status chart
const STATUS_COLORS: Record<string, string> = {
  "Active": "#3B82F6",    // Blue
  "Completed": "#10B981", // Green
  "Problem": "#EF4444",   // Red
  "Returning": "#EAB308", // Yellow
  "Returned": "#F97316",  // Orange
  "Other": "#94A3B8"
};

export function TrendAndStatusRow() {
  const router = useRouter();
  const [trendDays, setTrendDays] = useState(7);
  
  const { data: trendData, isLoading: isLoadingTrend } = useQuery({
    queryKey: ["dashboard-trend", trendDays],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/trend?days=${trendDays}`);
      if (!res.ok) throw new Error("Lỗi tải xu hướng");
      return res.json();
    },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* LEFT: ORDER TREND */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold text-slate-800">Xu hướng đơn hàng</h3>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {DAYS_OPTIONS.map(days => (
              <button
                key={days}
                onClick={() => setTrendDays(days)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  trendDays === days 
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200" 
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {days} ngày
              </button>
            ))}
          </div>
        </div>

        <div className="h-[260px] w-full">
          {isLoadingTrend ? (
            <div className="w-full h-full bg-slate-50 rounded-lg animate-pulse flex items-center justify-center">
              <span className="text-slate-400 text-sm">Đang tải biểu đồ...</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData?.orderTrend || []} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748B' }}
                />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1E293B', marginBottom: '4px' }}
                  itemStyle={{ color: '#3B82F6', fontSize: '13px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  name="Số đơn"
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                  activeDot={{ r: 6, fill: "#3B82F6", stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* RIGHT: STATUS DISTRIBUTION */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <h3 className="text-sm font-semibold text-slate-800">Phân bố trạng thái đơn</h3>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            Tháng này
          </span>
        </div>

        <div className="h-[260px] w-full">
          {isLoadingTrend ? (
            <div className="w-full h-full bg-slate-50 rounded-lg animate-pulse flex items-center justify-center">
              <span className="text-slate-400 text-sm">Đang tải biểu đồ...</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                layout="vertical" 
                data={trendData?.statusDistribution || []} 
                margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="label" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  width={110}
                  tick={{ fontSize: 11, fill: '#475569' }}
                />
                <RechartsTooltip cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }}
                />
                <Bar 
                  dataKey="count" 
                  name="Số lượng" 
                  radius={[0, 4, 4, 0]} 
                  onClick={(data: any) => router.push(`/orders?status=${data.status}`)}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {(trendData?.statusDistribution || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.group] || STATUS_COLORS["Other"]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
