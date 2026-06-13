"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildPeriodSearch, readPeriodFromParams } from "@/lib/finance/period-url";

export function useFinancePeriod() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selection = readPeriodFromParams(new URLSearchParams(searchParams.toString()));

  const push = useCallback(
    (period: string, from: string, to: string) => {
      const search = buildPeriodSearch(period, from, to);
      router.push(`${pathname}?${search}`, { scroll: false });
    },
    [router, pathname],
  );

  return {
    ...selection,
    setPeriod: (period: string) => push(period, selection.from, selection.to),
    setCustomFrom: (from: string) => push(selection.period, from, selection.to),
    setCustomTo: (to: string) => push(selection.period, selection.from, to),
  };
}
