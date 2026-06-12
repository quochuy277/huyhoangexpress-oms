import { COMPLETION_STATUSES, ISSUE_TYPE_CONFIG } from "@/lib/claims-config";

export const PENDING_COMPENSATION_STATUSES: readonly string[] = [
  "CARRIER_COMPENSATED",
  "CARRIER_REJECTED",
];

const COMPLETION_STATUS_SET = new Set<string>(COMPLETION_STATUSES);

export type CompensationClaimRow = {
  claimStatus: string;
  carrierCompensation: number;
  customerCompensation: number;
  detectedDate: Date;
  issueType: string;
  shopName: string;
};

export type CompensationRange = {
  from: Date;
  to: Date;
};

export type CompensationSummary = {
  totalClaims: number;
  processingCount: number;
  customerCompensatedCount: number;
  customerRejectedCount: number;
  pendingCount: number;
  carrierTotal: number;
  customerTotal: number;
  difference: number;
};

export type CompensationShopRow = {
  shopName: string;
  totalClaims: number;
  processing: number;
  compensated: number;
  rejected: number;
  pending: number;
  totalPaid: number;
};

function parseDateParam(value?: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function resolveCompensationRange(
  params: { dateFrom?: string | null; dateTo?: string | null },
  now = new Date(),
): CompensationRange {
  const defaultRange: CompensationRange = {
    from: new Date(now.getFullYear(), 0, 1),
    to: endOfDay(now),
  };

  const from = parseDateParam(params.dateFrom) ?? defaultRange.from;
  const toBase = parseDateParam(params.dateTo);
  const to = toBase ? endOfDay(toBase) : defaultRange.to;

  if (from.getTime() > to.getTime()) {
    return defaultRange;
  }

  return { from, to };
}

function monthKeyOf(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

export function buildMonthlyBuckets(range: CompensationRange): string[] {
  const buckets: string[] = [];
  const cursor = new Date(range.from.getFullYear(), range.from.getMonth(), 1);
  const last = new Date(range.to.getFullYear(), range.to.getMonth(), 1);

  while (cursor.getTime() <= last.getTime()) {
    buckets.push(monthKeyOf(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return buckets;
}

export function summarizeCompensationClaims(claims: CompensationClaimRow[], range: CompensationRange) {
  const summary: CompensationSummary = {
    totalClaims: 0,
    processingCount: 0,
    customerCompensatedCount: 0,
    customerRejectedCount: 0,
    pendingCount: 0,
    carrierTotal: 0,
    customerTotal: 0,
    difference: 0,
  };

  const shopMap = new Map<string, CompensationShopRow>();
  const monthlyTotals = new Map<string, { carrier: number; customer: number }>();
  const issueCounts = new Map<string, number>();

  for (const claim of claims) {
    summary.totalClaims++;

    const isProcessing = !COMPLETION_STATUS_SET.has(claim.claimStatus);
    const isPending = PENDING_COMPENSATION_STATUSES.includes(claim.claimStatus);
    const isCompensated = claim.claimStatus === "CUSTOMER_COMPENSATED";
    const isRejected = claim.claimStatus === "CUSTOMER_REJECTED";
    const isCarrierCompensated = claim.claimStatus === "CARRIER_COMPENSATED";

    if (isProcessing) summary.processingCount++;
    if (isPending) summary.pendingCount++;
    if (isCompensated) {
      summary.customerCompensatedCount++;
      summary.customerTotal += claim.customerCompensation;
    }
    if (isRejected) summary.customerRejectedCount++;
    if (isCarrierCompensated) summary.carrierTotal += claim.carrierCompensation;

    let shop = shopMap.get(claim.shopName);
    if (!shop) {
      shop = {
        shopName: claim.shopName,
        totalClaims: 0,
        processing: 0,
        compensated: 0,
        rejected: 0,
        pending: 0,
        totalPaid: 0,
      };
      shopMap.set(claim.shopName, shop);
    }
    shop.totalClaims++;
    if (isProcessing) shop.processing++;
    if (isPending) shop.pending++;
    if (isCompensated) {
      shop.compensated++;
      shop.totalPaid += claim.customerCompensation;
    }
    if (isRejected) shop.rejected++;

    const monthKey = monthKeyOf(claim.detectedDate);
    const monthTotals = monthlyTotals.get(monthKey) ?? { carrier: 0, customer: 0 };
    if (isCarrierCompensated) monthTotals.carrier += claim.carrierCompensation;
    if (isCompensated) monthTotals.customer += claim.customerCompensation;
    monthlyTotals.set(monthKey, monthTotals);

    issueCounts.set(claim.issueType, (issueCounts.get(claim.issueType) ?? 0) + 1);
  }

  summary.difference = summary.carrierTotal - summary.customerTotal;

  const shops = [...shopMap.values()].sort((a, b) => b.totalClaims - a.totalClaims);

  const monthlyData = buildMonthlyBuckets(range).map((month) => ({
    month,
    carrier: monthlyTotals.get(month)?.carrier ?? 0,
    customer: monthlyTotals.get(month)?.customer ?? 0,
  }));

  const issueDistribution = Object.entries(ISSUE_TYPE_CONFIG).map(([type, config]) => ({
    type,
    label: config.label,
    count: issueCounts.get(type) ?? 0,
    color: config.color,
  }));

  return { summary, shops, monthlyData, issueDistribution };
}
