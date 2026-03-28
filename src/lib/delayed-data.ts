import type { ProcessedDelayedOrder } from "@/lib/delay-analyzer";

export type DelayedFilters = {
  search: string;
  shop: string;
  status: string;
  delay: string;
  reason: string;
  risk: string;
};

export type DelayedSummary = {
  total: number;
  high: number;
  medium: number;
  low: number;
  totalCOD: number;
  highCOD: number;
};

export type DelayedFacetCount = {
  name: string;
  count: number;
};

export type DelayedFacets = {
  shops: string[];
  statuses: string[];
  reasons: string[];
  delayDistribution: DelayedFacetCount[];
  reasonDistribution: DelayedFacetCount[];
};

export function applyDelayedFilters(
  orders: ProcessedDelayedOrder[],
  filters: DelayedFilters,
): ProcessedDelayedOrder[] {
  const normalizedSearch = filters.search.trim().toLowerCase();

  return orders.filter((order) => {
    if (normalizedSearch) {
      const haystack = [
        order.requestCode,
        order.customerOrderCode,
        order.carrierOrderCode,
        order.shopName,
        order.receiverName,
        order.receiverPhone,
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(normalizedSearch)) {
        return false;
      }
    }

    if (filters.shop && order.shopName !== filters.shop) {
      return false;
    }

    if (filters.status && order.status !== filters.status) {
      return false;
    }

    if (filters.risk && filters.risk !== "all" && order.risk !== filters.risk) {
      return false;
    }

    if (filters.reason && !order.uniqueReasons.includes(filters.reason)) {
      return false;
    }

    if (filters.delay) {
      if (filters.delay === "4+") {
        if (order.delayCount < 4) {
          return false;
        }
      } else if (order.delayCount !== Number(filters.delay)) {
        return false;
      }
    }

    return true;
  });
}

export function buildDelayedSummary(orders: ProcessedDelayedOrder[]): DelayedSummary {
  return orders.reduce<DelayedSummary>(
    (summary, order) => {
      summary.total += 1;
      summary.totalCOD += order.codAmount;

      if (order.risk === "high") {
        summary.high += 1;
        summary.highCOD += order.codAmount;
      } else if (order.risk === "medium") {
        summary.medium += 1;
      } else {
        summary.low += 1;
      }

      return summary;
    },
    {
      total: 0,
      high: 0,
      medium: 0,
      low: 0,
      totalCOD: 0,
      highCOD: 0,
    },
  );
}

export function buildDelayedFacets(orders: ProcessedDelayedOrder[]): DelayedFacets {
  const shops = new Set<string>();
  const statuses = new Set<string>();
  const reasons = new Set<string>();
  const reasonCounts = new Map<string, number>();
  let count1 = 0;
  let count2 = 0;
  let count3 = 0;
  let count4 = 0;

  for (const order of orders) {
    if (order.shopName) {
      shops.add(order.shopName);
    }

    if (order.status) {
      statuses.add(order.status);
    }

    if (order.delayCount >= 4) {
      count4 += 1;
    } else if (order.delayCount === 3) {
      count3 += 1;
    } else if (order.delayCount === 2) {
      count2 += 1;
    } else {
      count1 += 1;
    }

    for (const reason of order.uniqueReasons) {
      reasons.add(reason);
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    }
  }

  return {
    shops: [...shops].sort(),
    statuses: [...statuses].sort(),
    reasons: [...reasons].sort(),
    delayDistribution: [
      { name: "1 lan", count: count1 },
      { name: "2 lan", count: count2 },
      { name: "3 lan", count: count3 },
      { name: "4+ lan", count: count4 },
    ],
    reasonDistribution: [...reasonCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count;
        }

        return left.name.localeCompare(right.name);
      })
      .slice(0, 7),
  };
}

export function paginateDelayedOrders(
  orders: ProcessedDelayedOrder[],
  page: number,
  pageSize: number,
) {
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 50;
  const total = orders.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const normalizedPage = Math.min(safePage, totalPages);
  const start = (normalizedPage - 1) * safePageSize;

  return {
    rows: orders.slice(start, start + safePageSize),
    pagination: {
      page: normalizedPage,
      pageSize: safePageSize,
      total,
      totalPages,
    },
  };
}

export function sortDelayedOrders(
  orders: ProcessedDelayedOrder[],
  sortKey: keyof ProcessedDelayedOrder,
  sortDir: "asc" | "desc",
) {
  return [...orders].sort((left, right) => {
    let leftValue = left[sortKey] as string | number | Date | null | undefined;
    let rightValue = right[sortKey] as string | number | Date | null | undefined;

    if (leftValue instanceof Date) {
      leftValue = leftValue.getTime();
    }

    if (rightValue instanceof Date) {
      rightValue = rightValue.getTime();
    }

    if (typeof leftValue === "string") {
      leftValue = leftValue.toLowerCase();
    }

    if (typeof rightValue === "string") {
      rightValue = rightValue.toLowerCase();
    }

    if (leftValue === rightValue) {
      return 0;
    }

    if (leftValue == null) {
      return sortDir === "asc" ? -1 : 1;
    }

    if (rightValue == null) {
      return sortDir === "asc" ? 1 : -1;
    }

    if (leftValue < rightValue) {
      return sortDir === "asc" ? -1 : 1;
    }

    return sortDir === "asc" ? 1 : -1;
  });
}

export function buildDelayedExportRows(orders: ProcessedDelayedOrder[]) {
  return orders.map((order, index) => ({
    STT: index + 1,
    "Ma Yeu Cau": order.requestCode,
    "Ma Don KH": order.customerOrderCode || "",
    "Ma Don Doi Tac": order.carrierOrderCode || "",
    Shop: order.shopName || "",
    "Nguoi Nhan": order.receiverName || "",
    SDT: order.receiverPhone || "",
    "Dia Chi": order.fullAddress || "",
    "Trang Thai": order.status,
    "So Lan Hoan": order.delayCount,
    "Muc Do Rui Ro":
      order.risk === "high" ? "CAO" : order.risk === "medium" ? "TRUNG BINH" : "THAP",
    "COD (VND)": order.codAmount,
    "Ly Do": order.uniqueReasons.join(", "),
  }));
}
