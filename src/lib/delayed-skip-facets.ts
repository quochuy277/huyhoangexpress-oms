import type { DelayedFiltersState } from "@/types/delayed";

export function createDelayedFacetSignature(filters: DelayedFiltersState) {
  return JSON.stringify({
    searchTerm: filters.searchTerm,
    shopFilter: filters.shopFilter,
    statusFilter: filters.statusFilter,
    delayCountFilter: filters.delayCountFilter,
    reasonFilter: filters.reasonFilter,
    riskFilter: filters.riskFilter,
    todayOnly: filters.todayOnly,
  });
}

export function shouldSkipDelayedFacets({
  didMount,
  currentSignature,
  lastFacetSignature,
}: {
  didMount: boolean;
  currentSignature: string;
  lastFacetSignature: string;
}) {
  if (!didMount) {
    return false;
  }

  return currentSignature === lastFacetSignature;
}
