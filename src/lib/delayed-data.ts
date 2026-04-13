import type { ProcessedDelayedOrder } from "@/lib/delay-analyzer";
import { formatDelayedStatusLabel } from "@/lib/delayed-labels";

export type DelayedFilters = {
  search: string;
  shop: string;
  status: string;
  delay: string;
  reason: string;
  risk: string;
  today: boolean;
};

function getTodayDelayDateString() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
}

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
  const todayDate = filters.today ? getTodayDelayDateString() : null;

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

    if (todayDate && !order.delays.some((delay) => delay.date === todayDate)) {
      return false;
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
      { name: "1 lần", count: count1 },
      { name: "2 lần", count: count2 },
      { name: "3 lần", count: count3 },
      { name: "4+ lần", count: count4 },
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

/**
 * Combined single-pass computation of summary + facets.
 * Avoids iterating the array twice when both are needed.
 */
export function buildDelayedSummaryAndFacets(orders: ProcessedDelayedOrder[]): {
  summary: DelayedSummary;
  facets: DelayedFacets;
} {
  const shops = new Set<string>();
  const statuses = new Set<string>();
  const reasons = new Set<string>();
  const reasonCounts = new Map<string, number>();
  let count1 = 0;
  let count2 = 0;
  let count3 = 0;
  let count4 = 0;

  const summary: DelayedSummary = {
    total: 0,
    high: 0,
    medium: 0,
    low: 0,
    totalCOD: 0,
    highCOD: 0,
  };

  for (const order of orders) {
    // Summary
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

    // Facets
    if (order.shopName) shops.add(order.shopName);
    if (order.status) statuses.add(order.status);

    if (order.delayCount >= 4) count4 += 1;
    else if (order.delayCount === 3) count3 += 1;
    else if (order.delayCount === 2) count2 += 1;
    else count1 += 1;

    for (const reason of order.uniqueReasons) {
      reasons.add(reason);
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    }
  }

  return {
    summary,
    facets: {
      shops: [...shops].sort(),
      statuses: [...statuses].sort(),
      reasons: [...reasons].sort(),
      delayDistribution: [
        { name: "1 lần", count: count1 },
        { name: "2 lần", count: count2 },
        { name: "3 lần", count: count3 },
        { name: "4+ lần", count: count4 },
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
    },
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

export function buildDelayedExportRows(
  orders: ProcessedDelayedOrder[],
  startIndex = 1,
) {
  return orders.map((order, index) => ({
    STT: startIndex + index,
    "Mã Yêu Cầu": order.requestCode,
    "Mã Đơn KH": order.customerOrderCode || "",
    "Mã Đơn Đối Tác": order.carrierOrderCode || "",
    Shop: order.shopName || "",
    "Người Nhận": order.receiverName || "",
    SDT: order.receiverPhone || "",
    "Địa Chỉ": order.fullAddress || "",
    "Trạng Thái": formatDelayedStatusLabel(order.status),
    "Số Lần Hoãn": order.delayCount,
    "Mức Độ Rủi Ro":
      order.risk === "high" ? "CAO" : order.risk === "medium" ? "TRUNG BÌNH" : "THẤP",
    "COD (VND)": order.codAmount,
    "Lý Do": order.uniqueReasons.join(", "),
  }));
}
