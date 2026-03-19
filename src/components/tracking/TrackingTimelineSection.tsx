"use client";

import { TrackingTimeline } from "@/components/tracking/TrackingTimeline";
import { Package, RefreshCw } from "lucide-react";
import { useState } from "react";

export function TrackingTimelineSection({ requestCode }: { requestCode: string }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden lg:col-span-2">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-slate-700">
            Hành Trình Đơn Hàng
          </h2>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Làm mới
        </button>
      </div>
      <div className="p-4">
        <TrackingTimeline
          key={refreshKey}
          requestCode={requestCode}
          showHeader={false}
        />
      </div>
    </div>
  );
}
