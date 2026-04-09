import type { DelayedFiltersState, DelayedSortableKey } from "@/types/delayed";

export const DEFAULT_DELAYED_PAGE = 1;
export const DEFAULT_DELAYED_PAGE_SIZE = 50;
export const DEFAULT_DELAYED_SORT_KEY: DelayedSortableKey = "delayCount";
export const DEFAULT_DELAYED_SORT_DIR = "desc" as const;

export type DelayedViewState = {
  page: number;
  pageSize: number;
  sortKey: DelayedSortableKey;
  sortDir: "asc" | "desc";
  filters: DelayedFiltersState;
};

export const DEFAULT_DELAYED_FILTERS: DelayedFiltersState = {
  searchTerm: "",
  shopFilter: "",
  statusFilter: "",
  delayCountFilter: "",
  reasonFilter: "",
  riskFilter: "all",
  todayOnly: false,
};

function getPositiveInt(value: string | null, fallback: number) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

export function createDelayedViewStateFromSearchParams(searchParams: URLSearchParams): DelayedViewState {
  return {
    page: getPositiveInt(searchParams.get("page"), DEFAULT_DELAYED_PAGE),
    pageSize: getPositiveInt(searchParams.get("pageSize"), DEFAULT_DELAYED_PAGE_SIZE),
    sortKey: (searchParams.get("sortKey") as DelayedSortableKey) || DEFAULT_DELAYED_SORT_KEY,
    sortDir: searchParams.get("sortDir") === "asc" ? "asc" : DEFAULT_DELAYED_SORT_DIR,
    filters: {
      searchTerm: searchParams.get("search") || DEFAULT_DELAYED_FILTERS.searchTerm,
      shopFilter: searchParams.get("shop") || DEFAULT_DELAYED_FILTERS.shopFilter,
      statusFilter: searchParams.get("status") || DEFAULT_DELAYED_FILTERS.statusFilter,
      delayCountFilter: searchParams.get("delay") || DEFAULT_DELAYED_FILTERS.delayCountFilter,
      reasonFilter: searchParams.get("reason") || DEFAULT_DELAYED_FILTERS.reasonFilter,
      riskFilter: searchParams.get("risk") || DEFAULT_DELAYED_FILTERS.riskFilter,
      todayOnly: searchParams.get("today") === "1",
    },
  };
}

export function buildDelayedRouteSearchParams(viewState: DelayedViewState) {
  const params = new URLSearchParams();

  if (viewState.page > DEFAULT_DELAYED_PAGE) {
    params.set("page", String(viewState.page));
  }

  if (viewState.pageSize !== DEFAULT_DELAYED_PAGE_SIZE) {
    params.set("pageSize", String(viewState.pageSize));
  }

  if (viewState.sortKey !== DEFAULT_DELAYED_SORT_KEY) {
    params.set("sortKey", viewState.sortKey);
  }

  if (viewState.sortDir !== DEFAULT_DELAYED_SORT_DIR) {
    params.set("sortDir", viewState.sortDir);
  }

  if (viewState.filters.searchTerm) params.set("search", viewState.filters.searchTerm);
  if (viewState.filters.shopFilter) params.set("shop", viewState.filters.shopFilter);
  if (viewState.filters.statusFilter) params.set("status", viewState.filters.statusFilter);
  if (viewState.filters.delayCountFilter) params.set("delay", viewState.filters.delayCountFilter);
  if (viewState.filters.reasonFilter) params.set("reason", viewState.filters.reasonFilter);
  if (viewState.filters.riskFilter !== DEFAULT_DELAYED_FILTERS.riskFilter) {
    params.set("risk", viewState.filters.riskFilter);
  }
  if (viewState.filters.todayOnly) params.set("today", "1");

  return params;
}

export function buildDelayedApiSearchParams(viewState: DelayedViewState) {
  const params = new URLSearchParams();

  params.set("page", String(viewState.page));
  params.set("pageSize", String(viewState.pageSize));
  params.set("sortKey", viewState.sortKey);
  params.set("sortDir", viewState.sortDir);

  if (viewState.filters.searchTerm) params.set("search", viewState.filters.searchTerm);
  if (viewState.filters.shopFilter) params.set("shop", viewState.filters.shopFilter);
  if (viewState.filters.statusFilter) params.set("status", viewState.filters.statusFilter);
  if (viewState.filters.delayCountFilter) params.set("delay", viewState.filters.delayCountFilter);
  if (viewState.filters.reasonFilter) params.set("reason", viewState.filters.reasonFilter);
  if (viewState.filters.riskFilter !== DEFAULT_DELAYED_FILTERS.riskFilter) {
    params.set("risk", viewState.filters.riskFilter);
  }
  if (viewState.filters.todayOnly) params.set("today", "1");

  return params;
}
