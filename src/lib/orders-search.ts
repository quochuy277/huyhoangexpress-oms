import type { Prisma } from "@prisma/client";

export type OrderSearchKind =
  | "empty"
  | "requestCode"
  | "carrierCode"
  | "phoneFull"
  | "phoneLast4"
  | "text";

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
  now?: Date;
}): {
  searchMeta: {
    kind: OrderSearchKind;
    normalized: string;
  };
  filters: Prisma.OrderWhereInput[];
} {
  const searchMeta = classifyOrderSearch(args.search);
  const filters: Prisma.OrderWhereInput[] = [];

  if (searchMeta.kind === "requestCode") {
    filters.push({ requestCode: searchMeta.normalized });
  } else if (searchMeta.kind === "carrierCode") {
    filters.push({ carrierOrderCode: searchMeta.normalized });
  } else if (searchMeta.kind === "phoneFull") {
    filters.push({ receiverPhone: searchMeta.normalized });
  } else if (searchMeta.kind === "phoneLast4") {
    filters.push({ receiverPhone: { endsWith: searchMeta.normalized } });
  } else if (searchMeta.kind === "text") {
    filters.push({
      OR: [
        { receiverName: { contains: searchMeta.normalized, mode: "insensitive" } },
        { shopName: { contains: searchMeta.normalized, mode: "insensitive" } },
        { carrierOrderCode: { contains: searchMeta.normalized, mode: "insensitive" } },
      ],
    });
  }

  if (
    shouldApplyDefaultRecentWindow({
      searchKind: searchMeta.kind,
      fromDate: args.fromDate,
      toDate: args.toDate,
    })
  ) {
    filters.push({ createdTime: { gte: getDefaultRecentFromDate(args.now) } });
  }

  return {
    searchMeta,
    filters,
  };
}
