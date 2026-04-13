import type { ProcessedDelayedOrder } from "@/lib/delay-analyzer";
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

  const isTruncated = rawOrders.length > DELAYED_SCAN_LIMIT;
  const candidateOrders = isTruncated ? rawOrders.slice(0, DELAYED_SCAN_LIMIT) : rawOrders;

  let processedOrders = await timing.measure("parse_notes", () =>
    candidateOrders.map((order) => processDelayedOrder(order)),
  );

  processedOrders = await timing.measure("filter", () =>
    applyDelayedFilters(processedOrders, {
      search: "",
      shop: "",
      status: "",
      delay: delayCountFilter,
      reason: reasonFilter,
      risk: riskFilter || "all",
      today: todayOnly,
    }),
  );

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
