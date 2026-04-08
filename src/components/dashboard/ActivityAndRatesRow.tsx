"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export function ActivityAndRatesRow({ initialSummaryData }: { initialSummaryData?: any }) {
  const { data: summaryData, isLoading: isLoadingRates } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/summary");
      if (!res.ok) throw new Error("Lỗi tải data rates");
      return res.json();
    },
    initialData: initialSummaryData,
  });

  const { data: actData, isLoading: isLoadingAct } = useQuery({
    queryKey: ["dashboard-activities"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/activities");
      if (!res.ok) throw new Error("Lỗi tải hoạt động");
      return res.json();
    },
  });

  const sRate = summaryData?.deliveryRates?.successRate || 0;
  const rRate = summaryData?.deliveryRates?.returnRate || 0;
  const dRate = summaryData?.deliveryRates?.delayRate || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* LEFT: RECENT ACTIVITIES */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-sm flex flex-col">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Hoạt động gần đây</h3>
        <div className="flex-1 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar space-y-4">
          {isLoadingAct ? (
            <div className="w-full bg-slate-50 rounded-lg animate-pulse h-full flex items-center justify-center min-h-[150px]">
              <span className="text-slate-400 text-sm">Đang tải log...</span>
            </div>
          ) : (actData?.recentActivities || []).length === 0 ? (
            <div className="text-center py-6 text-sm text-slate-400">Chưa có hoạt động nào</div>
          ) : (
            (actData?.recentActivities || []).map((act: any, idx: number) => {
              const dateObj = new Date(act.timestamp);
              return (
                <div key={idx} className="flex gap-3 relative">
                  {/* Timeline line */}
                  {idx !== actData.recentActivities.length - 1 && (
                    <div className="absolute left-[7px] top-[24px] bottom-[-16px] w-[2px] bg-slate-100" />
                  )}
                  <div className={`w-4 h-4 rounded-full border-2 border-white shadow-sm shrink-0 mt-0.5 z-10 ${
                    act.type === 'UPLOAD' ? 'bg-blue-500' :
                    act.type === 'CLAIM' ? 'bg-rose-500' :
                    act.type === 'RETURN' ? 'bg-amber-500' :
                    act.type === 'TODO' ? 'bg-purple-500' : 'bg-slate-400'
                  }`} />
                  <div className="flex-1 pb-1">
                    <p className="text-sm text-slate-700 leading-snug">
                      <span className="font-semibold text-slate-900">{act.user}</span> {act.description}
                    </p>
                    {act.action && (
                      <p className="text-xs text-slate-500 mt-0.5">{act.action}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      {formatDistanceToNow(dateObj, { addSuffix: true, locale: vi })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT: DELIVERY RATES */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-sm flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-8">
          <h3 className="text-sm font-semibold text-slate-800">Tỷ lệ giao hàng</h3>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            Tháng này
          </span>
        </div>

        {isLoadingRates ? (
          <div className="flex-1 bg-slate-50 rounded-lg animate-pulse min-h-[120px]" />
        ) : (
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            <div className="flex flex-col items-center justify-center p-2 text-center">
              <span className="text-[32px] md:text-[36px] font-semibold text-emerald-500 leading-tight">
                {sRate.toFixed(1)}%
              </span>
              <span className="text-[11px] text-slate-500 mt-1 uppercase tracking-wide font-medium">Giao thành công</span>
            </div>
            <div className="flex flex-col items-center justify-center p-2 text-center">
              <span className="text-[32px] md:text-[36px] font-semibold text-red-500 leading-tight">
                {rRate.toFixed(1)}%
              </span>
              <span className="text-[11px] text-slate-500 mt-1 uppercase tracking-wide font-medium">Tỷ lệ hoàn</span>
            </div>
            <div className="flex flex-col items-center justify-center p-2 text-center">
              <span className="text-[32px] md:text-[36px] font-semibold text-yellow-500 leading-tight">
                {dRate.toFixed(1)}%
              </span>
              <span className="text-[11px] text-slate-500 mt-1 uppercase tracking-wide font-medium">Tỷ lệ hoãn</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
