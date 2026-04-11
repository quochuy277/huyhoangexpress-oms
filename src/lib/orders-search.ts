import type { Prisma } from "@prisma/client";

export type OrderSearchKind =
  | "empty"
  | "requestCode"
  | "carrierCode"
  | "phoneFull"
  | "phoneLast4"
  | "text";

export type MultiSearchResult = {
  terms: { kind: OrderSearchKind; normalized: string }[];
  hasExactMatch: boolean;
};

export type SearchMeta = {
  kind: OrderSearchKind;
  normalized: string;
  isMulti: boolean;
  hasExactMatch: boolean;
};

export function classifyOrderSearch(raw: string | undefined | null): {
  kind: OrderSearchKind;
  normalized: string;
} {
  const trimmed = (raw ?? "").trim();

  if (!trimmed) {
    return { kind: "empty", normalized: "" };
  }

  const upper = trimmed.toUpperCase();
  const digits = trimmed.replace(/\D/g, "");

  if (/^B65[A-Z]{4}\d{7}$/.test(upper)) {
    return { kind: "requestCode", normalized: upper };
  }

  if (/^0\d{9}$/.test(digits)) {
    return { kind: "phoneFull", normalized: digits };
  }

  if (/^\d{4}$/.test(trimmed)) {
    return { kind: "phoneLast4", normalized: trimmed };
  }

  if (
    /^SPXVN\d+$/.test(upper) ||
    /^GYK[A-Z0-9]{5}$/.test(upper) ||
    /^[1-9]\d{9,14}$/.test(trimmed)
  ) {
    return { kind: "carrierCode", normalized: upper };
  }

  return { kind: "text", normalized: trimmed };
}

const MAX_SEARCH_TERMS = 50;

/**
 * Classify multiple search terms (one per line).
 * Limit: 50 terms. Empty lines are stripped.
 */
export function classifyMultiSearch(raw: string | undefined | null): MultiSearchResult {
  const lines = (raw ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_SEARCH_TERMS);

  if (lines.length === 0) {
    return { terms: [{ kind: "empty", normalized: "" }], hasExactMatch: false };
  }

  const terms = lines.map((line) => classifyOrderSearch(line));
  const exactKinds: OrderSearchKind[] = ["requestCode", "carrierCode", "phoneFull"];
  const hasExactMatch = terms.every((t) => exactKinds.includes(t.kind));

  return { terms, hasExactMatch };
}

export function shouldApplyDefaultRecentWindow(args: {
  searchKind: OrderSearchKind;
  fromDate?: string;
  toDate?: string;
}) {
  if (args.fromDate || args.toDate) {
    return false;
  }

  return (
    args.searchKind === "empty" ||
    args.searchKind === "text" ||
    args.searchKind === "phoneLast4"
  );
}

export function getDefaultRecentFromDate(now = new Date()) {
  const from = new Date(now);
  from.setDate(from.getDate() - 30);
  from.setHours(0, 0, 0, 0);
  return from;
}

export function buildOrderSearchFilters(args: {
  search?: string | null;
  fromDate?: string;
  toDate?: string;
  dateField?: string;
  now?: Date;
}): {
  searchMeta: SearchMeta;
  filters: Prisma.OrderWhereInput[];
} {
  const multiSearch = classifyMultiSearch(args.search);
  const filters: Prisma.OrderWhereInput[] = [];

  // Group terms by kind for optimal IN-clause queries
  const requestCodes = multiSearch.terms
    .filter((t) => t.kind === "requestCode")
    .map((t) => t.normalized);
  const carrierCodes = multiSearch.terms
    .filter((t) => t.kind === "carrierCode")
    .map((t) => t.normalized);
  const fullPhones = multiSearch.terms
    .filter((t) => t.kind === "phoneFull")
    .map((t) => t.normalized);
  const last4Phones = multiSearch.terms
    .filter((t) => t.kind === "phoneLast4")
    .map((t) => t.normalized);
  const textTerms = multiSearch.terms.filter((t) => t.kind === "text");

  const orConditions: Prisma.OrderWhereInput[] = [];

  if (requestCodes.length > 0) {
    orConditions.push({ requestCode: { in: requestCodes } });
  }
  if (carrierCodes.length > 0) {
    orConditions.push({ carrierOrderCode: { in: carrierCodes } });
  }
  if (fullPhones.length > 0) {
    orConditions.push({ receiverPhone: { in: fullPhones } });
  }
  for (const p of last4Phones) {
    orConditions.push({ receiverPhone: { endsWith: p } });
  }
  // Only use the first text term to avoid multiple expensive ILIKE scans
  if (textTerms.length > 0) {
    const term = textTerms[0].normalized;
    orConditions.push({
      OR: [
        { receiverName: { contains: term, mode: "insensitive" } },
        { shopName: { contains: term, mode: "insensitive" } },
        { carrierOrderCode: { contains: term, mode: "insensitive" } },
      ],
    });
  }

  if (orConditions.length === 1) {
    filters.push(orConditions[0]);
  } else if (orConditions.length > 1) {
    filters.push({ OR: orConditions });
  }

  // Default 30-day window (skip when searching exact codes)
  const dateCol = args.dateField || "createdTime";
  const searchMeta: SearchMeta = {
    kind: multiSearch.terms[0]?.kind ?? ("empty" as OrderSearchKind),
    normalized: multiSearch.terms[0]?.normalized ?? "",
    isMulti: multiSearch.terms.length > 1,
    hasExactMatch: multiSearch.hasExactMatch,
  };

  if (
    shouldApplyDefaultRecentWindow({
      searchKind: searchMeta.hasExactMatch ? "requestCode" : searchMeta.kind,
      fromDate: args.fromDate,
      toDate: args.toDate,
    })
  ) {
    filters.push({ [dateCol]: { gte: getDefaultRecentFromDate(args.now) } });
  }

  return { searchMeta, filters };
}
