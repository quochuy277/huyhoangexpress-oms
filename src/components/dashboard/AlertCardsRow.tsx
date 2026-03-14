"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Package, AlertCircle, RotateCcw, FileWarning } from "lucide-react";

export function AlertCardsRow() {
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
          <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 h-[116px] animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-1/3 mb-4"></div>
            <div className="h-8 bg-slate-200 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-slate-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  // Calculation for today vs yesterday
  const tCount = data?.todayOrderCount || 0;
  const yCount = data?.yesterdayOrderCount || 0;
  let pctDiff = 0;
  if (yCount > 0) pctDiff = ((tCount - yCount) / yCount) * 100;

  const cards = [
    {
      label: "Tổng đơn hôm nay",
      value: tCount.toLocaleString("vi-VN"),
      color: "text-blue-600",
      icon: <Package className="w-5 h-5 text-blue-500 opacity-80" />,
      subtitle: (
        <span className={pctDiff >= 0 ? "text-emerald-500 font-medium" : "text-red-500 font-medium"}>
          {pctDiff > 0 ? "+" : ""}{pctDiff.toFixed(1)}% so với hôm qua
        </span>
      ),
      onClick: () => router.push("/orders"),
    },
    {
      label: "Đơn cần chăm sóc",
      value: (data?.delayedCareCount || 0).toLocaleString("vi-VN"),
      color: "text-red-600",
      icon: <AlertCircle className="w-5 h-5 text-red-500 opacity-80" />,
      subtitle: <span className="text-slate-500">Hoãn giao + Xác nhận hoàn</span>,
      onClick: () => router.push("/delayed"),
    },
    {
      label: "Đơn đang hoàn",
      value: (data?.returningCount || 0).toLocaleString("vi-VN"),
      color: "text-yellow-600",
      icon: <RotateCcw className="w-5 h-5 text-yellow-500 opacity-80" />,
      subtitle: <span className="text-slate-500">Hoãn trả + Đang chuyển kho trả</span>,
      onClick: () => router.push("/returns"),
    },
    {
      label: "Khiếu nại quá hạn",
      value: (data?.overdueClaimsCount || 0).toLocaleString("vi-VN"),
      color: "text-red-600",
      icon: <FileWarning className="w-5 h-5 text-red-500 opacity-80" />,
      subtitle: (
        <span className={(data?.overdueClaimsCount || 0) > 0 ? "text-red-500 font-medium" : "text-emerald-500"}>
          Cần xử lý ngay
        </span>
      ),
      onClick: () => router.push("/claims"),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((c, idx) => (
        <div
          key={idx}
          onClick={c.onClick}
          className="bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-4 cursor-pointer transition-colors group shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{c.label}</p>
            {c.icon}
          </div>
          <div>
            <h3 className={`text-[28px] font-semibold leading-none mb-1 group-hover:scale-[1.02] transform transition-transform origin-left ${c.color}`}>
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
