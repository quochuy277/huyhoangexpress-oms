import type { ReturnOrder } from "@/types/returns";

export type ReturnsTabKey = "partial" | "full" | "warehouse";
export type ReturnsSummaryCounts = Record<ReturnsTabKey, number>;

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
) {
  return force || tabData[tab] === null;
}

export async function fetchReturnsTabData(fetchImpl: FetchLike, tab: ReturnsTabKey) {
  const response = await fetchImpl(`/api/orders/returns?tab=${tab}`);
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
