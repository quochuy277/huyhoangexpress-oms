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
import { getUploadHistoryDialogClassNames } from "@/components/orders/ordersResponsive";

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
  const responsiveClasses = getUploadHistoryDialogClassNames();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full p-0 overflow-hidden bg-white sm:rounded-xl border-[1.5px] border-blue-600 shadow-2xl">
        <DialogHeader className={responsiveClasses.header}>
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-slate-900">
            <div className="rounded-lg bg-blue-50 p-2">
              <History className="h-5 w-5 text-blue-600" />
            </div>
            Lịch sử tải lên file Excel
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto bg-white">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-b border-slate-200 transition-none hover:bg-transparent">
                <TableHead className={`${responsiveClasses.tableHead} w-[60px]`}>STT</TableHead>
                <TableHead className={`${responsiveClasses.tableHead} whitespace-nowrap`}>
                  Thời gian tải lên
                </TableHead>
                <TableHead className={responsiveClasses.tableHead}>Nhân sự tải lên</TableHead>
                <TableHead className={`${responsiveClasses.tableHead} whitespace-nowrap text-right`}>
                  Số đơn mới
                </TableHead>
                <TableHead className={`${responsiveClasses.tableHead} whitespace-nowrap text-right`}>
                  Cập nhật
                </TableHead>
                <TableHead className={`${responsiveClasses.tableHead} whitespace-nowrap text-right`}>
                  Tổng đơn
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Loader2 className="mb-3 h-6 w-6 animate-spin text-slate-300" />
                      <span className="text-sm">Đang tải dữ liệu lịch sử...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : histories?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
                        <History className="h-6 w-6 text-slate-300" />
                      </div>
                      <span className="text-sm font-medium">Chưa có lịch sử tải lên</span>
                      <span className="mt-1 text-xs text-slate-400">
                        Các file tải lên sẽ xuất hiện tại đây.
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                histories?.map((history, index) => (
                  <TableRow
                    key={history.id}
                    className="border-b border-slate-100 transition-colors even:bg-slate-50/30 hover:bg-blue-50/30"
                  >
                    <TableCell className="px-4 py-3 text-[13px] font-medium text-slate-500">
                      {(page - 1) * 10 + index + 1}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-[13px] font-medium text-slate-700">
                      {format(new Date(history.uploadedAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-[13px] font-semibold text-slate-800">
                      {history.uploadedBy?.name || "Hệ thống"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-right">
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 shadow-sm">
                        +{history.newOrders}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-right">
                      <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700 shadow-sm">
                        ^{history.updatedOrders}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right text-[14px] font-bold text-slate-900">
                      {history.totalRows.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!isLoading && pagination && pagination.totalPages > 1 && (
          <div className={responsiveClasses.footer}>
            <span className="text-[13px] font-semibold text-slate-500">
              Trang {pagination.page} / {pagination.totalPages}
            </span>
            <div className={responsiveClasses.pagerGroup}>
              <button
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className={responsiveClasses.pagerButton}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Trước
              </button>
              <button
                onClick={() => onPageChange(Math.min(pagination.totalPages, page + 1))}
                disabled={page === pagination.totalPages}
                className={responsiveClasses.pagerButton}
              >
                Sau <ChevronRight className="ml-1 h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
