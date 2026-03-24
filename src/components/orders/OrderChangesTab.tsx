"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { OrderDetailDialog } from "@/components/shared/OrderDetailDialog";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  RefreshCw,
  Search,
  X,
  ExternalLink,
  Loader2,
  Info,
} from "lucide-react";
import type { OrderChangeType } from "@prisma/client";

// ============================================================
// Change type configuration
// ============================================================

interface ChangeTypeConfig {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const CHANGE_TYPE_CONFIG: Record<OrderChangeType, ChangeTypeConfig> = {
  STATUS_CHANGE: { label: "Đổi trạng thái", icon: "🔄", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  CARRIER_FEE_CONFIRMED: { label: "XN phí NVC", icon: "💰", color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
  COD_CONFIRMED: { label: "Thanh toán COD", icon: "💵", color: "text-green-700", bgColor: "bg-green-50", borderColor: "border-green-200" },
  SERVICE_FEE_CHANGE: { label: "Đổi tổng phí", icon: "💲", color: "text-cyan-700", bgColor: "bg-cyan-50", borderColor: "border-cyan-200" },
  SURCHARGE_CHANGE: { label: "Đổi phụ phí", icon: "📋", color: "text-indigo-700", bgColor: "bg-indigo-50", borderColor: "border-indigo-200" },
  COD_AMOUNT_CHANGE: { label: "Đổi tiền hàng", icon: "💳", color: "text-pink-700", bgColor: "bg-pink-50", borderColor: "border-pink-200" },
  WEIGHT_CHANGE: { label: "Đổi khối lượng", icon: "⚖️", color: "text-orange-700", bgColor: "bg-orange-50", borderColor: "border-orange-200" },
  CARRIER_SWITCH: { label: "Đổi NVC", icon: "🔀", color: "text-teal-700", bgColor: "bg-teal-50", borderColor: "border-teal-200" },
  RECIPIENT_CHANGE: { label: "Đổi người nhận", icon: "👤", color: "text-sky-700", bgColor: "bg-sky-50", borderColor: "border-sky-200" },
  RETURN_COMPLETED: { label: "Trả hàng", icon: "📦", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
  CLAIM_RELATED: { label: "Khiếu nại/ĐB", icon: "⚠️", color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-200" },
  RETURN_APPROVED: { label: "Duyệt hoàn", icon: "✅", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
  INTERNAL_STATUS_NOTE: { label: "NV đổi TT nội bộ", icon: "🏷️", color: "text-violet-700", bgColor: "bg-violet-50", borderColor: "border-violet-200" },
  STAFF_NOTE: { label: "Ghi chú NV", icon: "📝", color: "text-slate-700", bgColor: "bg-slate-50", borderColor: "border-slate-200" },
  REDELIVER: { label: "Kéo giao lại", icon: "🔁", color: "text-sky-700", bgColor: "bg-sky-50", borderColor: "border-sky-200" },
  OTHER: { label: "Khác", icon: "➕", color: "text-gray-700", bgColor: "bg-gray-50", borderColor: "border-gray-200" },
};

// Stat card rows layout
const STAT_ROW_1: OrderChangeType[] = [
  "STATUS_CHANGE", "CARRIER_FEE_CONFIRMED", "COD_CONFIRMED",
  "SERVICE_FEE_CHANGE", "SURCHARGE_CHANGE", "COD_AMOUNT_CHANGE",
];
const STAT_ROW_2: OrderChangeType[] = [
  "WEIGHT_CHANGE", "CARRIER_SWITCH", "RECIPIENT_CHANGE",
  "RETURN_COMPLETED", "CLAIM_RELATED",
];
const STAT_ROW_3: OrderChangeType[] = [
  "RETURN_APPROVED", "INTERNAL_STATUS_NOTE", "STAFF_NOTE",
  "REDELIVER", "OTHER",
];

const ALL_CHANGE_TYPES = Object.keys(CHANGE_TYPE_CONFIG) as OrderChangeType[];

const CARRIERS = ["GHN", "GTK", "BSI", "JAT", "SPX"];

// ============================================================
// Types
// ============================================================

interface ChangeLogEntry {
  id: string;
  requestCode: string;
  changeType: OrderChangeType;
  previousValue: string | null;
  newValue: string | null;
  changeDetail: string | null;
  changeTimestamp: string | null;
  detectedAt: string;
  order: {
    shopName: string | null;
    carrierName: string | null;
    receiverName: string | null;
    receiverPhone: string | null;
  };
}

interface UploadBatch {
  id: string;
  fileName: string;
  totalRows: number;
  totalChanges: number;
  uploadedAt: string;
  uploadedBy: { name: string };
}

// ============================================================
// Component
// ============================================================

export function OrderChangesTab({ userRole }: { userRole: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // State
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<OrderChangeType[]>([]);
  const [searchCode, setSearchCode] = useState("");
  const [shopFilter, setShopFilter] = useState("");
  const [carrierFilter, setCarrierFilter] = useState("");
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showStatCards, setShowStatCards] = useState(false);
  const [detailRequestCode, setDetailRequestCode] = useState<string | null>(null);

  const page = parseInt(searchParams.get("changePage") || "1", 10);
  const sortBy = searchParams.get("changeSortBy") || "detectedAt";
  const sortOrder = searchParams.get("changeSortOrder") || "desc";

  // Fetch upload batches
  const { data: batchesData } = useQuery<{
    histories: UploadBatch[];
    pagination: { total: number };
  }>({
    queryKey: ["upload-batches"],
    queryFn: async () => {
      const res = await fetch("/api/orders/upload-history?page=1&pageSize=50");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const batches = batchesData?.histories || [];
  const activeBatchId = selectedBatchId || batches[0]?.id || null;
  const activeBatch = batches.find((b) => b.id === activeBatchId);

  // Fetch stats for active batch
  const { data: statsData } = useQuery<{
    totalChanges: number;
    byType: Record<string, number>;
  }>({
    queryKey: ["change-stats", activeBatchId],
    queryFn: async () => {
      const res = await fetch(
        `/api/orders/changes/stats?uploadHistoryId=${activeBatchId}`
      );
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!activeBatchId,
  });

  // Build query params for changes list
  const changesParams = useMemo(() => {
    const params = new URLSearchParams();
    if (activeBatchId) params.set("uploadHistoryId", activeBatchId);
    for (const t of selectedTypes) params.append("changeType", t);
    if (searchCode) params.set("requestCode", searchCode);
    if (shopFilter) params.set("shopName", shopFilter);
    if (carrierFilter) params.set("carrierName", carrierFilter);
    params.set("page", String(page));
    params.set("pageSize", "50");
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);
    return params.toString();
  }, [
    activeBatchId,
    selectedTypes,
    searchCode,
    shopFilter,
    carrierFilter,
    page,
    sortBy,
    sortOrder,
  ]);

  // Fetch changes
  const {
    data: changesData,
    isLoading: loadingChanges,
  } = useQuery<{
    data: ChangeLogEntry[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>({
    queryKey: ["order-changes", changesParams],
    queryFn: async () => {
      const res = await fetch(`/api/orders/changes?${changesParams}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!activeBatchId,
  });

  // Handlers
  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("changePage", String(p));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSort = (col: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (sortBy === col) {
      params.set("changeSortOrder", sortOrder === "asc" ? "desc" : "asc");
    } else {
      params.set("changeSortBy", col);
      params.set("changeSortOrder", "desc");
    }
    params.delete("changePage");
    router.push(`${pathname}?${params.toString()}`);
  };

  const toggleType = (type: OrderChangeType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const clickStatCard = (type: OrderChangeType) => {
    setSelectedTypes([type]);
  };

  // No data state
  if (!activeBatchId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3 max-w-md">
          <Info className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-semibold text-slate-600">
            Chưa có dữ liệu biến động
          </h3>
          <p className="text-sm text-slate-400">
            Dữ liệu biến động sẽ bắt đầu được ghi nhận từ lần upload tiếp theo.
            Hãy upload file Excel ở tab &quot;Đơn hàng&quot; để bắt đầu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 flex flex-col flex-1 min-h-0">
      {/* Header — batch selector */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={activeBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none max-w-[280px]"
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {new Date(b.uploadedAt).toLocaleString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                — {b.fileName}
              </option>
            ))}
          </select>
          {activeBatch && (
            <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
              <span>
                Bởi{" "}
                <span className="font-medium text-slate-700">
                  {activeBatch.uploadedBy.name}
                </span>
              </span>
              <span className="text-slate-300">•</span>
              <span>
                {activeBatch.totalRows.toLocaleString("vi-VN")} đơn
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-semibold text-blue-600">
                {(activeBatch.totalChanges || 0).toLocaleString("vi-VN")} thay đổi
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stat cards — collapsible */}
      <div className="shrink-0">
        <button
          onClick={() => setShowStatCards(!showStatCards)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors mb-1"
        >
          {showStatCards ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
          {showStatCards ? "Ẩn thống kê" : "Hiện thống kê"}
          {statsData && (
            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">
              {statsData.totalChanges.toLocaleString("vi-VN")}
            </span>
          )}
        </button>
        {showStatCards && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            {[STAT_ROW_1, STAT_ROW_2, STAT_ROW_3].map((row, rowIdx) => (
              <div
                key={rowIdx}
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))`,
                }}
              >
                {row.map((type) => {
                  const config = CHANGE_TYPE_CONFIG[type];
                  const count = statsData?.byType[type] || 0;
                  const isActive = selectedTypes.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() => clickStatCard(type)}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg border text-left
                        transition-all duration-150 hover:shadow-sm
                        ${isActive
                          ? `${config.bgColor} ${config.borderColor} ring-1 ring-offset-1 ring-blue-400`
                          : `bg-white border-slate-200 hover:${config.bgColor}`
                        }
                      `}
                    >
                      <span className="text-lg leading-none">{config.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-slate-500 truncate">
                          {config.label}
                        </p>
                        <p className={`text-sm font-bold ${count > 0 ? config.color : "text-slate-300"}`}>
                          {count.toLocaleString("vi-VN")}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search by requestCode */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Mã yêu cầu..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="pl-8 pr-7 py-1.5 text-xs border border-slate-300 rounded-lg w-[160px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            {searchCode && (
              <button
                onClick={() => setSearchCode("")}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X className="w-3 h-3 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>

          {/* Change type multi-select */}
          <div className="relative">
            <button
              onClick={() => setShowTypeDropdown(!showTypeDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Loại thay đổi
              {selectedTypes.length > 0 && (
                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                  {selectedTypes.length}
                </span>
              )}
            </button>
            {showTypeDropdown && (
              <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-2 w-[220px] max-h-[320px] overflow-y-auto">
                <button
                  onClick={() => setSelectedTypes([])}
                  className="w-full text-left px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded mb-1"
                >
                  Bỏ chọn tất cả
                </button>
                {ALL_CHANGE_TYPES.map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-slate-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type)}
                      onChange={() => toggleType(type)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{CHANGE_TYPE_CONFIG[type].icon}</span>
                    <span>{CHANGE_TYPE_CONFIG[type].label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Shop name */}
          <input
            type="text"
            placeholder="Cửa hàng..."
            value={shopFilter}
            onChange={(e) => setShopFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg w-[130px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />

          {/* Carrier */}
          <select
            value={carrierFilter}
            onChange={(e) => setCarrierFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          >
            <option value="">Tất cả NVC</option>
            {CARRIERS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Clear all */}
          {(selectedTypes.length > 0 ||
            searchCode ||
            shopFilter ||
            carrierFilter) && (
              <button
                onClick={() => {
                  setSelectedTypes([]);
                  setSearchCode("");
                  setShopFilter("");
                  setCarrierFilter("");
                }}
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg"
              >
                <X className="w-3 h-3" /> Xóa filter
              </button>
            )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {[
                  { key: "requestCode", label: "Mã Yêu Cầu", w: "w-[140px]", sortable: true },
                  { key: "shop", label: "Cửa Hàng", w: "w-[150px]", sortable: false },
                  { key: "receiver", label: "Người Nhận", w: "w-[140px]", sortable: false },
                  { key: "changeType", label: "Loại Thay Đổi", w: "w-[150px]", sortable: true },
                  { key: "content", label: "Nội Dung Thay Đổi", w: "w-[250px]", sortable: false },
                  { key: "changeTimestamp", label: "Thời Gian", w: "w-[120px]", sortable: true },
                  { key: "carrier", label: "NVC", w: "w-[80px]", sortable: false },
                ].map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left ${col.w} ${col.sortable ? "cursor-pointer hover:text-slate-700 select-none" : ""
                      }`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && (
                        <ArrowUpDown
                          className={`w-3 h-3 ${sortBy === col.key ? "text-blue-500" : "text-slate-300"
                            }`}
                        />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingChanges ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className="h-4 bg-slate-100 rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !changesData?.data?.length ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-12 text-center text-sm text-slate-400"
                  >
                    {statsData?.totalChanges === 0
                      ? "Không có thay đổi nào trong đợt upload này"
                      : "Không tìm thấy kết quả phù hợp với bộ lọc"}
                  </td>
                </tr>
              ) : (
                changesData.data.map((log) => {
                  const config = CHANGE_TYPE_CONFIG[log.changeType];
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      {/* Mã Yêu Cầu */}
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => setDetailRequestCode(log.requestCode)}
                          className="font-mono text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {log.requestCode}
                        </button>
                      </td>
                      {/* Cửa Hàng */}
                      <td className="px-3 py-2.5 text-xs text-slate-700 truncate max-w-[150px]">
                        {log.order.shopName || "—"}
                      </td>
                      {/* Người Nhận */}
                      <td className="px-3 py-2.5">
                        <div className="text-xs text-slate-700 truncate max-w-[140px]">
                          {log.order.receiverName || "—"}
                        </div>
                        {log.order.receiverPhone && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            {log.order.receiverPhone}
                          </div>
                        )}
                      </td>
                      {/* Loại Thay Đổi */}
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${config.bgColor} ${config.color} border ${config.borderColor}`}
                        >
                          <span className="text-sm leading-none">
                            {config.icon}
                          </span>
                          {config.label}
                        </span>
                      </td>
                      {/* Nội Dung Thay Đổi */}
                      <td className="px-3 py-2.5">
                        {log.changeType === "CLAIM_RELATED" ? (
                          <button
                            onClick={() => router.push("/claims")}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            Xem tại trang Khiếu nại
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        ) : log.previousValue && log.newValue ? (
                          <div className="text-xs">
                            <span className="text-red-500 line-through">
                              {log.previousValue}
                            </span>
                            <span className="text-slate-400 mx-1">→</span>
                            <span className="text-green-600 font-medium">
                              {log.newValue}
                            </span>
                          </div>
                        ) : log.newValue ? (
                          <span className="text-xs text-green-600 font-medium">
                            {log.newValue}
                          </span>
                        ) : log.changeDetail ? (
                          <span className="text-xs text-slate-600 break-words whitespace-pre-wrap line-clamp-2">
                            {log.changeDetail}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      {/* Thời Gian */}
                      <td className="px-3 py-2.5 text-xs text-slate-500">
                        {log.changeTimestamp
                          ? formatDate(log.changeTimestamp)
                          : formatDate(log.detectedAt)}
                      </td>
                      {/* NVC */}
                      <td className="px-3 py-2.5 text-xs text-slate-600 font-medium">
                        {log.order.carrierName || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {changesData && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 border-t border-slate-200 bg-slate-50 mt-auto">
            <p className="text-xs text-slate-500">
              {changesData.total > 0
                ? `${(changesData.page - 1) * changesData.pageSize + 1}–${Math.min(
                  changesData.page * changesData.pageSize,
                  changesData.total
                )} / ${changesData.total.toLocaleString("vi-VN")} thay đổi`
                : "0 thay đổi"}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => goToPage(1)} disabled={page <= 1} className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button onClick={() => goToPage(page - 1)} disabled={page <= 1} className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-xs font-medium text-slate-600">
                {changesData.page} / {changesData.totalPages || 1}
              </span>
              <button onClick={() => goToPage(page + 1)} disabled={page >= changesData.totalPages} className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => goToPage(changesData.totalPages)} disabled={page >= changesData.totalPages} className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Dialog */}
      <OrderDetailDialog
        requestCode={detailRequestCode || ""}
        open={!!detailRequestCode}
        onClose={() => setDetailRequestCode(null)}
        userRole={userRole}
      />
    </div>
  );
}
