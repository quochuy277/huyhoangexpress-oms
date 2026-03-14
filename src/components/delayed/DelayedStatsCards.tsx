"use client";

import { AlertTriangle, AlertCircle, ShieldCheck, PackageX } from "lucide-react";

interface StatsCardsProps {
  stats?: {
    total: number;
    high: number;
    medium: number;
    low: number;
    totalCOD: number;
    highCOD: number;
  };
}

export function DelayedStatsCards({ stats }: StatsCardsProps) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* C1: Total */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
        <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center opacity-50 z-0">
          <PackageX className="w-8 h-8 text-blue-500" />
        </div>
        <div className="relative z-10 space-y-2">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Đơn Có Hoãn Giao</h3>
          <div className="text-3xl font-black text-slate-800">{stats.total}</div>
        </div>
        <div className="relative z-10 mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">Tổng COD:</span>
          <span className="font-bold text-slate-700">{stats.totalCOD.toLocaleString("vi-VN")} đ</span>
        </div>
      </div>

      {/* C2: High Risk */}
      <div className="bg-white p-5 rounded-xl border border-red-100 border-l-4 border-l-red-500 shadow-sm relative overflow-hidden flex flex-col justify-between group hover:border-red-200 transition-colors">
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-red-50 rounded-full flex items-center justify-center translate-x-2 translate-y-2 z-0">
          <AlertTriangle className="w-10 h-10 text-red-100 group-hover:scale-110 transition-transform duration-500" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <h3 className="text-sm font-bold text-red-600 uppercase tracking-wide">Nguy Cơ Cao</h3>
          </div>
          <div className="text-3xl font-black text-red-600">{stats.high}</div>
        </div>
        <div className="relative z-10 mt-3 pt-3 border-t border-red-50 flex items-center justify-between text-xs">
          <span className="text-red-500 font-medium">COD rủi ro:</span>
          <span className="font-bold text-red-700">{stats.highCOD.toLocaleString("vi-VN")} đ</span>
        </div>
      </div>

      {/* C3: Medium Risk */}
      <div className="bg-white p-5 rounded-xl border border-amber-100 border-l-4 border-l-amber-500 shadow-sm relative overflow-hidden flex flex-col justify-between group hover:border-amber-200 transition-colors">
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center translate-x-2 translate-y-2 z-0">
          <AlertCircle className="w-10 h-10 text-amber-100 group-hover:scale-110 transition-transform duration-500" />
        </div>
        <div className="relative z-10 space-y-2">
          <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wide">Cảnh Báo</h3>
          <div className="text-3xl font-black text-amber-600">{stats.medium}</div>
        </div>
      </div>

      {/* C4: Low Risk */}
      <div className="bg-white p-5 rounded-xl border border-emerald-100 border-l-4 border-l-emerald-500 shadow-sm relative overflow-hidden flex flex-col justify-between group hover:border-emerald-200 transition-colors">
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center translate-x-2 translate-y-2 z-0">
          <ShieldCheck className="w-10 h-10 text-emerald-100 group-hover:scale-110 transition-transform duration-500" />
        </div>
        <div className="relative z-10 space-y-2">
          <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wide">Nguy Cơ Thấp</h3>
          <div className="text-3xl font-black text-emerald-600">{stats.low}</div>
        </div>
      </div>
    </div>
  );
}
