"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronLeft, ChevronRight, PackageX } from "lucide-react";

import { DelayedFilterPanel } from "@/components/delayed/DelayedFilterPanel";
import { DelayedOrderTable } from "@/components/delayed/DelayedOrderTable";
import { DelayedStatsCards } from "@/components/delayed/DelayedStatsCards";
import {
  buildDelayedApiSearchParams,
  buildDelayedRouteSearchParams,
  createDelayedViewStateFromSearchParams,
  DEFAULT_DELAYED_FILTERS,
  DEFAULT_DELAYED_PAGE,
  DelayedViewState,
} from "@/lib/delayed-url-state";
import type { DelayedResponse, DelayedSortableKey } from "@/types/delayed";

const DelayDistributionChart = dynamic(
  () =>
    import("@/components/delayed/DelayDistributionChart").then((module) => ({
      default: module.DelayDistributionChart,
    })),
  { ssr: false },
);

const DelayReasonChart = dynamic(
  () =>
    import("@/components/delayed/DelayReasonChart").then((module) => ({
      default: module.DelayReasonChart,
    })),
  { ssr: false },
);

export function DelayedClient({
  userRole,
  initialData,
}: {
  userRole: string;
  initialData?: DelayedResponse | null;
}) {
  const searchParams = useSearchParams();
  const initialViewState = useMemo(
    () => createDelayedViewStateFromSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const [filters, setFilters] = useState(initialViewState.filters);
  const [page, setPage] = useState<number>(initialViewState.page);
  const [pageSize] = useState<number>(initialViewState.pageSize);
  const [sortKey, setSortKey] = useState<DelayedSortableKey>(initialViewState.sortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initialViewState.sortDir);
  const [mobileChartTab, setMobileChartTab] = useState<"delay" | "reason">("delay");
  const [searchInput, setSearchInput] = useState(initialViewState.filters.searchTerm);
  const didMountRef = useRef(false);
  const skipNextHistorySyncRef = useRef(false);

  useEffect(() => {
    setSearchInput(filters.searchTerm);
  }, [filters.searchTerm]);

  useEffect(() => {
    const handlePopState = () => {
      const nextState = createDelayedViewStateFromSearchParams(
        new URLSearchParams(window.location.search),
      );
      skipNextHistorySyncRef.current = true;
      setFilters(nextState.filters);
      setPage(nextState.page);
      setSortKey(nextState.sortKey);
      setSortDir(nextState.sortDir);
      setSearchInput(nextState.filters.searchTerm);
    };

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const viewState = useMemo<DelayedViewState>(
    () => ({
      page,
      pageSize,
      sortKey,
      sortDir,
      filters,
    }),
    [filters, page, pageSize, sortDir, sortKey],
  );

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    if (skipNextHistorySyncRef.current) {
      skipNextHistorySyncRef.current = false;
      return;
    }

    const nextQuery = buildDelayedRouteSearchParams(viewState).toString();
    const currentQuery = window.location.search.startsWith("?")
      ? window.location.search.slice(1)
      : window.location.search;

    if (nextQuery === currentQuery) {
      return;
    }

    const nextUrl = nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname;
    window.history.pushState({}, "", nextUrl);
  }, [viewState]);

  const apiQueryString = useMemo(() => buildDelayedApiSearchParams(viewState).toString(), [viewState]);

  const { data, isLoading, isFetching, error } = useQuery<DelayedResponse>({
    queryKey: ["delayedOrders", apiQueryString],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/orders/delayed?${apiQueryString}`, { signal });

      if (!response.ok) {
        throw new Error("Failed to fetch delayed orders");
      }

      return response.json();
    },
    refetchInterval: 300000,
    staleTime: 30000,
    placeholderData: (previousData) => previousData,
    initialData: initialData ?? undefined,
    initialDataUpdatedAt: initialData ? Date.now() : undefined,
  });

  const delayedData = data?.data;

  const updateFilters = useCallback((partial: Partial<typeof filters>) => {
    setFilters((previous) => ({ ...previous, ...partial }));
    setPage(DEFAULT_DELAYED_PAGE);
  }, []);

  const replaceFilters = useCallback((next: typeof filters) => {
    setFilters(next);
    setPage(DEFAULT_DELAYED_PAGE);
  }, []);

  const resetFilters = useCallback(() => {
    replaceFilters(DEFAULT_DELAYED_FILTERS);
  }, [replaceFilters]);

  const handleSortChange = useCallback((nextKey: DelayedSortableKey) => {
    setPage(DEFAULT_DELAYED_PAGE);
    setSortKey((previousKey) => {
      if (previousKey === nextKey) {
        setSortDir((previousDir) => (previousDir === "asc" ? "desc" : "asc"));
        return previousKey;
      }

      setSortDir("desc");
      return nextKey;
    });
  }, []);

  const handleExport = useCallback(() => {
    const params = buildDelayedApiSearchParams({
      ...viewState,
      page: DEFAULT_DELAYED_PAGE,
    });

    window.location.href = `/api/orders/delayed/export?${params.toString()}`;
  }, [viewState]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm font-medium text-red-600">
        Không thể tải dữ liệu delayed. Vui lòng thử lại sau.
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-5 px-3 pb-8 pt-2 sm:px-4 lg:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-800 sm:text-2xl lg:text-3xl">
            <PackageX className="h-6 w-6 text-amber-500 sm:h-8 sm:w-8" />
            Chăm Sóc Đơn Hoãn
          </h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Theo dõi đơn hoãn theo mức độ rủi ro, lý do hoãn và thao tác xử lý trên cả desktop
            lẫn mobile.
          </p>
        </div>
      </div>

      {delayedData?.meta.warning && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="font-semibold">{delayedData.meta.warning}</p>
            <p className="text-amber-800">
              Hệ thống đang phân tích tối đa {delayedData.meta.scanLimit.toLocaleString("vi-VN")}{" "}
              đơn gần nhất để tránh timeout. Hãy thêm bộ lọc để xem kết quả đầy đủ và chính xác
              hơn.
            </p>
          </div>
        </div>
      )}

      <DelayedStatsCards summary={delayedData?.summary} />

      <div className="hidden gap-4 lg:grid lg:grid-cols-2">
        <DelayDistributionChart data={delayedData?.facets.delayDistribution || []} />
        <DelayReasonChart data={delayedData?.facets.reasonDistribution || []} />
      </div>

      <div className="hidden">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setMobileChartTab("delay")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
              mobileChartTab === "delay"
                ? "bg-blue-50 text-blue-700"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            Thống kê
          </button>
          <button
            type="button"
            onClick={() => setMobileChartTab("reason")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
              mobileChartTab === "reason"
                ? "bg-blue-50 text-blue-700"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            Lý do
          </button>
        </div>
        {mobileChartTab === "delay" ? (
          <DelayDistributionChart data={delayedData?.facets.delayDistribution || []} />
        ) : (
          <DelayReasonChart data={delayedData?.facets.reasonDistribution || []} />
        )}
      </div>

      <DelayedFilterPanel
        filters={filters}
        searchInput={searchInput}
        options={{
          shops: delayedData?.facets.shops || [],
          statuses: delayedData?.facets.statuses || [],
          reasons: delayedData?.facets.reasons || [],
        }}
        resultCount={delayedData?.pagination.total || 0}
        currentPageCount={delayedData?.rows.length || 0}
        isFetching={isFetching}
        onFiltersChange={updateFilters}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={() => updateFilters({ searchTerm: searchInput.trim() })}
        onReplaceFilters={replaceFilters}
        onReset={resetFilters}
        onExport={handleExport}
      />

      {isLoading && !delayedData ? (
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-amber-500" />
          <p className="text-sm font-medium text-slate-500">Đang tải danh sách đơn hoãn...</p>
        </div>
      ) : (
        <>
          <DelayedOrderTable
            data={delayedData?.rows || []}
            userRole={userRole}
            sortKey={sortKey}
            sortDir={sortDir}
            onSortChange={handleSortChange}
            page={delayedData?.pagination.page || page}
            pageSize={delayedData?.pagination.pageSize || pageSize}
            isRefreshing={isFetching && Boolean(delayedData)}
          />

          {delayedData?.pagination && delayedData.pagination.totalPages > 1 && (
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Đang hiển thị {(delayedData.pagination.page - 1) * delayedData.pagination.pageSize + 1}
                -
                {Math.min(
                  delayedData.pagination.page * delayedData.pagination.pageSize,
                  delayedData.pagination.total,
                )}{" "}
                / {delayedData.pagination.total} đơn
              </p>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setPage((previous) => Math.max(DEFAULT_DELAYED_PAGE, previous - 1))}
                  disabled={page <= DEFAULT_DELAYED_PAGE}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Trước
                </button>
                <span className="min-w-[96px] text-center text-sm font-semibold text-slate-700">
                  Trang {delayedData.pagination.page} / {delayedData.pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((previous) => Math.min(delayedData.pagination.totalPages, previous + 1))
                  }
                  disabled={page >= delayedData.pagination.totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sau
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
