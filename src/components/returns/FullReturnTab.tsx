"use client";

import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AlertTriangle, CheckSquare, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { InlineStaffNote } from "@/components/shared/InlineStaffNote";
import { AddTodoDialog } from "@/components/shared/AddTodoDialog";
import { parseDelays } from "@/lib/delay-analyzer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReturnFilters } from "./ReturnFilterPanel";
import { ReturnOrder } from "./PartialReturnTab";
import { format } from "date-fns";

function parseVietnameseDate(dateStr: string): Date | null {
  // Parse "DD/MM/YYYY" → Date
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  return new Date(y, m - 1, d);
}

function getLastDelayDate(publicNotes: string | null, lastUpdated: string | null): Date | null {
  const delays = parseDelays(publicNotes || "");
  if (delays.length > 0) {
    const last = delays[delays.length - 1];
    const parsed = parseVietnameseDate(last.date);
    if (parsed) return parsed;
  }
  return lastUpdated ? new Date(lastUpdated) : null;
}

function getDaysReturning(date: Date | null): number {
  if (!date) return 0;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function DaysBadge({ days }: { days: number }) {
  const cls = days >= 8 ? "bg-red-100 text-red-700" : days >= 4 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
  return (
    <span className={`inline-flex justify-center items-center px-2 py-0.5 rounded text-[11px] font-bold ${cls}`}>
      {days} ngày
    </span>
  );
}

function getPriority(days: number): "LOW" | "MEDIUM" | "HIGH" | "URGENT" {
  if (days >= 8) return "URGENT";
  if (days >= 4) return "HIGH";
  return "MEDIUM";
}

interface Props {
  data: ReturnOrder[];
  filters: ReturnFilters;
  pageSize: number;
}

export function FullReturnTab({ data, filters, pageSize }: Props) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>("daysReturning");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [todoOrder, setTodoOrder] = useState<ReturnOrder | null>(null);
  const [todoDays, setTodoDays] = useState(0);

  // Filter
  let filtered = data.filter((o) => {
    if (filters.search) {
      const s = filters.search.toLowerCase();
      if (
        !o.requestCode.toLowerCase().includes(s) &&
        !(o.carrierOrderCode || "").toLowerCase().includes(s) &&
        !(o.shopName || "").toLowerCase().includes(s)
      ) return false;
    }
    if (filters.shopName && o.shopName !== filters.shopName) return false;
    if (filters.daysRange) {
      const lastDate = getLastDelayDate(o.publicNotes, o.lastUpdated);
      const d = getDaysReturning(lastDate);
      if (filters.daysRange === "lte3" && d > 3) return false;
      if (filters.daysRange === "4to7" && (d < 4 || d > 7)) return false;
      if (filters.daysRange === "gte8" && d < 8) return false;
    }
    if (filters.hasNotes === "has" && !o.staffNotes) return false;
    if (filters.hasNotes === "empty" && o.staffNotes) return false;
    return true;
  });

  // Sort
  filtered = [...filtered].sort((a, b) => {
    let va: any, vb: any;
    if (sortKey === "daysReturning") {
      va = getDaysReturning(getLastDelayDate(a.publicNotes, a.lastUpdated));
      vb = getDaysReturning(getLastDelayDate(b.publicNotes, b.lastUpdated));
    } else if (sortKey === "lastDelayDate") {
      va = getLastDelayDate(a.publicNotes, a.lastUpdated)?.getTime() ?? 0;
      vb = getLastDelayDate(b.publicNotes, b.lastUpdated)?.getTime() ?? 0;
    } else {
      va = (a as any)[sortKey] ?? "";
      vb = (b as any)[sortKey] ?? "";
    }
    if (typeof va === "string") { va = va.toLowerCase(); vb = (vb as string).toLowerCase(); }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  if (currentPage > totalPages) setCurrentPage(1);
  const pageData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const requestSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortHead = ({ label, k, w }: { label: string; k: string; w: string }) => (
    <TableHead
      className="text-[11px] font-medium uppercase text-slate-500 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors px-2"
      style={{ width: w, minWidth: w }}
      onClick={() => requestSort(k)}
    >
      {label} {sortKey === k && (sortDir === "asc" ? "↑" : "↓")}
    </TableHead>
  );

  return (
    <>
      <style>{`@keyframes fadeInOut{0%{opacity:0;transform:scale(.5)}15%{opacity:1;transform:scale(1)}75%{opacity:1}100%{opacity:0;transform:scale(.8)}}`}</style>
      <div className="flex-1 overflow-auto custom-scrollbar">
        <Table className="table-fixed">
          <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[11px] font-medium uppercase text-slate-500 text-center px-1" style={{ width: "40px" }}>STT</TableHead>
              <SortHead label="Mã Yêu Cầu" k="requestCode" w="140px" />
              <SortHead label="Mã Đơn Đối Tác" k="carrierOrderCode" w="120px" />
              <SortHead label="Tên Cửa Hàng" k="shopName" w="140px" />
              <TableHead className="text-[11px] font-medium uppercase text-slate-500 px-2" style={{ width: "120px" }}>Trạng Thái</TableHead>
              <SortHead label="Hoãn Giao Cuối" k="lastDelayDate" w="110px" />
              <SortHead label="Số Ngày Hoàn" k="daysReturning" w="80px" />
              <TableHead className="text-[11px] font-medium uppercase text-slate-500 px-2" style={{ width: "150px" }}>Ghi Chú</TableHead>
              <TableHead className="text-[11px] font-medium uppercase text-slate-500 text-center px-1" style={{ width: "100px" }}>Thao Tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-48 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center p-6">
                    <Info className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="font-medium text-slate-700">Không tìm thấy đơn hàng</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pageData.map((o, idx) => {
                const lastDate = getLastDelayDate(o.publicNotes, o.lastUpdated);
                const days = getDaysReturning(lastDate);
                return (
                  <TableRow key={o.requestCode} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <TableCell className="text-center font-medium text-slate-500 text-[12px] px-1">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </TableCell>
                    <TableCell className="font-bold text-slate-800 text-[11px] px-2 truncate" title={o.requestCode}>
                      <Link href={`/orders/${o.requestCode}`} className="hover:text-blue-600 hover:underline font-mono">{o.requestCode}</Link>
                    </TableCell>
                    <TableCell className="text-slate-700 text-[11px] px-2 truncate">{o.carrierOrderCode || "-"}</TableCell>
                    <TableCell className="text-slate-700 text-[12px] px-2 truncate" title={o.shopName || ""}>{o.shopName || "-"}</TableCell>
                    <TableCell className="px-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 whitespace-nowrap">
                        Đang chuyển kho trả
                      </span>
                    </TableCell>
                    <TableCell className="text-[11px] text-slate-700 px-2 whitespace-nowrap">
                      {lastDate ? format(lastDate, "dd/MM/yyyy") : "-"}
                    </TableCell>
                    <TableCell className="text-center px-1"><DaysBadge days={days} /></TableCell>
                    <TableCell className="px-2"><InlineStaffNote requestCode={o.requestCode} initialValue={o.staffNotes || ""} /></TableCell>
                    <TableCell className="px-1">
                      <div className="flex items-center gap-1 justify-center">
                        <button
                          onClick={() => router.push(`/claims/new?requestCode=${o.requestCode}`)}
                          className="p-1 w-7 h-7 flex items-center justify-center text-orange-500 hover:bg-orange-50 hover:text-orange-600 border border-transparent hover:border-orange-200 transition-colors rounded"
                          title="Khiếu nại/Bồi hoàn"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setTodoOrder(o); setTodoDays(days); }}
                          className="p-1 w-7 h-7 flex items-center justify-center text-blue-500 hover:bg-blue-50 hover:text-blue-600 border border-transparent hover:border-blue-200 transition-colors rounded"
                          title="Thêm vào Công Việc"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-slate-50 border-t border-slate-200 p-3 flex items-center justify-between shrink-0">
          <span className="text-[13px] text-slate-500 font-medium">
            Trang <b className="text-slate-700">{currentPage}</b> / {totalPages} <span className="opacity-50">|</span> {filtered.length} đơn
          </span>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
              className="px-3 py-1.5 flex items-center gap-1 border border-slate-200 rounded text-[13px] font-medium bg-white hover:bg-slate-100 disabled:opacity-50 shadow-sm transition-all">
              <ChevronLeft className="w-3.5 h-3.5" /> Trước
            </button>
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              className="px-3 py-1.5 flex items-center gap-1 border border-slate-200 rounded text-[13px] font-medium bg-white hover:bg-slate-100 disabled:opacity-50 shadow-sm transition-all">
              Sau <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Todo Dialog */}
      {todoOrder && (
        <AddTodoDialog
          open={!!todoOrder}
          onClose={() => setTodoOrder(null)}
          defaultTitle={`Theo dõi đơn hoàn ${todoOrder.requestCode}`}
          defaultDescription={`Đơn hoàn toàn bộ: ${todoOrder.requestCode} - Shop: ${todoOrder.shopName} - Đang hoàn ${todoDays} ngày`}
          defaultPriority={getPriority(todoDays)}
        />
      )}
    </>
  );
}
