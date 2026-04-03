import type { ProcessedDelayedOrder } from "@/lib/delay-analyzer";

export type DelayedFacetCount = {
  name: string;
  count: number;
};

export type DelayedSummary = {
  total: number;
  high: number;
  medium: number;
  low: number;
  totalCOD: number;
  highCOD: number;
};

export type DelayedFacets = {
  shops: string[];
  statuses: string[];
  reasons: string[];
  delayDistribution: DelayedFacetCount[];
  reasonDistribution: DelayedFacetCount[];
};

export type DelayedPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type DelayedMeta = {
  isTruncated: boolean;
  scanLimit: number;
  warning: string | null;
};

export type DelayedResponseData = {
  rows: ProcessedDelayedOrder[];
  summary: DelayedSummary;
  facets: DelayedFacets;
  pagination: DelayedPagination;
  meta: DelayedMeta;
};

export type DelayedResponse = {
  success: boolean;
  data: DelayedResponseData;
};

export type DelayedFiltersState = {
  searchTerm: string;
  shopFilter: string;
  statusFilter: string;
  delayCountFilter: string;
  reasonFilter: string;
  riskFilter: string;
  todayOnly: boolean;
};
