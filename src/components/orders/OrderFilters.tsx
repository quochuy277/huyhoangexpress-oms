"use client";

import { Search, X, Download, Loader2, Settings2, SlidersHorizontal, ChevronDown } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState, useTransition, useEffect, memo } from "react";
import type { DeliveryStatus } from "@prisma/client";
import { STATUS_CATEGORIES } from "@/lib/status-mapper";

const CARRIERS = ["GHN", "GTK", "BSI", "JAT", "SPX"];

const STATUS_OPTIONS: { value: DeliveryStatus; label: string }[] = [
  { value: "IN_TRANSIT", label: "Đang chuyển kho giao" },
  { value: "DELIVERING", label: "Đang giao hàng" },
  { value: "DELIVERED", label: "Đã giao hàng" },
  { value: "RECONCILED", label: "Đã đối soát" },
  { value: "DELIVERY_DELAYED", label: "Hoãn giao hàng" },
  { value: "RETURN_CONFIRMED", label: "Xác nhận hoàn" },
  { value: "RETURN_DELAYED", label: "Hoãn trả hàng" },
  { value: "RETURNING_FULL", label: "Đang chuyển kho trả" },
  { value: "RETURNED_FULL", label: "Đã trả toàn bộ" },
  { value: "RETURNED_PARTIAL", label: "Đã trả một phần" },
];

interface FilterOptions {
  shopNames: string[];
  salesStaffs: string[];
  regionGroups: string[];
}

interface OrderFiltersProps {
  hideExport?: boolean;
}

function OrderFiltersInner({ hideExport }: OrderFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [options, setOptions] = useState<FilterOptions>({ shopNames: [], salesStaffs: [], regionGroups: [] });

  useEffect(() => {
    fetch("/api/orders/options")
      .then((res) => res.json())
      .then((data) => setOptions(data))
      .catch(console.error);
  }, []);

  const currentSearch = searchParams.get("search") || "";
  const currentStatus = searchParams.get("status") || "";
  const currentCarrier = searchParams.get("carrier") || "";
  const currentFromDate = searchParams.get("fromDate") || "";
  const currentToDate = searchParams.get("toDate") || "";
  
  // Advanced filters
  const currentShopName = searchParams.get("shopName") || "";
  const currentHasNotes = searchParams.get("hasNotes") || "";
  const currentSalesStaff = searchParams.get("salesStaff") || "";
  const currentPartialOrderType = searchParams.get("partialOrderType") || "";
  const currentRegionGroup = searchParams.get("regionGroup") || "";

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  const clearAll = useCallback(() => {
    startTransition(() => {
      router.push(pathname);
    });
  }, [router, pathname]);

  const advancedCount = [currentShopName, currentHasNotes, currentSalesStaff, currentPartialOrderType, currentRegionGroup].filter(Boolean).length;
  const activeCount = [currentStatus, currentCarrier, currentFromDate, currentToDate, currentShopName, currentHasNotes, currentSalesStaff, currentPartialOrderType, currentRegionGroup].filter(Boolean).length;
  const hasAnyFilters = currentSearch || currentStatus || currentCarrier || currentFromDate || currentToDate || advancedCount > 0;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      params.delete("pageSize");
      const res = await fetch(`/api/orders/export?${params.toString()}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `don-hang-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Lỗi xuất file. Vui lòng thử lại.");
    } finally {
      setIsExporting(false);
    }
  };

  const quickFilters = [
    { label: "Đang vận chuyển", statuses: [...STATUS_CATEGORIES.ACTIVE] },
    { label: "Hoãn giao", statuses: [...STATUS_CATEGORIES.PROBLEM] },
    { label: "Đang hoàn", statuses: [...STATUS_CATEGORIES.RETURNING] },
    { label: "Hoàn tất", statuses: [...STATUS_CATEGORIES.COMPLETED] },
  ];

  return (
    <div className="space-y-3">
      {/* Row 1: Search + Advanced Toggle + Export */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã đơn, tên, SĐT, mã vận đơn..."
            defaultValue={currentSearch}
            onChange={(e) => {
              const val = e.target.value;
              clearTimeout((window as any).__searchTimeout as number);
              (window as any).__searchTimeout = setTimeout(() => {
                updateParam("search", val);
              }, 400);
            }}
            className="w-full pl-8 sm:pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          {isPending && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />}
        </div>
        
        <button
          onClick={() => setMobileOpen(v => !v)}
          className="flex sm:hidden items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <SlidersHorizontal size={13} />
          Bộ lọc
          {activeCount > 0 && (
            <span className="bg-blue-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{activeCount}</span>
          )}
          <ChevronDown size={12} className={`transition-transform ${mobileOpen ? "rotate-180" : ""}`} />
        </button>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors border ${
            showAdvanced || advancedCount > 0
              ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Settings2 className="w-4 h-4" />
          Nâng cao {advancedCount > 0 && `(${advancedCount})`}
        </button>

        {!hideExport && (
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Xuất Excel
          </button>
        )}
      </div>

      {/* Row 2: Basic Filters (hidden on mobile, shown on sm+) */}
      <div className="hidden sm:flex flex-wrap items-center gap-1.5 sm:gap-2">
        <select value={currentStatus} onChange={(e) => updateParam("status", e.target.value)} className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-slate-600">
          <option value="">Tất cả trạng thái</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select value={currentCarrier} onChange={(e) => updateParam("carrier", e.target.value)} className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-slate-600">
          <option value="">Tất cả đối tác</option>
          {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" value={currentFromDate} onChange={(e) => updateParam("fromDate", e.target.value)} className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-slate-600" title="Từ ngày" />
        <span className="text-xs text-slate-400">→</span>
        <input type="date" value={currentToDate} onChange={(e) => updateParam("toDate", e.target.value)} className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-slate-600" title="Đến ngày" />

        <div className="hidden lg:flex items-center gap-1 ml-2 border-l border-slate-200 pl-2">
          {quickFilters.map((qf) => (
            <button key={qf.label} onClick={() => updateParam("status", qf.statuses.join(","))} className={`px-2.5 py-1 text-xs rounded-full transition-colors ${currentStatus === qf.statuses.join(",") ? "bg-blue-100 text-blue-700 font-medium" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
              {qf.label}
            </button>
          ))}
        </div>

        {hasAnyFilters && (
          <button onClick={clearAll} className="flex items-center gap-1 px-2 py-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors ml-auto">
            <X className="w-3 h-3" /> Đặt lại
          </button>
        )}
      </div>

      {/* Mobile Filter Drawer */}
      <div className={`sm:hidden overflow-hidden transition-all duration-200 ${mobileOpen ? "max-h-[500px] opacity-100 mt-2" : "max-h-0 opacity-0"}`}>
        <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <select value={currentStatus} onChange={(e) => updateParam("status", e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-slate-600">
            <option value="">Tất cả trạng thái</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select value={currentCarrier} onChange={(e) => updateParam("carrier", e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-slate-600">
            <option value="">Tất cả đối tác</option>
            {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <input type="date" value={currentFromDate} onChange={(e) => updateParam("fromDate", e.target.value)} className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-slate-600" title="Từ ngày" />
            <span className="text-xs text-slate-400">→</span>
            <input type="date" value={currentToDate} onChange={(e) => updateParam("toDate", e.target.value)} className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-slate-600" title="Đến ngày" />
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {quickFilters.map((qf) => (
              <button key={qf.label} onClick={() => updateParam("status", qf.statuses.join(","))} className={`px-2.5 py-1.5 text-xs rounded-full transition-colors ${currentStatus === qf.statuses.join(",") ? "bg-blue-100 text-blue-700 font-medium" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                {qf.label}
              </button>
            ))}
          </div>
          {hasAnyFilters && (
            <button onClick={clearAll} className="flex items-center justify-center gap-1 px-2 py-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
              <X className="w-3 h-3" /> Đặt lại bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Row 3: Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
          {/* Shop Name */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Cửa Hàng</label>
            <select value={currentShopName} onChange={(e) => updateParam("shopName", e.target.value)} className="w-full px-2 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-slate-700">
              <option value="">Tất cả cửa hàng</option>
              {options.shopNames.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Has Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Ghi Chú</label>
            <select value={currentHasNotes} onChange={(e) => updateParam("hasNotes", e.target.value)} className="w-full px-2 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-slate-700">
              <option value="">Tất cả</option>
              <option value="true">Có ghi chú</option>
              <option value="false">Chưa có ghi chú</option>
            </select>
          </div>

          {/* Sales Staff */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">NV Kinh Doanh</label>
            <select value={currentSalesStaff} onChange={(e) => updateParam("salesStaff", e.target.value)} className="w-full px-2 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-slate-700">
              <option value="">Tất cả NV</option>
              {options.salesStaffs.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Partial Order */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Loại Đơn</label>
            <select value={currentPartialOrderType} onChange={(e) => updateParam("partialOrderType", e.target.value)} className="w-full px-2 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-slate-700">
              <option value="">Tất cả</option>
              <option value="Đơn toàn bộ">Đơn toàn bộ</option>
              <option value="Đơn một phần">Đơn một phần</option>
            </select>
          </div>

          {/* Region Group */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Vùng Miền</label>
            <select value={currentRegionGroup} onChange={(e) => updateParam("regionGroup", e.target.value)} className="w-full px-2 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-slate-700">
              <option value="">Tất cả vùng miền</option>
              {options.regionGroups.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

export const OrderFilters = memo(OrderFiltersInner);
