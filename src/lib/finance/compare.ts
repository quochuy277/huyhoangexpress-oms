import type { DateRange } from "@/lib/finance/landing";

export function getPreviousRange(range: DateRange): DateRange {
  const duration = range.to.getTime() - range.from.getTime();
  return {
    from: new Date(range.from.getTime() - duration),
    to: new Date(range.from.getTime() - 1),
  };
}

export function getYoyRange(range: DateRange): DateRange {
  const from = new Date(range.from);
  from.setFullYear(from.getFullYear() - 1);
  const to = new Date(range.to);
  to.setFullYear(to.getFullYear() - 1);
  return { from, to };
}

export function computeDeltaPercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

export function computeTargetPercent(current: number, target: number | null): number | null {
  if (!target || target <= 0) return null;
  return Math.round((current / target) * 100);
}
