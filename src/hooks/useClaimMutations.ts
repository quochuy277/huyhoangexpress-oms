"use client";

import { useCallback, useState } from "react";

import type { ClaimFilters } from "@/hooks/useClaimsFilters";

type UseClaimMutationsOptions = {
  filters: ClaimFilters;
  claims: any[];
  setClaims: (updater: any[] | ((currentClaims: any[]) => any[])) => void;
  fetchClaims: () => Promise<void>;
  canUpdateClaim: boolean;
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

export function getClaimsExportTruncationMessage(response: Response) {
  if (response.headers.get("X-Claims-Export-Truncated") !== "true") {
    return null;
  }

  const limit = response.headers.get("X-Claims-Export-Limit") || "3000";
  return `File export chỉ bao gồm ${limit} dòng đầu tiên. Vui lòng thu hẹp bộ lọc để xuất đầy đủ dữ liệu claims.`;
}

export function useClaimMutations({
  filters,
  claims,
  setClaims,
  fetchClaims,
  canUpdateClaim,
}: UseClaimMutationsOptions) {
  const [detecting, setDetecting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        search: filters.search,
        showCompleted: String(filters.showCompleted),
      });

      if (filters.issueType.length) params.set("issueType", filters.issueType.join(","));
      if (filters.status) params.set("claimStatus", filters.status);
      if (filters.shopName) params.set("shopName", filters.shopName);
      if (filters.orderStatus) params.set("orderStatus", filters.orderStatus);

      const response = await fetch(`/api/claims/export?${params}`);
      if (!response.ok) {
        const errorData = await readJsonSafely(response);
        throw new Error(
          typeof errorData?.error === "string"
            ? errorData.error
            : "Lỗi khi xuất file Excel. Vui lòng thử lại.",
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const disposition = response.headers.get("Content-Disposition") || "";
      const truncationMessage = getClaimsExportTruncationMessage(response);
      const filenameMatch = disposition.match(/filename="?(.+?)"?$/);

      anchor.href = url;
      anchor.download = filenameMatch?.[1] || "don-co-van-de.xlsx";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      if (truncationMessage) {
        alert(truncationMessage);
      }
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Lỗi khi xuất file Excel. Vui lòng thử lại.",
      );
    } finally {
      setExporting(false);
    }
  }, [filters]);

  const updateClaimLocal = useCallback((id: string, changes: Record<string, any>) => {
    setClaims((prev) => prev.map((claim) => (claim.id === id ? { ...claim, ...changes } : claim)));
  }, [setClaims]);

  const patchClaimField = useCallback(async (claimId: string, changes: Record<string, any>) => {
    const previousClaim = claims.find((claim) => claim.id === claimId);
    updateClaimLocal(claimId, changes);

    try {
      const response = await fetch(`/api/claims/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });

      if (!response.ok) {
        throw new Error("Patch failed");
      }
    } catch {
      if (previousClaim) {
        setClaims((prev) => prev.map((claim) => (claim.id === claimId ? previousClaim : claim)));
      }
      alert("Cập nhật thất bại. Dữ liệu đã được khôi phục.");
      throw new Error("Patch failed");
    }
  }, [claims, setClaims, updateClaimLocal]);

  const handleInlineEdit = useCallback(async (claimId: string, field: string, value: number) => {
    await patchClaimField(claimId, { [field]: value });
  }, [patchClaimField]);

  const handleInlineEditField = useCallback(async (claimId: string, field: string, value: string | null) => {
    await patchClaimField(claimId, { [field]: value });
  }, [patchClaimField]);

  const runAutoDetect = useCallback(async () => {
    if (!canUpdateClaim) return;

    setDetecting(true);
    try {
      const response = await fetch("/api/claims/auto-detect", { method: "POST" });
      const data = await response.json();

      if (data.newClaims > 0 || data.reopenedClaims > 0 || data.autoCompleted > 0) {
        await fetchClaims();
      }
    } finally {
      setDetecting(false);
    }
  }, [canUpdateClaim, fetchClaims]);

  return {
    detecting,
    exporting,
    handleExport,
    updateClaimLocal,
    handleInlineEdit,
    handleInlineEditField,
    runAutoDetect,
  };
}
