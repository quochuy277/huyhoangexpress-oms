export interface PeriodSelection {
  period: string;
  from: string;
  to: string;
}

export function readPeriodFromParams(params: URLSearchParams): PeriodSelection {
  return {
    period: params.get("period") || "month",
    from: params.get("from") || "",
    to: params.get("to") || "",
  };
}

export function buildPeriodSearch(period: string, from: string, to: string): string {
  const params = new URLSearchParams({ period });
  if (period === "custom" && from && to) {
    params.set("from", from);
    params.set("to", to);
  }
  return params.toString();
}
