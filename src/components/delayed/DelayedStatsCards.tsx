"use client";

import { AlertCircle, AlertTriangle, PackageX, ShieldCheck } from "lucide-react";
import type { DelayedSummary } from "@/types/delayed";

export function DelayedStatsCards({ summary }: { summary?: DelayedSummary }) {
  if (!summary) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="absolute -right-4 -top-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 opacity-70">
          <PackageX className="h-8 w-8 text-blue-500" />
        </div>
        <div className="relative z-10 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-sm">
            Tong don hoan
          </h3>
          <div className="text-2xl font-black text-slate-800 sm:text-3xl">{summary.total}</div>
        </div>
        <div className="relative z-10 mt-3 border-t border-slate-100 pt-3 text-xs">
          <span className="font-medium text-slate-500">Tong COD: </span>
          <span className="font-bold text-slate-700">{summary.totalCOD.toLocaleString("vi-VN")}d</span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-red-100 border-l-4 border-l-red-500 bg-white p-4 shadow-sm sm:p-5">
        <div className="absolute -right-4 -bottom-4 flex h-24 w-24 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-10 w-10 text-red-100" />
        </div>
        <div className="relative z-10 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-red-600 sm:text-sm">Nguy co cao</h3>
          <div className="text-2xl font-black text-red-600 sm:text-3xl">{summary.high}</div>
        </div>
        <div className="relative z-10 mt-3 border-t border-red-50 pt-3 text-xs">
          <span className="font-medium text-red-500">COD rui ro: </span>
          <span className="font-bold text-red-700">{summary.highCOD.toLocaleString("vi-VN")}d</span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-amber-100 border-l-4 border-l-amber-500 bg-white p-4 shadow-sm sm:p-5">
        <div className="absolute -right-4 -bottom-4 flex h-24 w-24 items-center justify-center rounded-full bg-amber-50">
          <AlertCircle className="h-10 w-10 text-amber-100" />
        </div>
        <div className="relative z-10 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-amber-600 sm:text-sm">Canh bao</h3>
          <div className="text-2xl font-black text-amber-600 sm:text-3xl">{summary.medium}</div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-emerald-100 border-l-4 border-l-emerald-500 bg-white p-4 shadow-sm sm:p-5">
        <div className="absolute -right-4 -bottom-4 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50">
          <ShieldCheck className="h-10 w-10 text-emerald-100" />
        </div>
        <div className="relative z-10 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-600 sm:text-sm">Nguy co thap</h3>
          <div className="text-2xl font-black text-emerald-600 sm:text-3xl">{summary.low}</div>
        </div>
      </div>
    </div>
  );
}
