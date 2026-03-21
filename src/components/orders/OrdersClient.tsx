"use client";

import { useState, Suspense, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ExcelUpload } from "@/components/orders/ExcelUpload";
import { OrderFilters } from "@/components/orders/OrderFilters";
import { OrderTable } from "@/components/orders/OrderTable";
import { OrderChangesTab } from "@/components/orders/OrderChangesTab";
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

interface OrdersClientProps {
  userRole: string;
}

type TabType = "orders" | "changes";

export function OrdersClient({ userRole }: OrdersClientProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab") as TabType | null;
  const [activeTab, setActiveTabState] = useState<TabType>(tabFromUrl === "changes" ? "changes" : "orders");

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

  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["upload-history", historyPage],
    queryFn: async () => {
      const res = await fetch(
        `/api/orders/upload-history?page=${historyPage}&pageSize=10`
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

    // Show toast if changes detected
    if (totalChanges && totalChanges > 0) {
      setChangesToast(totalChanges);
      setTimeout(() => setChangesToast(null), 8000);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 flex flex-col h-[calc(100vh-6.5rem)] sm:h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
            Quản Lý Đơn Hàng
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Tìm kiếm, lọc và quản lý toàn bộ đơn hàng
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedRows.length > 0 && isAdminOrManager && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Xóa ({selectedRows.length} đơn)
            </button>
          )}

          {!isViewer && (
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={() => setShowUpload(!showUpload)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm ${
                  showUpload
                    ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {showUpload ? (
                  <>
                    <X className="w-4 h-4" /> Đóng
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> Tải lên Excel
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setHistoryPage(1);
                  setShowHistory(true);
                }}
                className="text-[13px] text-slate-500 hover:text-slate-800 hover:underline flex items-center gap-1 mt-1 transition-colors"
              >
                <History className="w-3.5 h-3.5" /> Lịch sử tải lên
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upload panel */}
      {showUpload && !isViewer && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 shrink-0 animate-in fade-in slide-in-from-top-2">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">
            Tải lên file đơn hàng
          </h2>
          <ExcelUpload onUploadComplete={handleUploadComplete} />
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0 w-fit">
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === "orders"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Package className="w-4 h-4" />
          Đơn hàng
        </button>
        <button
          onClick={() => setActiveTab("changes")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === "changes"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Activity className="w-4 h-4" />
          Biến động đơn hàng
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "orders" ? (
        <>
          {/* Filters */}
          <div className="shrink-0 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <Suspense fallback={null}>
              <OrderFilters hideExport={isViewer} />
            </Suspense>
          </div>

          {/* Table */}
          <div className="flex-1 min-h-0 relative">
            <Suspense
              fallback={
                <div className="absolute inset-0 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center text-slate-400">
                  Đang tải...
                </div>
              }
            >
              <OrderTable
                userRole={userRole}
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRows}
              />
            </Suspense>
          </div>
        </>
      ) : (
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Đang tải...
            </div>
          }
        >
          <OrderChangesTab />
        </Suspense>
      )}

      {/* Upload History Dialog */}
      <UploadHistoryDialog
        open={showHistory}
        onOpenChange={setShowHistory}
        histories={historyData?.histories}
        pagination={historyData?.pagination}
        isLoading={isLoadingHistory}
        page={historyPage}
        onPageChange={setHistoryPage}
      />

      {/* Delete Toast */}
      {deleteResult && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            background: deleteResult.startsWith("✓") ? "#ecfdf5" : "#fef2f2",
            border: `1.5px solid ${
              deleteResult.startsWith("✓") ? "#10b981" : "#ef4444"
            }`,
            borderRadius: "10px",
            padding: "12px 20px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            color: deleteResult.startsWith("✓") ? "#065f46" : "#991b1b",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          {deleteResult}
        </div>
      )}

      {/* Changes Toast */}
      {changesToast !== null && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            background: "#eff6ff",
            border: "1.5px solid #3b82f6",
            borderRadius: "10px",
            padding: "12px 20px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            color: "#1e40af",
            fontSize: "13px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <Activity style={{ width: 16, height: 16 }} />
          <span>
            Phát hiện {changesToast.toLocaleString("vi-VN")} thay đổi mới
          </span>
          <button
            onClick={() => {
              setChangesToast(null);
              setActiveTab("changes");
            }}
            style={{
              marginLeft: 8,
              padding: "4px 12px",
              background: "#3b82f6",
              color: "white",
              borderRadius: "6px",
              fontSize: "12px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Xem biến động
          </button>
          <button
            onClick={() => setChangesToast(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px",
            }}
          >
            <X style={{ width: 14, height: 14, color: "#93c5fd" }} />
          </button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
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
