"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { ClaimFilters } from "@/hooks/useClaimsFilters";

type UseClaimsListOptions = {
  filters: ClaimFilters;
  onCountChange?: (count: number) => void;
};

export type ClaimsListPayload = {
  claims?: any[];
  pagination?: {
    total?: number;
    totalPages?: number;
  };
};

export type ClaimsFilterOptionsPayload = {
  shops?: string[];
  statuses?: string[];
};

type ClaimsSetter = (
  updater: any[] | ((currentClaims: any[]) => any[]),
) => void;

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
      typeof data?.error === "string" ? data.error : "Không thể tải danh sách đơn có vấn đề",
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
      typeof data?.error === "string" ? data.error : "Không thể tải bộ lọc đơn có vấn đề",
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
}: UseClaimsListOptions) {
  const queryClient = useQueryClient();
  const claimsQueryKey = useMemo(
    () => ["claims-list", filters] as const,
    [filters],
  );

  const claimsQuery = useQuery({
    queryKey: claimsQueryKey,
    queryFn: async () => {
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
      return parseClaimsListResponse(response);
    },
    placeholderData: (previousData) => previousData,
  });

  const filterOptionsQuery = useQuery({
    queryKey: ["claims-filter-options"],
    queryFn: async () => {
      const response = await fetch("/api/claims/filter-options");
      return parseClaimsFilterOptionsResponse(response);
    },
    staleTime: 30 * 60 * 1000, // 30 min — filter options rarely change
  });

  const claims = claimsQuery.data?.claims || [];
  const pagination = {
    total: claimsQuery.data?.pagination?.total ?? 0,
    totalPages: claimsQuery.data?.pagination?.totalPages ?? 0,
  };

  useEffect(() => {
    onCountChange?.(pagination.total);
  }, [onCountChange, pagination.total]);

  const setClaims = useCallback<ClaimsSetter>((updater) => {
    queryClient.setQueryData<ClaimsListPayload>(claimsQueryKey, (current) => {
      const currentClaims = current?.claims || [];
      const nextClaims = typeof updater === "function"
        ? updater(currentClaims)
        : updater;

      return {
        claims: nextClaims,
        pagination: current?.pagination || {
          total: nextClaims.length,
          totalPages: nextClaims.length > 0 ? 1 : 0,
        },
      };
    });
  }, [claimsQueryKey, queryClient]);

  const fetchClaims = useCallback(async () => {
    await claimsQuery.refetch();
  }, [claimsQuery]);

  return {
    claims,
    setClaims,
    loading: claimsQuery.isPending && !claimsQuery.data,
    refreshing: claimsQuery.isFetching && !!claimsQuery.data,
    pagination,
    shopOptions: filterOptionsQuery.data?.shops || [],
    orderStatusOptions: filterOptionsQuery.data?.statuses || [],
    listError: claimsQuery.error instanceof Error ? claimsQuery.error.message : null,
    filterOptionsError: filterOptionsQuery.error instanceof Error ? filterOptionsQuery.error.message : null,
    fetchClaims,
  };
}
