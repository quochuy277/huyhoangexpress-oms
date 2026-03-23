import { subMonths, startOfMonth, endOfMonth, startOfQuarter, startOfYear } from "date-fns";

export function getDateRange(period: string, from?: string | null, to?: string | null) {
    const now = new Date();
    switch (period) {
        case "last_month":
            return { from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) };
        case "quarter":
            return { from: startOfQuarter(now), to: now };
        case "half":
            return { from: subMonths(startOfMonth(now), 5), to: now };
        case "year":
            return { from: startOfYear(now), to: now };
        case "custom":
            return {
                from: from ? new Date(from) : subMonths(now, 1),
                to: to ? new Date(to + "T23:59:59.999Z") : now,
            };
        default: // "month"
            return { from: startOfMonth(now), to: now };
    }
}

export function parsePeriodFromURL(url: URL) {
    const period = url.searchParams.get("period") || "month";
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    return getDateRange(period, from, to);
}
