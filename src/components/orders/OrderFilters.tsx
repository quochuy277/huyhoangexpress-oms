"use client";

import { Search, X, Download, Loader2, Settings2, Filter } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useMemo, useState, useTransition, useEffect, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DeliveryStatus } from "@prisma/client";

import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";

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

const DATE_FIELD_OPTIONS = [
  { value: "createdTime", label: "Ngày tạo" },
  { value: "pickupTime", label: "Ngày lấy hàng" },
  { value: "lastUpdated", label: "Ngày cập nhật cuối" },
  { value: "paymentConfirmDate", label: "Ngày xác nhận thu tiền COD" },
  { value: "reconciliationDate", label: "Ngày đối soát" },
  { value: "deliveredDate", label: "Ngày giao hàng thành công" },
];

const VALUE_FIELD_OPTIONS = [
  { value: "codAmount", label: "COD" },
  { value: "totalFee", label: "Tổng phí" },
  { value: "carrierFee", label: "Phí ĐT thu" },
  { value: "revenue", label: "Doanh thu" },
];

const VALUE_CONDITION_OPTIONS = [
  { value: "gt", label: "Lớn hơn" },
  { value: "eq", label: "Bằng" },
  { value: "lt", label: "Nhỏ hơn" },
];

interface FilterOptions {
  shopNames: string[];
  salesStaffs: string[];
  regionGroups: string[];
}

interface DraftFilters {
  search: string;
  status: string;
  shopName: string;
  dateField: string;
  fromDate: string;
  toDate: string;
  partialOrderType: string;
  hasNotes: string;
  salesStaff: string;
  regionGroup: string;
  valueField: string;
  valueCondition: string;
  valueAmount: string;
}

function initDraftFromParams(sp: URLSearchParams): DraftFilters {
  return {
    search: sp.get("search") || "",
    status: sp.get("status") || "",
    shopName: sp.get("shopName") || "",
    dateField: sp.get("dateField") || "createdTime",
    fromDate: sp.get("fromDate") || "",
    toDate: sp.get("toDate") || "",
    partialOrderType: sp.get("partialOrderType") || "",
    hasNotes: sp.get("hasNotes") || "",
    salesStaff: sp.get("salesStaff") || "",
    regionGroup: sp.get("regionGroup") || "",
    valueField: sp.get("valueField") || "",
    valueCondition: sp.get("valueCondition") || "",
    valueAmount: sp.get("valueAmount") || "",
  };
}

const DRAFT_DEFAULTS: DraftFilters = {
  search: "",
  status: "",
  shopName: "",
  dateField: "createdTime",
  fromDate: "",
  toDate: "",
  partialOrderType: "",
  hasNotes: "",
  salesStaff: "",
  regionGroup: "",
  valueField: "",
  valueCondition: "",
  valueAmount: "",
};

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

  // Draft state: all filter values in local state until "Lọc" is pressed
  const [draft, setDraft] = useState<DraftFilters>(() => initDraftFromParams(searchParams));

  // Sync draft from URL when searchParams change externally
  useEffect(() => {
    setDraft(initDraftFromParams(searchParams));
  }, [searchParams]);

  // Always fetch shop options (moved from advanced-only)
  const { data: optionsData } = useQuery<FilterOptions>({
    queryKey: ["orders-filter-options"],
    queryFn: async () => {
      const response = await fetch("/api/orders/options");
      if (!response.ok) throw new Error("Không thể tải bộ lọc");
      return response.json();
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
  const options = optionsData ?? { shopNames: [], salesStaffs: [], regionGroups: [] };

  const shopOptions = useMemo(
    () => options.shopNames.map((s) => ({ value: s, label: s })),
    [options.shopNames],
  );

  const updateDraft = useCallback(<K extends keyof DraftFilters>(key: K, value: DraftFilters[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Apply all filters at once
  const handleApplyFilters = useCallback(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(draft)) {
      if (key === "dateField" && value === "createdTime") continue;
      if (value) params.set(key, value);
    }
    params.delete("page");
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }, [draft, router, pathname]);

  const handleClearAll = useCallback(() => {
    setDraft({ ...DRAFT_DEFAULTS });
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }, [router, pathname]);

  // Counts for badges
  const advancedCount = [
    draft.partialOrderType,
    draft.hasNotes,
    draft.salesStaff,
    draft.regionGroup,
    draft.valueField,
  ].filter(Boolean).length;

  const hasAnyDraft = Object.entries(draft).some(
    ([key, value]) => key !== "dateField" && value && value !== DRAFT_DEFAULTS[key as keyof DraftFilters],
  );

  // Textarea auto-grow helper
  const searchLineCount = (draft.search.match(/\n/g) || []).length + 1;
  const searchRows = Math.min(Math.max(searchLineCount, 1), 6);
  const mobileSearchRows = Math.min(searchRows, 4);

  // Export handler
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

  const statusSelected = draft.status ? draft.status.split(",") : [];
  const shopSelected = draft.shopName ? draft.shopName.split(",") : [];

  return (
    <div className="space-y-3">
      {/* Row 1: Search textarea */}
      <div className="space-y-1.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-3 h-4 w-4 text-slate-400 sm:left-3" />
          <textarea
            value={draft.search}
            onChange={(e) => updateDraft("search", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleApplyFilters();
              }
            }}
            placeholder="Nhập mã yêu cầu, mã đối tác, SĐT... (Shift+Enter thêm dòng, tối đa 50 mã)"
            rows={searchRows}
            className="hidden w-full resize-none rounded-lg border border-slate-200 bg-white py-2.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:block sm:pl-9"
          />
          <textarea
            value={draft.search}
            onChange={(e) => updateDraft("search", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleApplyFilters();
              }
            }}
            placeholder="Nhập mã YC, mã đối tác, SĐT..."
            rows={mobileSearchRows}
            className="w-full resize-none rounded-lg border border-slate-200 bg-white py-2.5 pl-8 pr-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 sm:hidden"
          />
          {searchLineCount > 1 && (
            <span className="absolute bottom-2 right-2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
              {searchLineCount} mã
            </span>
          )}
        </div>
        <p className="text-[11px] leading-tight text-slate-400 sm:text-xs">
          Mặc định chỉ hiển thị đơn trong 30 ngày gần nhất. Khi tìm đúng mã yêu cầu, mã đối tác hoặc SĐT đầy đủ, hệ thống sẽ tìm toàn bộ lịch sử.
        </p>
      </div>

      {/* Row 2: Basic Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
        {/* Status multi-select */}
        <div className="w-full sm:w-auto sm:min-w-[180px]">
          <MultiSelectDropdown
            options={STATUS_OPTIONS}
            selected={statusSelected}
            onChange={(values) => updateDraft("status", values.join(","))}
            placeholder="Tất cả trạng thái"
          />
        </div>

        {/* Shop multi-select */}
        <div className="w-full sm:w-auto sm:min-w-[180px]">
          <MultiSelectDropdown
            options={shopOptions}
            selected={shopSelected}
            onChange={(values) => updateDraft("shopName", values.join(","))}
            placeholder="Tất cả cửa hàng"
            searchable
            maxHeight={200}
          />
        </div>

        {/* Date type select */}
        <div className="w-full sm:w-auto">
          <select
            value={draft.dateField}
            onChange={(e) => updateDraft("dateField", e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 focus:ring-2 focus:ring-blue-500"
          >
            {DATE_FIELD_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={draft.fromDate}
            onChange={(e) => updateDraft("fromDate", e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 focus:ring-2 focus:ring-blue-500 sm:flex-none"
            title="Từ ngày"
          />
          <span className="text-xs text-slate-400">→</span>
          <input
            type="date"
            value={draft.toDate}
            onChange={(e) => updateDraft("toDate", e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 focus:ring-2 focus:ring-blue-500 sm:flex-none"
            title="Đến ngày"
          />
        </div>
      </div>

      {/* Row 3: Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleApplyFilters}
          disabled={isPending}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 sm:flex-none sm:min-h-0"
          style={{ minHeight: "44px" }}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
          Lọc
        </button>

        {hasAnyDraft && (
          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
            style={{ minHeight: "44px" }}
          >
            <X className="h-3 w-3" /> Đặt lại
          </button>
        )}

        {isPending && (
          <span className="flex items-center gap-1 text-xs text-blue-600 animate-pulse">
            <Loader2 className="h-3 w-3 animate-spin" />
            Đang lọc...
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              showAdvanced || advancedCount > 0
                ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Settings2 className="h-4 w-4" />
            Nâng cao{advancedCount > 0 ? ` (${advancedCount})` : ""}
          </button>

          {!hideExport && (
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              <span className="hidden sm:inline">Xuất Excel</span>
              <span className="sm:hidden">Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* Row 4: Advanced Filters */}
      {showAdvanced && (
        <div className="animate-in fade-in slide-in-from-top-2 space-y-3 border-t border-slate-100 pt-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Loại đơn */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                Loại Đơn
              </label>
              <select
                value={draft.partialOrderType}
                onChange={(e) => updateDraft("partialOrderType", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả</option>
                <option value="Đơn toàn bộ">Đơn toàn bộ</option>
                <option value="Đơn một phần">Đơn một phần</option>
              </select>
            </div>

            {/* Ghi chú */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                Ghi Chú
              </label>
              <select
                value={draft.hasNotes}
                onChange={(e) => updateDraft("hasNotes", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả</option>
                <option value="true">Có ghi chú</option>
                <option value="false">Chưa có ghi chú</option>
              </select>
            </div>

            {/* NV Kinh doanh */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                NV Kinh Doanh
              </label>
              <select
                value={draft.salesStaff}
                onChange={(e) => updateDraft("salesStaff", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả NV</option>
                {options.salesStaffs.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Vùng miền */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                Vùng Miền
              </label>
              <select
                value={draft.regionGroup}
                onChange={(e) => updateDraft("regionGroup", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả vùng miền</option>
                {options.regionGroups.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Value filter row */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
              Lọc Theo Giá Trị
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <select
                value={draft.valueField}
                onChange={(e) => updateDraft("valueField", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Chọn loại tiền</option>
                {VALUE_FIELD_OPTIONS.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>

              <div className="flex gap-2">
                <select
                  value={draft.valueCondition}
                  onChange={(e) => updateDraft("valueCondition", e.target.value)}
                  disabled={!draft.valueField}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">Điều kiện</option>
                  {VALUE_CONDITION_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>

                <input
                  type="number"
                  min="0"
                  value={draft.valueAmount}
                  onChange={(e) => updateDraft("valueAmount", e.target.value)}
                  disabled={!draft.valueField || !draft.valueCondition}
                  placeholder="Giá trị"
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const OrderFilters = memo(OrderFiltersInner);
