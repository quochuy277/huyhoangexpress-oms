"use client";

import { useState, Suspense } from "react";
import { ExcelUpload } from "@/components/orders/ExcelUpload";
import { OrderFilters } from "@/components/orders/OrderFilters";
import { OrderTable } from "@/components/orders/OrderTable";
import { Upload, X, Trash2, Loader2, History, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";

interface OrdersClientProps {
  userRole: string;
}

export function OrdersClient({ userRole }: OrdersClientProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

  // Lấy dữ liệu Upload History
  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["upload-history", historyPage],
    queryFn: async () => {
      const res = await fetch(`/api/orders/upload-history?page=${historyPage}&pageSize=10`);
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

      // Refetch table
      const refetch = (window as any).__refetchOrders;
      if (typeof refetch === "function") (refetch as () => void)();

      setTimeout(() => setDeleteResult(null), 4000);
    } catch {
      setDeleteResult("✗ Lỗi khi xóa đơn hàng. Vui lòng thử lại.");
      setTimeout(() => setDeleteResult(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản Lý Đơn Hàng</h1>
          <p className="text-sm text-slate-500 mt-0.5">Tìm kiếm, lọc và quản lý toàn bộ đơn hàng</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedRows.length > 0 && isAdminOrManager && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Tải lên file đơn hàng</h2>
          <ExcelUpload
            onUploadComplete={() => {
              const refetch = (window as any).__refetchOrders;
              if (typeof refetch === "function") {
                (refetch as () => void)();
              }
            }}
          />
        </div>
      )}

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

      {/* Lịch sử Upload Modal */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl w-full p-0 overflow-hidden bg-white sm:rounded-xl border-[1.5px] border-blue-600 shadow-2xl">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-white">
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-50">
                <History className="w-5 h-5 text-blue-600" />
              </div>
              Lịch sử tải lên file Excel
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-x-auto bg-white">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="border-b border-slate-200 hover:bg-transparent transition-none">
                  <TableHead className="px-4 py-3 h-auto text-[11px] font-bold uppercase tracking-wider text-slate-500 w-[60px]">STT</TableHead>
                  <TableHead className="px-4 py-3 h-auto text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Thời gian tải lên</TableHead>
                  <TableHead className="px-4 py-3 h-auto text-[11px] font-bold uppercase tracking-wider text-slate-500">Nhân sự tải lên</TableHead>
                  <TableHead className="px-4 py-3 h-auto text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right whitespace-nowrap">Số đơn mới</TableHead>
                  <TableHead className="px-4 py-3 h-auto text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right whitespace-nowrap">Cập nhật</TableHead>
                  <TableHead className="px-4 py-3 h-auto text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right whitespace-nowrap">Tổng Đơn</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingHistory ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mb-3 text-slate-300" />
                        <span className="text-sm">Đang tải dữ liệu lịch sử...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : historyData?.histories?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                          <History className="w-6 h-6 text-slate-300" />
                        </div>
                        <span className="text-sm font-medium">Chưa có lịch sử tải lên</span>
                        <span className="text-xs mt-1 text-slate-400">Các file tải lên sẽ xuất hiện tại đây.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  historyData?.histories?.map((h: any, index: number) => (
                    <TableRow 
                      key={h.id} 
                      className="border-b border-slate-100 transition-colors even:bg-slate-50/30 hover:bg-blue-50/30"
                    >
                      <TableCell className="px-4 py-3 font-medium text-slate-500 text-[13px]">
                        {(historyPage - 1) * 10 + index + 1}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-slate-700 text-[13px] whitespace-nowrap font-medium">
                        {format(new Date(h.uploadedAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-slate-800 text-[13px] font-semibold">
                        {h.uploadedBy?.name || "Hệ thống"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">
                          +{h.newOrders}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-200 shadow-sm">
                          ^{h.updatedOrders}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right font-bold text-slate-900 text-[14px]">
                        {h.totalRows.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!isLoadingHistory && historyData?.pagination && historyData.pagination.totalPages > 1 && (
            <div className="px-6 py-4 bg-slate-50 flex items-center justify-between border-t border-slate-100">
              <span className="text-[13px] text-slate-500 font-semibold">
                Trang {historyData.pagination.page} / {historyData.pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={historyPage === 1}
                  className="px-4 py-1.5 border border-slate-200 bg-white text-slate-700 rounded-lg text-[13px] hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center font-bold shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Trước
                </button>
                <button
                  onClick={() => setHistoryPage((p) => Math.min(historyData.pagination.totalPages, p + 1))}
                  disabled={historyPage === historyData.pagination.totalPages}
                  className="px-4 py-1.5 border border-slate-200 bg-white text-slate-700 rounded-lg text-[13px] hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center font-bold shadow-sm"
                >
                  Sau <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Toast */}
      {deleteResult && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 9999,
          background: deleteResult.startsWith("✓") ? "#ecfdf5" : "#fef2f2",
          border: `1.5px solid ${deleteResult.startsWith("✓") ? "#10b981" : "#ef4444"}`,
          borderRadius: "10px", padding: "12px 20px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          color: deleteResult.startsWith("✓") ? "#065f46" : "#991b1b",
          fontSize: "13px", fontWeight: 600,
        }}>
          {deleteResult}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowDeleteDialog(false)}>
          <div style={{ background: "#fff", border: "1.5px solid #2563EB", borderRadius: "12px", padding: "24px", width: "480px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}
            onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#1a1a1a", marginBottom: "8px" }}>Xác nhận xóa đơn hàng</h3>
            <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px" }}>
              Hành động này <b style={{ color: "#dc2626" }}>không thể hoàn tác</b>. Các đơn hàng sau sẽ bị xóa vĩnh viễn:
            </p>
            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px", marginBottom: "20px", maxHeight: "150px", overflowY: "auto" }}>
              {selectedRows.slice(0, 10).map((code) => (
                <div key={code} style={{ fontSize: "12px", fontFamily: "monospace", color: "#374151", padding: "2px 0" }}>{code}</div>
              ))}
              {selectedRows.length > 10 && (
                <div style={{ fontSize: "12px", color: "#9ca3af", paddingTop: "4px" }}>+ {selectedRows.length - 10} đơn khác...</div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", borderTop: "1px solid #e5e7eb", paddingTop: "16px" }}>
              <button
                onClick={() => setShowDeleteDialog(false)}
                style={{ padding: "8px 16px", fontSize: "13px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#fff", color: "#374151", cursor: "pointer" }}
                disabled={isDeleting}
              >Hủy</button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                style={{ padding: "8px 20px", fontSize: "13px", fontWeight: 600, border: "none", borderRadius: "8px", background: isDeleting ? "#9ca3af" : "#dc2626", color: "#fff", cursor: isDeleting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px" }}
              >
                {isDeleting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" style={{ display: "inline" }} /> Đang xóa...</> : <>🗑 Xóa {selectedRows.length} đơn</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
