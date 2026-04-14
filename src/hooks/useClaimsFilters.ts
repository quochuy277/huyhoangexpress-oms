"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type ClaimFilters = {
  page: number;
  pageSize: number;
  search: string;
  issueType: string[];
  status: string;
  shopName: string;
  orderStatus: string;
  showCompleted: boolean;
  sortBy: string;
  sortDir: "asc" | "desc";
};

type SearchParamsLike = {
  get(name: string): string | null;
  toString(): string;
};

export const DEFAULT_CLAIM_FILTERS: ClaimFilters = {
  page: 1,
  pageSize: 20,
  search: "",
  issueType: [],
  status: "",
  shopName: "",
  orderStatus: "",
  showCompleted: false,
  sortBy: "deadline",
  sortDir: "asc",
};

export function createClaimsFiltersFromSearchParams(
  searchParams: SearchParamsLike | URLSearchParams | null,
): ClaimFilters {
  const page = Number(searchParams?.get("claimPage")) || DEFAULT_CLAIM_FILTERS.page;
  const sortDir = searchParams?.get("claimSortDir") === "desc" ? "desc" : "asc";

  return {
    ...DEFAULT_CLAIM_FILTERS,
    page,
    search: searchParams?.get("claimSearch") || DEFAULT_CLAIM_FILTERS.search,
    issueType: searchParams?.get("claimIssueType")?.split(",").filter(Boolean) || DEFAULT_CLAIM_FILTERS.issueType,
    status: searchParams?.get("claimStatus") || DEFAULT_CLAIM_FILTERS.status,
    shopName: searchParams?.get("claimShop") || DEFAULT_CLAIM_FILTERS.shopName,
    orderStatus: searchParams?.get("claimOrderStatus") || DEFAULT_CLAIM_FILTERS.orderStatus,
    showCompleted: searchParams?.get("claimCompleted") === "true",
    sortBy: searchParams?.get("claimSortBy") || DEFAULT_CLAIM_FILTERS.sortBy,
    sortDir,
  };
}

export function applyClaimsFiltersToSearchParams(baseParams: URLSearchParams, filters: ClaimFilters) {
  const params = new URLSearchParams(baseParams.toString());
  const syncValue = (key: string, value: string) => {
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  };

  syncValue("claimPage", filters.page > 1 ? String(filters.page) : "");
  syncValue("claimSearch", filters.search);
  syncValue("claimIssueType", filters.issueType.join(","));
  syncValue("claimStatus", filters.status);
  syncValue("claimShop", filters.shopName);
  syncValue("claimOrderStatus", filters.orderStatus);
  syncValue("claimCompleted", filters.showCompleted ? "true" : "");
  syncValue("claimSortBy", filters.sortBy !== DEFAULT_CLAIM_FILTERS.sortBy ? filters.sortBy : "");
  syncValue("claimSortDir", filters.sortDir !== DEFAULT_CLAIM_FILTERS.sortDir ? filters.sortDir : "");

  return params;
}

export function useClaimsFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState<ClaimFilters>(() => createClaimsFiltersFromSearchParams(searchParams));
  const [searchInput, setSearchInput] = useState(filters.search);
  const prevQueryRef = useRef("");

  useEffect(() => {
    const nextParams = applyClaimsFiltersToSearchParams(new URLSearchParams(searchParams.toString()), filters);
    const nextQuery = nextParams.toString();

    if (nextQuery !== prevQueryRef.current) {
      prevQueryRef.current = nextQuery;
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }
  }, [filters, pathname, router, searchParams]);

  return {
    filters,
    setFilters,
    searchInput,
    setSearchInput,
  };
}
