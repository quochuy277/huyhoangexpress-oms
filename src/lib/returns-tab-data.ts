import type { ReturnOrder } from "@/types/returns";

export type ReturnsTabKey = "partial" | "full" | "warehouse";
export type ReturnsSummaryCounts = Record<ReturnsTabKey, number>;
export const DEFAULT_RETURNS_PAGE_SIZE = 20;

export type ReturnsTabDataMap = Record<ReturnsTabKey, ReturnOrder[] | null>;

type FetchLike = (input: string) => Promise<{
  ok?: boolean;
  json: () => Promise<{ data?: ReturnOrder[] | ReturnsSummaryCounts }>;
}>;

export function createEmptyReturnsTabData(): ReturnsTabDataMap {
  return {
    partial: null,
    full: null,
    warehouse: null,
  };
}

export function createReturnsTabDataWithInitial(
  tab: ReturnsTabKey,
  rows: ReturnOrder[],
): ReturnsTabDataMap {
  return {
    partial: tab === "partial" ? rows : null,
    full: tab === "full" ? rows : null,
    warehouse: tab === "warehouse" ? rows : null,
  };
}

export function createEmptyReturnsSummary(): ReturnsSummaryCounts {
  return {
    partial: 0,
    full: 0,
    warehouse: 0,
  };
}

export function shouldFetchReturnsTab(
  tabData: ReturnsTabDataMap,
  tab: ReturnsTabKey,
  force = false,
  options?: {
    currentSignature?: string;
    lastLoadedSignature?: string | null;
  },
) {
  if (force || tabData[tab] === null) {
    return true;
  }

  if (!options?.currentSignature) {
    return false;
  }

  return options.currentSignature !== options.lastLoadedSignature;
}

export type ReturnsFilterParams = {
  search?: string;
  shop?: string;
  days?: string;
  notes?: string;
  confirm?: string;
  page?: number;
  pageSize?: number;
};

export function getReturnsPageParamKey(tab: ReturnsTabKey) {
  if (tab === "partial") return "partialPage";
  if (tab === "full") return "fullPage";
  return "warehousePage";
}

export function resolveReturnsTabPage(
  searchParams: Pick<URLSearchParams, "get">,
  tab: ReturnsTabKey,
) {
  const rawPage = searchParams.get(getReturnsPageParamKey(tab));
  const page = Number.parseInt(rawPage || "1", 10);

  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  return page;
}

export function clearReturnsPaginationParams(searchParams: Pick<URLSearchParams, "delete">) {
  searchParams.delete("page");
  searchParams.delete("partialPage");
  searchParams.delete("fullPage");
  searchParams.delete("warehousePage");
}

export function createReturnsTabRequestSignature(
  tab: ReturnsTabKey,
  params?: ReturnsFilterParams,
) {
  const qs = new URLSearchParams({ tab });
  if (params?.search) qs.set("search", params.search);
  if (params?.shop) qs.set("shop", params.shop);
  if (params?.days) qs.set("days", params.days);
  if (params?.notes) qs.set("notes", params.notes);
  if (params?.confirm) qs.set("confirm", params.confirm);
  if (params?.page && params.page > 1) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  return qs.toString();
}

export async function fetchReturnsTabData(
  fetchImpl: FetchLike,
  tab: ReturnsTabKey,
  params?: ReturnsFilterParams,
) {
  const response = await fetchImpl(
    `/api/orders/returns?${createReturnsTabRequestSignature(tab, params)}`,
  );
  const payload = await response.json();

  return (payload.data as ReturnOrder[] | undefined) || [];
}

export async function fetchReturnsSummary(fetchImpl: FetchLike): Promise<ReturnsSummaryCounts> {
  const response = await fetchImpl("/api/orders/returns/summary");
  const payload = await response.json();

  return (payload.data as ReturnsSummaryCounts | undefined) || createEmptyReturnsSummary();
}

export function invalidateReturnsTabs(
  tabData: ReturnsTabDataMap,
  tabs: ReturnsTabKey[],
): ReturnsTabDataMap {
  const next = { ...tabData };

  for (const tab of tabs) {
    next[tab] = null;
  }

  return next;
}

export function getReturnShopNames(tabData: ReturnsTabDataMap) {
  const names = new Set<string>();

  for (const rows of Object.values(tabData)) {
    if (!rows) continue;

    for (const row of rows) {
      if (row.shopName) {
        names.add(row.shopName);
      }
    }
  }

  return [...names].sort();
}
