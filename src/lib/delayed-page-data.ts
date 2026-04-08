import type { ProcessedDelayedOrder } from "@/lib/delay-analyzer";
import { processDelayedOrder } from "@/lib/delay-analyzer";
import {
  applyDelayedFilters,
  buildDelayedFacets,
  buildDelayedSummary,
  paginateDelayedOrders,
  sortDelayedOrders,
} from "@/lib/delayed-data";
import {
  buildDelayedOrdersWhere,
  DELAYED_ORDER_SELECT,
  DELAYED_SCAN_LIMIT,
  DELAYED_SCAN_WARNING,
} from "@/lib/delayed-query";
import { prisma } from "@/lib/prisma";
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
}: DelayedPageDataOptions): Promise<DelayedResponse> {
  const rawOrders = await prisma.order.findMany({
    where: buildDelayedOrdersWhere({
      search,
      shopFilter,
      carrierFilter,
      statusFilter,
    }),
    select: DELAYED_ORDER_SELECT,
    orderBy: { lastUpdated: "desc" },
    take: DELAYED_SCAN_LIMIT + 1,
  });

  const isTruncated = rawOrders.length > DELAYED_SCAN_LIMIT;
  const candidateOrders = isTruncated ? rawOrders.slice(0, DELAYED_SCAN_LIMIT) : rawOrders;

  let processedOrders = candidateOrders.map((order) => processDelayedOrder(order));

  processedOrders = applyDelayedFilters(processedOrders, {
    search: "",
    shop: "",
    status: "",
    delay: delayCountFilter,
    reason: reasonFilter,
    risk: riskFilter || "all",
    today: todayOnly,
  });
  processedOrders = sortDelayedOrders(processedOrders, sortKey, sortDir);

  const summary = buildDelayedSummary(processedOrders);
  const facets = buildDelayedFacets(processedOrders);
  const { rows, pagination } = paginateDelayedOrders(processedOrders, page, pageSize);

  return {
    success: true,
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
