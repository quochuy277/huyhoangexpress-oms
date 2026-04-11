"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useCallback } from "react";
import {
  Store, Star, Sparkles, AlertTriangle, XCircle,
  Phone, MessageSquare, Mail, Handshake, Settings, FileText,
  Search, ChevronLeft, ChevronRight, Eye, TrendingUp, TrendingDown, Minus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CareLogDialog } from "./CareLogDialog";
import dynamic from "next/dynamic";

const ShopDetailPanel = dynamic(() => import("./ShopDetailPanel").then(m => ({ default: m.ShopDetailPanel })), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-muted rounded" />,
});

interface ShopManagementTabProps {
  userRole: string;
  userId: string;
  userName: string;
  canManageCRM: boolean;
  canEditShopInfo: boolean;
  initialData?: any;
}

const CLASS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  VIP: { label: "VIP", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  NORMAL: { label: "Thường", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  NEW: { label: "Mới", color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
  WARNING: { label: "Cảnh báo", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  INACTIVE: { label: "Ngừng", color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
};

const CONTACT_ICONS: Record<string, React.ReactNode> = {
  PHONE_CALL: <Phone className="w-3.5 h-3.5" />,
  MESSAGE: <MessageSquare className="w-3.5 h-3.5" />,
  EMAIL: <Mail className="w-3.5 h-3.5" />,
  IN_PERSON: <Handshake className="w-3.5 h-3.5" />,
  SYSTEM: <Settings className="w-3.5 h-3.5" />,
  OTHER: <FileText className="w-3.5 h-3.5" />,
};

function formatTimeAgo(date: string | Date | null) {
  if (!date) return "—";
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Hôm qua";
  return `${diff} ngày trước`;
}

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

export function ShopManagementTab({ userRole, userId, userName, canManageCRM, canEditShopInfo, initialData }: ShopManagementTabProps) {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [lastContactFilter, setLastContactFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [careLogShop, setCareLogShop] = useState<string | null>(null);

  // Dashboard data
  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ["crm-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/crm/dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
    refetchInterval: 300000,
    initialData: initialData?.dashboard,
  });

  // Shops list
  const { data: shopData, isLoading: shopsLoading } = useQuery({
    queryKey: ["crm-shops", classFilter, lastContactFilter, search, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (classFilter) params.set("class", classFilter);
      if (lastContactFilter) params.set("lastContact", lastContactFilter);
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("pageSize", "20");
      const res = await fetch(`/api/crm/shops?${params}`);
      if (!res.ok) throw new Error("Failed to fetch shops");
      return res.json();
    },
    refetchInterval: 300000,
    initialData: !classFilter && !lastContactFilter && !search && page === 1 ? initialData?.shops : undefined,
  });

  const stats = dashData?.data?.stats;
  const urgentList = dashData?.data?.urgentList || [];
  const recentActivities = dashData?.data?.recentActivities || [];
  const shops = shopData?.data?.shops || [];
  const pagination = shopData?.data?.pagination;

  const handleClassClick = (cls: string) => {
    setClassFilter(classFilter === cls ? "" : cls);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { key: "active", label: "Đang hoạt động", value: stats?.activeShops, icon: Store, color: "border-l-blue-500", textColor: "text-blue-600" },
          { key: "VIP", label: "Shop VIP", value: stats?.vipShops, icon: Star, color: "border-l-purple-500", textColor: "text-purple-600" },
          { key: "NEW", label: "Shop mới", value: stats?.newShops, icon: Sparkles, color: "border-l-green-500", textColor: "text-green-600" },
          { key: "WARNING", label: "Cảnh báo giảm đơn", value: stats?.warningShops, icon: AlertTriangle, color: "border-l-orange-500", textColor: "text-orange-600" },
          { key: "INACTIVE", label: "Ngừng gửi hàng", value: stats?.inactiveShops, icon: XCircle, color: "border-l-red-500", textColor: "text-red-600" },
        ].map((card) => {
          const Icon = card.icon;
          const isClickable = card.key !== "active";
          return (
            <button
              key={card.key}
              onClick={() => isClickable && handleClassClick(card.key)}
              className={cn(
                "bg-white rounded-xl border border-slate-200 border-l-4 p-4 text-left transition-all shadow-sm",
                card.color,
                isClickable && "hover:shadow-md cursor-pointer",
                classFilter === card.key && "ring-2 ring-blue-400"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">{card.label}</span>
                <Icon className={cn("w-4 h-4", card.textColor)} />
              </div>
              <p className={cn("text-2xl font-bold", card.textColor)}>
                {dashLoading ? "..." : (card.value ?? 0)}
              </p>
            </button>
          );
        })}
      </div>

      {/* Row 2: Urgent + Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Urgent */}
        <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-orange-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Cần chăm sóc gấp
          </h3>
          {urgentList.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Không có shop nào cần chú ý 🎉</p>
          ) : (
            <div className="space-y-2">
              {urgentList.slice(0, 5).map((item: { shopName: string; reason: string; lastContactDate: string | null }, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-orange-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.shopName}</p>
                    <p className="text-xs text-orange-600">{item.reason}</p>
                  </div>
                  <button
                    onClick={() => setSelectedShop(item.shopName)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Xem →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Hoạt động gần đây</h3>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Chưa có hoạt động nào</p>
          ) : (
            <div className="space-y-2.5">
              {recentActivities.map((activity: { shopName: string; authorName: string; contactMethod: string; content: string; createdAt: string }, i: number) => (
                <div key={i} className="flex items-start gap-3 py-1">
                  <div className="mt-0.5 text-slate-400">
                    {CONTACT_ICONS[activity.contactMethod] || <FileText className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">
                      <span className="font-medium">{activity.authorName}</span>
                      {" — "}
                      <span className="text-blue-600 cursor-pointer hover:underline" onClick={() => setSelectedShop(activity.shopName)}>
                        {activity.shopName}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 truncate">{activity.content}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{formatTimeAgo(activity.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(searchInput.trim());
            setPage(1);
          }}
          className="flex flex-1 min-w-[200px] items-stretch gap-2"
        >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm tên cửa hàng..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full min-h-11 pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label="Tìm kiếm cửa hàng"
          />
        </div>
        <button
          type="submit"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-blue-600 bg-blue-600 px-3 text-white transition-colors hover:bg-blue-700"
          aria-label="Tìm kiếm cửa hàng"
          title="Tìm kiếm"
        >
          <Search className="w-4 h-4" />
        </button>
        </form>

        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {Object.entries(CLASS_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => handleClassClick(key)}
              className={cn(
                "text-xs px-2.5 py-1.5 rounded-full border font-medium transition-all",
                classFilter === key
                  ? `${cfg.bg} ${cfg.color} ${cfg.border}`
                  : "border-slate-200 text-slate-500 hover:bg-slate-50"
              )}
            >
              {cfg.label}
            </button>
          ))}
        </div>

        <select
          value={lastContactFilter}
          onChange={(e) => { setLastContactFilter(e.target.value); setPage(1); }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">Liên hệ: Tất cả</option>
          <option value="none">Chưa liên hệ</option>
          <option value="14days">&gt;14 ngày</option>
          <option value="7days">&gt;7 ngày</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-medium text-slate-600 w-10">#</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 min-w-[180px]">Tên Cửa Hàng</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 w-24">Phân Loại</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600 w-20 hidden md:table-cell">Xu Hướng</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 w-20">Đơn Tháng</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 w-28">Doanh Thu Tháng</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 w-20">Tỷ Lệ Hoàn</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 w-32">NV Phụ Trách</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 w-28">Liên Hệ Cuối</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 w-20">Tổng Đơn</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600 w-20">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shopsLoading ? (
                <tr><td colSpan={11} className="text-center py-12 text-slate-400">Đang tải...</td></tr>
              ) : shops.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-12 text-slate-400">
                  {shopData?.data?.message || "Không tìm thấy shop nào"}
                </td></tr>
              ) : (
                shops.map((shop: {
                  shopName: string; classification: string; trend: string;
                  ordersThisMonth: number; revenueThisMonth: number; returnRate: number;
                  assignees: Array<{ id: string; name: string }>; lastContactDate: string | null; totalOrders: number;
                }, i: number) => {
                  const cls = CLASS_CONFIG[shop.classification] || CLASS_CONFIG.NORMAL;
                  const contactAge = shop.lastContactDate
                    ? Math.floor((Date.now() - new Date(shop.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
                    : null;

                  return (
                    <tr key={shop.shopName} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-400">{(page - 1) * 20 + i + 1}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedShop(shop.shopName)}
                          className="font-medium text-slate-800 hover:text-blue-600 transition-colors text-left"
                        >
                          {shop.shopName}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", cls.bg, cls.color, cls.border)}>
                          {cls.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center hidden md:table-cell">
                        {shop.trend === "up" && <TrendingUp className="w-4 h-4 text-green-500 inline" />}
                        {shop.trend === "down" && <TrendingDown className="w-4 h-4 text-red-500 inline" />}
                        {shop.trend === "stable" && <Minus className="w-4 h-4 text-slate-400 inline" />}
                        {shop.trend === "new" && <span className="text-xs text-green-600 font-medium">🆕</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{shop.ordersThisMonth}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatVND(shop.revenueThisMonth)}</td>
                      <td className={cn("px-4 py-3 text-right font-medium", shop.returnRate >= 20 && "text-red-600")}>
                        {shop.returnRate}%
                      </td>
                      <td className="px-4 py-3">
                        {shop.assignees.length > 0 ? (
                          <span className="text-xs text-slate-600">
                            {shop.assignees[0].name}
                            {shop.assignees.length > 1 && <span className="text-slate-400"> +{shop.assignees.length - 1}</span>}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "text-xs",
                          contactAge === null ? "text-slate-300" :
                          contactAge > 14 ? "text-red-500 font-medium" :
                          "text-slate-500"
                        )}>
                          {shop.lastContactDate ? formatTimeAgo(shop.lastContactDate) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{shop.totalOrders}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedShop(shop.shopName)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
            <span className="text-xs text-slate-500">
              {(page - 1) * 20 + 1}–{Math.min(page * 20, pagination.total)} / {pagination.total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-slate-600 px-2">
                {page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                disabled={page === pagination.totalPages}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Shop Detail Panel */}
      {selectedShop && (
        <ShopDetailPanel
          shopName={selectedShop}
          userRole={userRole}
          userId={userId}
          userName={userName}
          canManageCRM={canManageCRM}
          canEditShopInfo={canEditShopInfo}
          onClose={() => setSelectedShop(null)}
          onOpenCareLog={(name) => setCareLogShop(name)}
        />
      )}

      {/* Care Log Dialog */}
      {careLogShop && (
        <CareLogDialog
          shopName={careLogShop}
          userId={userId}
          userName={userName}
          onClose={() => {
            setCareLogShop(null);
            queryClient.invalidateQueries({ queryKey: ["crm-shop-detail"] });
          }}
        />
      )}
    </div>
  );
}
