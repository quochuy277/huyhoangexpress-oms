"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ClaimFilters } from "@/hooks/useClaimsFilters";

type UseClaimsListOptions = {
  filters: ClaimFilters;
  onCountChange?: (count: number) => void;
  initialClaimsData?: ClaimsListPayload | null;
  initialFilterOptions?: ClaimsFilterOptionsPayload | null;
};

type ClaimsListPayload = {
  claims?: any[];
  pagination?: {
    total?: number;
    totalPages?: number;
  };
};

type ClaimsFilterOptionsPayload = {
  shops?: string[];
  statuses?: string[];
};

async function readJsonSafely(response: Response) {
  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function parseClaimsListResponse(response: Response): Promise<ClaimsListPayload> {
  const data = await readJsonSafely(response);

  if (!response.ok) {
    throw new Error(
      typeof data?.error === "string" ? data.error : "Không thể tải danh sách claims",
    );
  }

  return {
    claims: Array.isArray(data?.claims) ? data.claims : [],
    pagination: data?.pagination || {},
  };
}

export async function parseClaimsFilterOptionsResponse(
  response: Response,
): Promise<ClaimsFilterOptionsPayload> {
  const data = await readJsonSafely(response);

  if (!response.ok) {
    throw new Error(
      typeof data?.error === "string" ? data.error : "Không thể tải bộ lọc claims",
    );
  }

  return {
    shops: Array.isArray(data?.shops) ? data.shops : [],
    statuses: Array.isArray(data?.statuses) ? data.statuses : [],
  };
}

export function useClaimsList({
  filters,
  onCountChange,
  initialClaimsData = null,
  initialFilterOptions = null,
}: UseClaimsListOptions) {
  const [claims, setClaims] = useState<any[]>(() => initialClaimsData?.claims || []);
  const [loading, setLoading] = useState(!initialClaimsData);
  const [pagination, setPagination] = useState(() => ({
    total: initialClaimsData?.pagination?.total ?? 0,
    totalPages: initialClaimsData?.pagination?.totalPages ?? 0,
  }));
  const [shopOptions, setShopOptions] = useState<string[]>(() => initialFilterOptions?.shops || []);
  const [orderStatusOptions, setOrderStatusOptions] = useState<string[]>(
    () => initialFilterOptions?.statuses || [],
  );
  const [listError, setListError] = useState<string | null>(null);
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(null);
  const skipInitialClaimsFetchRef = useRef(Boolean(initialClaimsData));
  const skipInitialFiltersFetchRef = useRef(Boolean(initialFilterOptions));

  const fetchClaims = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(filters.page),
        pageSize: String(filters.pageSize),
        search: filters.search,
        showCompleted: String(filters.showCompleted),
        sortBy: filters.sortBy,
        sortDir: filters.sortDir,
      });

      if (filters.issueType.length) params.set("issueType", filters.issueType.join(","));
      if (filters.status) params.set("claimStatus", filters.status);
      if (filters.shopName) params.set("shopName", filters.shopName);
      if (filters.orderStatus) params.set("orderStatus", filters.orderStatus);

      const response = await fetch(`/api/claims?${params}`);
      const data = await parseClaimsListResponse(response);
      const nextClaims = data.claims || [];
      const nextPagination = data.pagination || {};

      setClaims(nextClaims);
      setPagination({
        total: nextPagination.total ?? 0,
        totalPages: nextPagination.totalPages ?? 0,
      });
      setListError(null);
      onCountChange?.(nextPagination.total ?? 0);
    } catch (error) {
      setListError(
        error instanceof Error ? error.message : "Không thể tải danh sách claims",
      );
    } finally {
      setLoading(false);
    }
  }, [filters, onCountChange]);

  useEffect(() => {
    if (skipInitialClaimsFetchRef.current) {
      skipInitialClaimsFetchRef.current = false;
      onCountChange?.(initialClaimsData?.pagination?.total ?? 0);
      return;
    }

    void fetchClaims();
  }, [fetchClaims, initialClaimsData?.pagination?.total, onCountChange]);

  useEffect(() => {
    if (skipInitialFiltersFetchRef.current) {
      skipInitialFiltersFetchRef.current = false;
      setFilterOptionsError(null);
      return;
    }

    fetch("/api/claims/filter-options")
      .then((response) => parseClaimsFilterOptionsResponse(response))
      .then((data) => {
        setShopOptions(data.shops || []);
        setOrderStatusOptions(data.statuses || []);
        setFilterOptionsError(null);
      })
      .catch((error) => {
        setFilterOptionsError(
          error instanceof Error ? error.message : "Không thể tải bộ lọc claims",
        );
      });
  }, []);

  return {
    claims,
    setClaims,
    loading,
    pagination,
    shopOptions,
    orderStatusOptions,
    listError,
    filterOptionsError,
    fetchClaims,
  };
}
