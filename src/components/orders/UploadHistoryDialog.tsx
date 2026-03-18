"use client";

import { Loader2, History, ChevronLeft, ChevronRight } from "lucide-react";
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

interface UploadHistory {
  id: string;
  uploadedAt: string;
  uploadedBy: { name: string } | null;
  newOrders: number;
  updatedOrders: number;
  totalRows: number;
}

interface Pagination {
  page: number;
  totalPages: number;
}

interface UploadHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  histories: UploadHistory[] | undefined;
  pagination: Pagination | undefined;
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
}

export function UploadHistoryDialog({
  open,
  onOpenChange,
  histories,
  pagination,
  isLoading,
  page,
  onPageChange,
}: UploadHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mb-3 text-slate-300" />
                      <span className="text-sm">Đang tải dữ liệu lịch sử...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : histories?.length === 0 ? (
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
                histories?.map((h, index) => (
                  <TableRow
                    key={h.id}
                    className="border-b border-slate-100 transition-colors even:bg-slate-50/30 hover:bg-blue-50/30"
                  >
                    <TableCell className="px-4 py-3 font-medium text-slate-500 text-[13px]">
                      {(page - 1) * 10 + index + 1}
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

        {!isLoading && pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 flex items-center justify-between border-t border-slate-100">
            <span className="text-[13px] text-slate-500 font-semibold">
              Trang {pagination.page} / {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-1.5 border border-slate-200 bg-white text-slate-700 rounded-lg text-[13px] hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center font-bold shadow-sm"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Trước
              </button>
              <button
                onClick={() => onPageChange(Math.min(pagination.totalPages, page + 1))}
                disabled={page === pagination.totalPages}
                className="px-4 py-1.5 border border-slate-200 bg-white text-slate-700 rounded-lg text-[13px] hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center font-bold shadow-sm"
              >
                Sau <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
