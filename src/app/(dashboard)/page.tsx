import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatVND } from "@/lib/utils";
import { Package, TrendingUp, AlertCircle, RotateCcw } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tổng Quan" };

export default async function DashboardPage() {
  const session = await auth();
  const isManagerOrAdmin =
    session?.user?.role === "ADMIN" || session?.user?.role === "MANAGER";

  // Fast aggregation queries
  const [orderStats, delayedCount, returnCount, claimCount] = await Promise.all([
    prisma.order.aggregate({
      _count: { id: true },
      _sum: { codAmount: true, shippingFee: true, carrierFee: true },
    }),
    prisma.order.count({
      where: {
        deliveryStatus: { in: ["DELIVERY_DELAYED", "RETURN_DELAYED"] },
      },
    }),
    prisma.order.count({
      where: {
        deliveryStatus: { in: ["RETURN_CONFIRMED", "RETURNING_FULL"] },
      },
    }),
    prisma.claimOrder.count({
      where: { claimStatus: { in: ["PENDING", "SUBMITTED", "IN_REVIEW"] } },
    }),
  ]);

  const totalOrders = orderStats._count.id;
  const revenue = orderStats._sum.shippingFee ?? 0;
  const cost = orderStats._sum.carrierFee ?? 0;
  const profit = revenue - cost;

  const statsCards = [
    {
      label: "Tổng Đơn Hàng",
      value: totalOrders.toLocaleString("vi-VN"),
      icon: Package,
      color: "bg-blue-500",
      bg: "bg-blue-50",
      text: "text-blue-600",
    },
    {
      label: "Đơn Hoãn Giao",
      value: delayedCount.toLocaleString("vi-VN"),
      icon: AlertCircle,
      color: "bg-red-500",
      bg: "bg-red-50",
      text: "text-red-600",
    },
    {
      label: "Đang Hoàn Hàng",
      value: returnCount.toLocaleString("vi-VN"),
      icon: RotateCcw,
      color: "bg-amber-500",
      bg: "bg-amber-50",
      text: "text-amber-600",
    },
    {
      label: "Khiếu Nại Đang Xử Lý",
      value: claimCount.toLocaleString("vi-VN"),
      icon: TrendingUp,
      color: "bg-purple-500",
      bg: "bg-purple-50",
      text: "text-purple-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Tổng Quan</h1>
        <p className="text-slate-500 text-sm mt-1">
          Xin chào, {session?.user?.name} 👋
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Icon className={`w-4 h-4 ${stat.text}`} />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Financial (Manager/Admin only) */}
      {isManagerOrAdmin && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800 mb-4">
            Tổng Quan Tài Chính
          </h2>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-slate-500">Doanh Thu</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {formatVND(revenue)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Chi Phí</p>
              <p className="text-2xl font-bold text-red-500 mt-1">
                {formatVND(cost)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Lợi Nhuận</p>
              <p
                className={`text-2xl font-bold mt-1 ${profit >= 0 ? "text-blue-600" : "text-red-600"}`}
              >
                {formatVND(profit)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {(delayedCount > 0 || returnCount > 0 || claimCount > 0) && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800 mb-4">
            Cảnh Báo Cần Chú Ý
          </h2>
          <div className="space-y-3">
            {delayedCount > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>{delayedCount}</strong> đơn đang bị hoãn giao —{" "}
                  <a href="/delayed" className="underline font-medium">
                    Xem ngay
                  </a>
                </span>
              </div>
            )}
            {returnCount > 0 && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span>
                  <strong>{returnCount}</strong> đơn đang trong quá trình hoàn —{" "}
                  <a href="/returns" className="underline font-medium">
                    Xem ngay
                  </a>
                </span>
              </div>
            )}
            {claimCount > 0 && (
              <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700">
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span>
                  <strong>{claimCount}</strong> khiếu nại đang chờ xử lý —{" "}
                  <a href="/claims" className="underline font-medium">
                    Xem ngay
                  </a>
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
