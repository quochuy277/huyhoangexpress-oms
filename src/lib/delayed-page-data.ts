import type { ProcessedDelayedOrder, RawOrder } from "@/lib/delay-analyzer";
import { processDelayedOrder } from "@/lib/delay-analyzer";
import {
  applyDelayedFilters,
  buildDelayedSummaryAndFacets,
  paginateDelayedOrders,
  sortDelayedOrders,
} from "@/lib/delayed-data";
import type { DelayedFacets, DelayedSummary } from "@/lib/delayed-data";
import {
  buildDelayedOrdersWhere,
  DELAYED_ORDER_SELECT,
  DELAYED_SCAN_LIMIT,
  DELAYED_SCAN_WARNING,
} from "@/lib/delayed-query";
import { prisma } from "@/lib/prisma";
import { createServerTiming } from "@/lib/server-timing";
import type { DelayedResponse } from "@/types/delayed";

type DelayedPageDataOptions = {
  page?: number;
  pageSize?: number;
  search?: string;
  shopFilter?: string;
  carrierFilter?: string;
  riskFilter?: string;
  reasonFilter?: string;
  delayCountFilter?: string;
  statusFilter?: string;
  todayOnly?: boolean;
  sortKey?: keyof ProcessedDelayedOrder;
  sortDir?: "asc" | "desc";
  /** Skip summary & facets computation (for page/sort-only changes) */
  skipFacets?: boolean;
};

type DelayedFilterCacheEntry = {
  expiresAt: number;
  isTruncated: boolean;
  processedOrders: ProcessedDelayedOrder[];
};

type ProcessedOrderCacheEntry = {
  expiresAt: number;
  processedOrder: ProcessedDelayedOrder;
};

const DELAYED_FILTER_CACHE_TTL_MS = 5 * 60_000;
const DELAYED_FILTER_CACHE_MAX_ENTRIES = 10;
const DELAYED_PROCESSED_ORDER_CACHE_TTL_MS = 5 * 60_000;
const DELAYED_PROCESSED_ORDER_CACHE_MAX_ENTRIES = 2_500;
const delayedFilterCache = new Map<string, DelayedFilterCacheEntry>();
const delayedProcessedOrderCache = new Map<string, ProcessedOrderCacheEntry>();

function createDelayedFilterCacheKey({
  search = "",
  shopFilter = "",
  carrierFilter = "",
  riskFilter = "",
  reasonFilter = "",
  delayCountFilter = "",
  statusFilter = "",
  todayOnly = false,
}: Pick<
  DelayedPageDataOptions,
  | "search"
  | "shopFilter"
  | "carrierFilter"
  | "riskFilter"
  | "reasonFilter"
  | "delayCountFilter"
  | "statusFilter"
  | "todayOnly"
>) {
  return JSON.stringify({
    search,
    shopFilter,
    carrierFilter,
    riskFilter,
    reasonFilter,
    delayCountFilter,
    statusFilter,
    todayOnly,
  });
}

function trimDelayedFilterCache() {
  if (delayedFilterCache.size <= DELAYED_FILTER_CACHE_MAX_ENTRIES) return;

  const oldestEntry = [...delayedFilterCache.entries()].sort(
    (left, right) => left[1].expiresAt - right[1].expiresAt,
  )[0];
  if (oldestEntry) {
    delayedFilterCache.delete(oldestEntry[0]);
  }
}

function createProcessedOrderCacheKey(order: Pick<RawOrder, "id" | "requestCode" | "lastUpdated">) {
  const stableOrderId = order.id || order.requestCode;
  const parsedLastUpdated =
    order.lastUpdated instanceof Date
      ? order.lastUpdated
      : order.lastUpdated
        ? new Date(order.lastUpdated)
        : null;
  const lastUpdated =
    parsedLastUpdated && !Number.isNaN(parsedLastUpdated.getTime())
      ? parsedLastUpdated.toISOString()
      : "no-last-updated";

  return `${stableOrderId}:${lastUpdated}`;
}

function trimProcessedOrderCache() {
  if (delayedProcessedOrderCache.size <= DELAYED_PROCESSED_ORDER_CACHE_MAX_ENTRIES) return;

  const oldestEntry = [...delayedProcessedOrderCache.entries()].sort(
    (left, right) => left[1].expiresAt - right[1].expiresAt,
  )[0];
  if (oldestEntry) {
    delayedProcessedOrderCache.delete(oldestEntry[0]);
  }
}

function getProcessedDelayedOrder(order: RawOrder, now: number) {
  const cacheKey = createProcessedOrderCacheKey(order);
  const cachedEntry = delayedProcessedOrderCache.get(cacheKey);

  if (cachedEntry && cachedEntry.expiresAt > now) {
    return { processedOrder: cachedEntry.processedOrder, cacheHit: true };
  }

  const processedOrder = processDelayedOrder(order);
  delayedProcessedOrderCache.set(cacheKey, {
    expiresAt: now + DELAYED_PROCESSED_ORDER_CACHE_TTL_MS,
    processedOrder,
  });
  trimProcessedOrderCache();

  return { processedOrder, cacheHit: false };
}

export async function getDelayedPageData({
  page = 1,
  pageSize = 50,
  search = "",
  shopFilter = "",
  carrierFilter = "",
  riskFilter = "",
  reasonFilter = "",
  delayCountFilter = "",
  statusFilter = "",
  todayOnly = false,
  sortKey = "delayCount",
  sortDir = "desc",
  skipFacets = false,
}: DelayedPageDataOptions): Promise<DelayedResponse & { _timing?: string }> {
  const timing = createServerTiming();
  const cacheKey = createDelayedFilterCacheKey({
    search,
    shopFilter,
    carrierFilter,
    riskFilter,
    reasonFilter,
    delayCountFilter,
    statusFilter,
    todayOnly,
  });
  const cachedEntry = delayedFilterCache.get(cacheKey);
  const now = Date.now();

  let isTruncated = false;
  let processedOrders: ProcessedDelayedOrder[];

  if (cachedEntry && cachedEntry.expiresAt > now) {
    timing.record("filtered_cache_hit", 0);
    isTruncated = cachedEntry.isTruncated;
    processedOrders = cachedEntry.processedOrders;
  } else {
    const rawOrders = await timing.measure("db_query", () =>
      prisma.order.findMany({
        where: buildDelayedOrdersWhere({
          search,
          shopFilter,
          carrierFilter,
          statusFilter,
        }),
        select: DELAYED_ORDER_SELECT,
        orderBy: { lastUpdated: "desc" },
        take: DELAYED_SCAN_LIMIT + 1,
      }),
    );

    isTruncated = rawOrders.length > DELAYED_SCAN_LIMIT;
    const candidateOrders = isTruncated ? rawOrders.slice(0, DELAYED_SCAN_LIMIT) : rawOrders;

    let processCacheHitCount = 0;
    const parsedOrders = await timing.measure("parse_notes", () =>
      candidateOrders.map((order) => {
        const { processedOrder, cacheHit } = getProcessedDelayedOrder(order, now);
        if (cacheHit) {
          processCacheHitCount += 1;
        }
        return processedOrder;
      }),
    );

    if (processCacheHitCount > 0) {
      timing.record("process_cache_hit", 0, `${processCacheHitCount} orders`);
    }

    processedOrders = await timing.measure("filter", () =>
      applyDelayedFilters(parsedOrders, {
        search: "",
        shop: "",
        status: "",
        delay: delayCountFilter,
        reason: reasonFilter,
        risk: riskFilter || "all",
        today: todayOnly,
      }),
    );

    delayedFilterCache.set(cacheKey, {
      expiresAt: now + DELAYED_FILTER_CACHE_TTL_MS,
      isTruncated,
      processedOrders,
    });
    trimDelayedFilterCache();
  }

  processedOrders = await timing.measure("sort", () =>
    sortDelayedOrders(processedOrders, sortKey, sortDir),
  );

  // When skipFacets is true (page/sort-only changes), skip the expensive
  // summary + facets computation. The client keeps the previous values.
  let summary: DelayedSummary | null = null;
  let facets: DelayedFacets | null = null;

  if (!skipFacets) {
    const result = await timing.measure("summary_facets", () =>
      buildDelayedSummaryAndFacets(processedOrders),
    );
    summary = result.summary;
    facets = result.facets;
  }

  const { rows, pagination } = await timing.measure("paginate", () =>
    paginateDelayedOrders(processedOrders, page, pageSize),
  );

  timing.log("delayed-page-data");

  return {
    success: true,
    _timing: timing.headerValue(),
    data: {
      rows,
      summary,
      facets,
      pagination,
      meta: {
        isTruncated,
        scanLimit: DELAYED_SCAN_LIMIT,
        warning: isTruncated ? DELAYED_SCAN_WARNING : null,
      },
    },
  };
}
