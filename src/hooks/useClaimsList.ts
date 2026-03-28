"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ClaimFilters } from "@/hooks/useClaimsFilters";

type UseClaimsListOptions = {
  filters: ClaimFilters;
  onCountChange?: (count: number) => void;
};

export function useClaimsList({ filters, onCountChange }: UseClaimsListOptions) {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [shopOptions, setShopOptions] = useState<string[]>([]);
  const [orderStatusOptions, setOrderStatusOptions] = useState<string[]>([]);
  const lastFetchRef = useRef<number>(0);

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    lastFetchRef.current = Date.now();

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
      const data = await response.json();
      const nextClaims = data.claims || [];
      const nextPagination = data.pagination || {};

      setClaims(nextClaims);
      setPagination({
        total: nextPagination.total ?? 0,
        totalPages: nextPagination.totalPages ?? 0,
      });
      onCountChange?.(nextPagination.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [filters, onCountChange]);

  useEffect(() => {
    void fetchClaims();
  }, [fetchClaims]);

  useEffect(() => {
    fetch("/api/claims/filter-options")
      .then((response) => response.json())
      .then((data) => {
        setShopOptions(data.shops || []);
        setOrderStatusOptions(data.statuses || []);
      })
      .catch(() => {
        setShopOptions([]);
        setOrderStatusOptions([]);
      });
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && Date.now() - lastFetchRef.current > 30_000) {
        void fetchClaims();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [fetchClaims]);

  return {
    claims,
    setClaims,
    loading,
    pagination,
    shopOptions,
    orderStatusOptions,
    fetchClaims,
  };
}
