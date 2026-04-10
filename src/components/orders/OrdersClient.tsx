"use client";

import { useState, Suspense, useCallback } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ExcelUpload } from "@/components/orders/ExcelUpload";
import { OrderFilters } from "@/components/orders/OrderFilters";
import { OrderTable } from "@/components/orders/OrderTable";
import { UploadHistoryDialog } from "@/components/orders/UploadHistoryDialog";
import { DeleteOrdersDialog } from "@/components/orders/DeleteOrdersDialog";
import {
  Upload,
  X,
  Trash2,
  Loader2,
  History,
  Package,
  Activity,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getOrdersToastClassNames } from "@/components/orders/ordersResponsive";
import type { OrdersApiResponse } from "@/types/orders";

interface OrdersClientProps {
  userRole: string;
  initialOrdersData: OrdersApiResponse | null;
}

type TabType = "orders" | "changes";

const OrderChangesTab = dynamic(
  () =>
    import("@/components/orders/OrderChangesTab").then((mod) => ({
      default: mod.OrderChangesTab,
    })),
  {
    loading: () => (
      <div className="flex h-40 items-center justify-center text-slate-400">
        Đang tải tab...
      </div>
    ),
  },
);

export function OrdersClient({ userRole, initialOrdersData }: OrdersClientProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab") as TabType | null;
  const [activeTab, setActiveTabState] = useState<TabType>(
    tabFromUrl === "changes" ? "changes" : "orders",
  );

  const setActiveTab = useCallback((tab: TabType) => {
    setActiveTabState(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "changes") {
      params.set("tab", "changes");
    } else {
      params.delete("tab");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, router]);

  const [showUpload, setShowUpload] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);
  const [changesToast, setChangesToast] = useState<number | null>(null);

  const deleteToastStyles = getOrdersToastClassNames(
    deleteResult?.startsWith("✓") ? "success" : "error",
  );
  const changesToastStyles = getOrdersToastClassNames("info");

  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["upload-history", historyPage],
    queryFn: async () => {
      const res = await fetch(
        `/api/orders/upload-history?page=${historyPage}&pageSize=10`,
      );
      if (!res.ok) throw new Error("Fetch failed");
      return res.json();
    },
    enabled: showHistory,
  });

  const isViewer = userRole === "VIEWER";
  const isAdminOrManager = userRole === "ADMIN" || userRole === "MANAGER";

  const handleDelete = () => {
    if (selectedRows.length === 0) return;
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/orders/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestCodes: selectedRows }),
      });
      if (!res.ok) throw new Error("Delete failed");

      setDeleteResult(`✓ Đã xóa ${selectedRows.length} đơn hàng thành công`);
      setSelectedRows([]);
      setShowDeleteDialog(false);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setTimeout(() => setDeleteResult(null), 4000);
    } catch {
      setDeleteResult("✗ Lỗi khi xóa đơn hàng. Vui lòng thử lại.");
      setTimeout(() => setDeleteResult(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUploadComplete = (totalChanges?: number) => {
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["upload-batches"] });
    queryClient.invalidateQueries({ queryKey: ["change-stats"] });
    queryClient.invalidateQueries({ queryKey: ["order-changes"] });

    if (totalChanges && totalChanges > 0) {
      setChangesToast(totalChanges);
      setTimeout(() => setChangesToast(null), 8000);
    }
  };

  return (
    <div className="space-y-3 pb-6 sm:space-y-4 sm:pb-8">
      <div className="flex shrink-0 flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">
            Quản Lý Đơn Hàng
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            Tìm kiếm, lọc và quản lý toàn bộ đơn hàng
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedRows.length > 0 && isAdminOrManager && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Xóa ({selectedRows.length} đơn)
            </button>
          )}

          {!isViewer && (
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={() => setShowUpload(!showUpload)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors ${
                  showUpload
                    ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {showUpload ? (
                  <>
                    <X className="h-4 w-4" /> Đóng
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> Tải lên Excel
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setHistoryPage(1);
                  setShowHistory(true);
                }}
                className="mt-1 flex items-center gap-1 text-[13px] text-slate-500 transition-colors hover:text-slate-800 hover:underline"
              >
                <History className="h-3.5 w-3.5" /> Lịch sử tải lên
              </button>
            </div>
          )}
        </div>
      </div>

      {showUpload && !isViewer && (
        <div className="shrink-0 animate-in slide-in-from-top-2 fade-in rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            Tải lên file đơn hàng
          </h2>
          <ExcelUpload onUploadComplete={handleUploadComplete} />
        </div>
      )}

      <div className="w-fit shrink-0 overflow-x-auto rounded-lg bg-slate-100 p-1">
        <div className="flex min-w-max items-center gap-1">
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "orders"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Package className="h-4 w-4" />
            Đơn hàng
          </button>
          <button
            onClick={() => setActiveTab("changes")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "changes"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Activity className="h-4 w-4" />
            Biến động đơn hàng
          </button>
        </div>
      </div>

      {activeTab === "orders" ? (
        <>
          <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <Suspense fallback={null}>
              <OrderFilters hideExport={isViewer} />
            </Suspense>
          </div>

          <Suspense
            fallback={
              <div className="min-h-[520px] animate-pulse overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-4 border-b border-slate-100 px-4 py-3">
                  <div className="h-4 w-8 rounded bg-slate-200" />
                  <div className="h-4 w-28 rounded bg-slate-200" />
                  <div className="h-4 w-24 rounded bg-slate-200" />
                  <div className="h-4 w-32 flex-1 rounded bg-slate-200" />
                  <div className="h-4 w-20 rounded bg-slate-200" />
                  <div className="h-4 w-16 rounded bg-slate-200" />
                </div>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 border-b border-slate-50 px-4 py-3">
                    <div className="h-3 w-8 rounded bg-slate-100" />
                    <div className="h-3 w-28 rounded bg-slate-100" />
                    <div className="h-3 w-24 rounded bg-slate-100" />
                    <div className="h-3 w-32 flex-1 rounded bg-slate-100" />
                    <div className="h-5 w-20 rounded-full bg-slate-100" />
                    <div className="h-3 w-16 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            }
          >
            <OrderTable
              userRole={userRole}
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
              initialOrdersData={initialOrdersData}
            />
          </Suspense>
        </>
      ) : (
        <Suspense
          fallback={
            <div className="min-h-[420px] animate-pulse overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="h-5 w-40 rounded bg-slate-200" />
                <div className="flex gap-2">
                  <div className="h-8 w-20 rounded-lg bg-slate-100" />
                  <div className="h-8 w-20 rounded-lg bg-slate-100" />
                </div>
              </div>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 border-b border-slate-50 px-4 py-3">
                  <div className="h-3 w-24 rounded bg-slate-100" />
                  <div className="h-3 w-32 flex-1 rounded bg-slate-100" />
                  <div className="h-5 w-20 rounded-full bg-slate-100" />
                  <div className="h-3 w-20 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          }
        >
          <OrderChangesTab userRole={userRole} />
        </Suspense>
      )}

      <UploadHistoryDialog
        open={showHistory}
        onOpenChange={setShowHistory}
        histories={historyData?.histories}
        pagination={historyData?.pagination}
        isLoading={isLoadingHistory}
        page={historyPage}
        onPageChange={setHistoryPage}
      />

      {deleteResult && (
        <div className={deleteToastStyles.container}>
          <div className={deleteToastStyles.text}>{deleteResult}</div>
        </div>
      )}

      {changesToast !== null && (
        <div className={changesToastStyles.container}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <Activity className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <span className={changesToastStyles.text}>
                Phát hiện {changesToast.toLocaleString("vi-VN")} thay đổi mới
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 sm:justify-start">
              <button
                onClick={() => {
                  setChangesToast(null);
                  setActiveTab("changes");
                }}
                className={changesToastStyles.actionButton}
              >
                Xem biến động
              </button>
              <button
                onClick={() => setChangesToast(null)}
                className={changesToastStyles.dismissButton}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteOrdersDialog
        open={showDeleteDialog}
        selectedCodes={selectedRows}
        isDeleting={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}
