"use client";

import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Flag, CheckSquare, Info, ChevronLeft, ChevronRight, Truck } from "lucide-react";
import { InlineStaffNote } from "@/components/shared/InlineStaffNote";
import { AddTodoDialog } from "@/components/shared/AddTodoDialog";
import { AddClaimFromPageDialog } from "@/components/shared/AddClaimFromPageDialog";
import { TrackingPopup } from "@/components/tracking/TrackingPopup";
import { ClaimBadge } from "@/components/shared/ClaimBadge";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ReturnFilters } from "./ReturnFilterPanel";
import { ReturnOrder } from "@/types/returns";
import { format } from "date-fns";

function getDaysReturning(deliveredDate: string | null): number {
  if (!deliveredDate) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(deliveredDate).getTime()) / 86400000));
}

function DaysBadge({ days }: { days: number }) {
  const cls = days >= 8 ? "bg-red-100 text-red-700" : days >= 4 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
  return (
    <span className={`inline-flex justify-center items-center px-2 py-0.5 rounded text-[11px] font-bold ${cls}`}>
      {days} ngày
    </span>
  );
}

interface Props {
  data: ReturnOrder[];
  filters: ReturnFilters;
  pageSize: number;
  onWarehouseConfirm: (requestCode: string) => void;
}

export function PartialReturnTab({ data, filters, pageSize, onWarehouseConfirm }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>("daysReturning");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [todoOrder, setTodoOrder] = useState<ReturnOrder | null>(null);
  const [confirmingCode, setConfirmingCode] = useState<string | null>(null);
  const [claimReturnOrder, setClaimReturnOrder] = useState<ReturnOrder | null>(null);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);

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
      const d = getDaysReturning(o.deliveredDate);
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
      va = getDaysReturning(a.deliveredDate);
      vb = getDaysReturning(b.deliveredDate);
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
              <SortHead label="Ngày Giao" k="deliveredDate" w="100px" />
              <SortHead label="Số Ngày Hoàn" k="daysReturning" w="80px" />
              <SortHead label="Mã 1 Phần" k="partialOrderCode" w="120px" />
              <TableHead className="text-[11px] font-medium uppercase text-slate-500 text-center px-1" style={{ width: "85px" }}>Đã Về Kho</TableHead>
              <TableHead className="text-[11px] font-medium uppercase text-slate-500 px-2" style={{ width: "120px" }}>Ghi Chú</TableHead>
              <TableHead className="text-[11px] font-medium uppercase text-slate-500 text-center px-1" style={{ width: "100px" }}>Thao Tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-48 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center p-6">
                    <Info className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="font-medium text-slate-700">Không tìm thấy đơn hàng</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pageData.map((o, idx) => {
                const days = getDaysReturning(o.deliveredDate);
                return (
                  <TableRow key={o.requestCode} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <TableCell className="text-center font-medium text-slate-500 text-[12px] px-1">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </TableCell>
                    <TableCell className="font-bold text-slate-800 text-[11px] px-2 truncate" title={o.requestCode}>
                      <div className="flex flex-col gap-0.5">
                        {o.claimOrder && <ClaimBadge issueType={o.claimOrder.issueType} />}
                        <a
                          href={`/orders/${o.requestCode}`}
                          onClick={(e) => {
                            e.preventDefault();
                            const currentUrl = `${pathname}?${searchParams.toString()}`;
                            router.push(`/orders/${o.requestCode}?from=${encodeURIComponent(currentUrl)}`);
                          }}
                          className="hover:text-blue-600 hover:underline font-mono cursor-pointer"
                        >{o.requestCode}</a>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-700 text-[11px] px-2 truncate">{o.carrierOrderCode || "-"}</TableCell>
                    <TableCell className="text-slate-700 text-[12px] px-2 truncate" title={o.shopName || ""}>{o.shopName || "-"}</TableCell>
                    <TableCell className="px-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 whitespace-nowrap">
                        Đã giao hàng
                      </span>
                    </TableCell>
                    <TableCell className="text-[11px] text-slate-700 px-2 whitespace-nowrap">
                      {o.deliveredDate ? format(new Date(o.deliveredDate), "dd/MM/yyyy") : "-"}
                    </TableCell>
                    <TableCell className="text-center px-1"><DaysBadge days={days} /></TableCell>
                    <TableCell className="text-[11px] text-slate-700 px-2 truncate">{o.partialOrderCode || "-"}</TableCell>
                    <TableCell className="text-center px-1">
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => setConfirmingCode(o.requestCode)}
                        className="w-4 h-4 cursor-pointer accent-blue-600"
                        title="Đánh dấu đã về kho"
                      />
                    </TableCell>
                    <TableCell className="px-2"><InlineStaffNote requestCode={o.requestCode} initialValue={o.staffNotes || ""} /></TableCell>
                    <TableCell className="px-1">
                      <div className="flex items-center gap-1 justify-center">
                        <button
                          onClick={() => setClaimReturnOrder(o)}
                          className="p-1 w-7 h-7 flex items-center justify-center text-orange-500 hover:bg-orange-50 hover:text-orange-600 border border-transparent hover:border-orange-200 transition-colors rounded"
                          title="Chuyển vào Đơn có vấn đề"
                        >
                          <Flag className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setTodoOrder(o)}
                          className="p-1 w-7 h-7 flex items-center justify-center text-blue-500 hover:bg-blue-50 hover:text-blue-600 border border-transparent hover:border-blue-200 transition-colors rounded"
                          title="Thêm vào Công Việc"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setTrackingCode(o.requestCode)}
                          className="p-1 w-7 h-7 flex items-center justify-center text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 border border-transparent hover:border-emerald-200 transition-colors rounded"
                          title="Tra hành trình"
                        >
                          <Truck className="w-3.5 h-3.5" />
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

      {/* Warehouse confirmation dialog */}
      {confirmingCode && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setConfirmingCode(null)}>
          <div style={{ background: "#FFFFFF", border: "1.5px solid #2563EB", borderRadius: "12px", padding: "24px", width: "420px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}
            onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a1a", marginBottom: "12px" }}>Xác nhận về kho</h3>
            <p style={{ fontSize: "14px", color: "#374151", marginBottom: "20px" }}>
              Xác nhận đơn <b>{confirmingCode}</b> đã về kho trả hàng?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                onClick={() => setConfirmingCode(null)}
                style={{ padding: "8px 16px", fontSize: "13px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#fff", color: "#374151", cursor: "pointer" }}
              >Hủy</button>
              <button
                onClick={() => { onWarehouseConfirm(confirmingCode); setConfirmingCode(null); }}
                style={{ padding: "8px 16px", fontSize: "13px", border: "none", borderRadius: "8px", background: "#2563EB", color: "#fff", cursor: "pointer", fontWeight: 600 }}
              >Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* Todo Dialog */}
      {todoOrder && (
        <AddTodoDialog
          open={!!todoOrder}
          onClose={() => setTodoOrder(null)}
          defaultTitle={`Xử lý đơn hoàn 1 phần ${todoOrder.requestCode}`}
          defaultDescription={`Đơn hoàn 1 phần: ${todoOrder.requestCode} - Shop: ${todoOrder.shopName} - Mã 1 phần: ${todoOrder.partialOrderCode}`}
          defaultPriority="MEDIUM"
          linkedOrderId={todoOrder.id}
          source="FROM_RETURNS"
        />
      )}

      {/* Claim Dialog */}
      <AddClaimFromPageDialog
        open={!!claimReturnOrder}
        onClose={() => setClaimReturnOrder(null)}
        order={claimReturnOrder ? { id: claimReturnOrder.id, requestCode: claimReturnOrder.requestCode, shopName: claimReturnOrder.shopName, codAmount: claimReturnOrder.codAmount } : undefined}
        source="FROM_RETURNS"
      />

      {/* Tracking Popup */}
      <TrackingPopup
        requestCode={trackingCode || ""}
        isOpen={!!trackingCode}
        onClose={() => setTrackingCode(null)}
      />
    </>
  );
}
