"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { formatVND } from "@/lib/utils";
import { CreditCard, TrendingDown, ArrowUpRight, TrendingUp } from "lucide-react";

export function FinanceCardsRow() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/summary");
      if (!res.ok) throw new Error("Lấy dữ liệu thất bại");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-50 border border-slate-200 rounded-none p-4 h-[116px] animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-1/3 mb-4"></div>
            <div className="h-8 bg-slate-200 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-slate-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  // Only render if data has finance fields (meaning Admin/Manager)
  if (!data || data.revenue === undefined) {
    return null;
  }

  const rCurrent = data.revenue?.current || 0;
  const rPrev = data.revenue?.previousMonth || 0;
  let rDiff = 0;
  if (rPrev > 0) rDiff = ((rCurrent - rPrev) / rPrev) * 100;

  const oCurrent = data.monthOrderCount?.current || 0;
  const oPrev = data.monthOrderCount?.previousMonth || 0;
  let oDiff = 0;
  if (oPrev > 0) oDiff = ((oCurrent - oPrev) / oPrev) * 100;

  const cards = [
    {
      label: "Doanh thu tháng này",
      value: formatVND(rCurrent),
      valueColor: "text-blue-600",
      borderColor: "border-l-blue-600",
      icon: <TrendingUp className="w-5 h-5 text-blue-500 opacity-60" />,
      subtitle: (
        <span className={rDiff >= 0 ? "text-emerald-500 font-medium" : "text-red-500 font-medium"}>
          {rDiff > 0 ? "+" : ""}{rDiff.toFixed(1)}% so với tháng trước
        </span>
      ),
      onClick: () => router.push("/finance"),
    },
    {
      label: "Chi phí tháng này (Tạm)",
      value: formatVND(data.cost?.current || 0),
      valueColor: "text-red-600",
      borderColor: "border-l-red-500",
      icon: <TrendingDown className="w-5 h-5 text-red-500 opacity-60" />,
      subtitle: <span className="text-slate-500">Phí đối tác vận chuyển</span>, // Placeholder before full finance module
      onClick: () => router.push("/finance"),
    },
    {
      label: "Tổng đơn trong tháng",
      value: oCurrent.toLocaleString("vi-VN"),
      valueColor: "text-emerald-600",
      borderColor: "border-l-emerald-500",
      icon: <ArrowUpRight className="w-5 h-5 text-emerald-500 opacity-60" />,
      subtitle: (
        <span className={oDiff >= 0 ? "text-emerald-500 font-medium" : "text-red-500 font-medium"}>
          {oDiff > 0 ? "+" : ""}{oDiff.toFixed(1)}% so với tháng trước
        </span>
      ),
      onClick: () => router.push("/orders"),
    },
    {
      label: "Đơn doanh thu âm tháng này",
      value: (data.negativeRevenueCount || 0).toLocaleString("vi-VN"),
      valueColor: "text-yellow-600",
      borderColor: "border-l-yellow-500",
      icon: <CreditCard className="w-5 h-5 text-yellow-500 opacity-60" />,
      subtitle: <span className="text-blue-600 font-medium group-hover:underline">Xem chi tiết →</span>,
      onClick: () => router.push("/finance?tab=negative-revenue"),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((c, idx) => (
        <div
          key={idx}
          onClick={c.onClick}
          className={`bg-white hover:bg-slate-50 border-y border-r border-slate-200 border-l-[3px] ${c.borderColor} shadow-sm rounded-r-xl p-4 cursor-pointer transition-colors group flex flex-col justify-between`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{c.label}</p>
            {c.icon}
          </div>
          <div>
            <h3 className={`text-[26px] font-semibold leading-none mb-1 ${c.valueColor}`}>
              {c.value}
            </h3>
            <p className="text-[11px] truncate mt-1">
              {c.subtitle}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
