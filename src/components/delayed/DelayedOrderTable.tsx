"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useState } from "react";
import { ChevronLeft, ChevronRight, AlertTriangle, Info, CheckSquare, Flag, Truck } from "lucide-react";
import { ProcessedDelayedOrder } from "@/lib/delay-analyzer";
import { CopyOrderButton } from "./CopyOrderButton";
import { AddTodoDialog } from "@/components/shared/AddTodoDialog";
import { AddClaimFromPageDialog } from "@/components/shared/AddClaimFromPageDialog";
import { OrderDetailDialog } from "@/components/shared/OrderDetailDialog";
import { TrackingPopup } from "@/components/tracking/TrackingPopup";
import { ClaimBadge } from "@/components/shared/ClaimBadge";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { InlineStaffNote } from "@/components/shared/InlineStaffNote";


export function DelayedOrderTable({ data }: { data: ProcessedDelayedOrder[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const [sortKey, setSortKey] = useState<keyof ProcessedDelayedOrder>("delayCount");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [todoOrder, setTodoOrder] = useState<ProcessedDelayedOrder | null>(null);
  const [claimDelayedOrder, setClaimDelayedOrder] = useState<ProcessedDelayedOrder | null>(null);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [detailRequestCode, setDetailRequestCode] = useState<string | null>(null);

  const sortedData = [...data].sort((a, b) => {
    let va = a[sortKey] as any;
    let vb = b[sortKey] as any;

    if (va === null || va === undefined) va = "";
    if (vb === null || vb === undefined) vb = "";

    if (typeof va === "string") va = va.toLowerCase();
    if (typeof vb === "string") vb = vb.toLowerCase();

    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedData.length / PAGE_SIZE);
  if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);

  const pageData = sortedData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const requestSort = (key: keyof ProcessedDelayedOrder | "stt") => {
    if (key === "stt") return;
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const TheadCol = ({ label, sortName, width }: { label: string; sortName: keyof ProcessedDelayedOrder | "stt"; width?: string }) => (
    <TableHead
      className="text-[11px] font-medium uppercase text-slate-500 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors px-2"
      style={width ? { width, minWidth: width } : undefined}
      onClick={() => requestSort(sortName)}
    >
      {label} {sortKey === sortName && (sortDir === "asc" ? "↑" : "↓")}
    </TableHead>
  );

  const riskToPriority = (risk: string): "LOW" | "MEDIUM" | "HIGH" | "URGENT" => {
    if (risk === "high") return "URGENT";
    if (risk === "medium") return "HIGH";
    return "MEDIUM";
  };

  const riskToVietnamese = (risk: string) => {
    if (risk === "high") return "Cao";
    if (risk === "medium") return "Trung bình";
    return "Thấp";
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Keyframe for save animation */}
      <style>{`@keyframes fadeInOut { 0%{opacity:0;transform:scale(0.5)} 15%{opacity:1;transform:scale(1)} 75%{opacity:1} 100%{opacity:0;transform:scale(0.8)} }`}</style>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <Table className="table-fixed">
          <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[11px] font-medium uppercase text-slate-500 text-center px-1" style={{ width: "40px" }}>STT</TableHead>
              <TheadCol label="Mã Yêu Cầu" sortName="requestCode" width="130px" />
              <TheadCol label="Cửa Hàng" sortName="shopName" width="110px" />
              <TableHead className="text-[11px] font-medium uppercase text-slate-500 px-2" style={{ width: "200px" }}>Thông Tin Đơn</TableHead>
              <TheadCol label="Trạng Thái" sortName="status" width="100px" />
              <TheadCol label="Hoãn" sortName="delayCount" width="55px" />
              <TheadCol label="Ngày Tạo" sortName="createdTime" width="90px" />
              <TableHead className="text-[11px] font-medium uppercase text-slate-500 px-2" style={{ width: "145px" }}>Lý Do Hoãn</TableHead>
              <TableHead className="text-[11px] font-medium uppercase text-slate-500 px-2" style={{ width: "145px" }}>Chi Tiết Hoãn</TableHead>
              <TheadCol label="Nguy Cơ" sortName="riskScore" width="75px" />
              <TableHead
                className="text-[11px] font-medium uppercase text-slate-500 text-right cursor-pointer hover:bg-slate-100 px-2"
                style={{ width: "85px" }}
                onClick={() => requestSort("codAmount")}
              >
                Thu Hộ {sortKey === "codAmount" && (sortDir === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead className="text-[11px] font-medium uppercase text-slate-500 text-center px-1" style={{ width: "100px" }}>Thao Tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="h-48 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center p-6">
                    <Info className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="font-medium text-slate-700">Không tìm thấy đơn hàng</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pageData.map((o, idx) => {
                const isHigh = o.risk === "high";
                const borderClass = isHigh ? "border-l-[3px] border-l-red-500" : o.risk === "medium" ? "border-l-[3px] border-l-amber-500" : "border-l-[3px] border-l-emerald-500";

                return (
                  <TableRow key={o.requestCode} className={`border-b border-slate-100 hover:bg-slate-50/50 ${borderClass}`}>
                    {/* STT */}
                    <TableCell className="text-center font-medium text-slate-500 text-[12px] px-1">
                      {(currentPage - 1) * PAGE_SIZE + idx + 1}
                    </TableCell>

                    {/* Mã yêu cầu */}
                    <TableCell className="font-bold text-slate-800 text-[11px] px-2 overflow-hidden text-ellipsis whitespace-nowrap" title={o.requestCode}>
                      <div className="flex flex-col gap-0.5">
                        {o.claimOrder && <ClaimBadge issueType={o.claimOrder.issueType} />}
                        <button
                          onClick={() => setDetailRequestCode(o.requestCode)}
                          className="hover:text-blue-600 hover:underline font-mono cursor-pointer text-left"
                        >
                          {o.requestCode}
                        </button>
                      </div>
                    </TableCell>

                    {/* Cửa hàng */}
                    <TableCell className="text-slate-700 text-[12px] px-2 overflow-hidden text-ellipsis whitespace-nowrap" title={o.shopName}>
                      {o.shopName}
                    </TableCell>

                    {/* Thông tin đơn */}
                    <TableCell className="px-2">
                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        <div className="truncate" title={o.carrierOrderCode || undefined}>Mã: <span className="text-slate-800 font-medium">{o.carrierOrderCode || "-"}</span></div>
                        <div className="truncate">Tên: <span className="text-slate-800 font-medium">{o.receiverName}</span> - <span className="text-blue-600">{o.receiverPhone}</span></div>
                        <div className="truncate" title={o.fullAddress}>ĐC: {o.fullAddress}</div>
                        <CopyOrderButton order={o} />
                      </div>
                    </TableCell>

                    {/* Trạng thái */}
                    <TableCell className="px-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap
                        ${o.status.includes("Hoãn") ? "bg-orange-100 text-orange-700" : o.status.includes("Hoàn") ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}
                      `}>
                        {o.status.includes("Đang giao") && <AlertTriangle className="w-2.5 h-2.5" />}
                        {o.status}
                      </span>
                    </TableCell>

                    {/* Số lần hoãn */}
                    <TableCell className="text-center px-1">
                      <span className={`inline-flex justify-center items-center w-6 h-6 rounded text-[12px] font-bold shadow-sm
                        ${o.delayCount >= 3 ? "bg-red-100 text-red-700" : o.delayCount === 2 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}
                      `}>
                        {o.delayCount}
                      </span>
                    </TableCell>

                    {/* Ngày tạo */}
                    <TableCell className="px-2">
                      <div className="text-[11px] text-slate-700 whitespace-nowrap">
                        {o.createdTime ? format(new Date(o.createdTime), "dd/MM/yy", { locale: vi }) : "-"}
                        <div className="text-[10px] text-slate-400 mt-0.5">{o.daysAge}n trước</div>
                      </div>
                    </TableCell>

                    {/* Lý do hoãn */}
                    <TableCell className="px-2">
                      <div className="flex flex-wrap gap-0.5" style={{ maxWidth: "140px" }}>
                        {o.uniqueReasons.map((r, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] rounded border border-slate-200 font-medium leading-tight">
                            {r}
                          </span>
                        ))}
                      </div>
                    </TableCell>

                    {/* Chi tiết hoãn */}
                    <TableCell className="px-2">
                      <div className="text-[10px] text-slate-600 space-y-1 relative pl-2.5 border-l-2 border-slate-200" style={{ maxWidth: "140px" }}>
                        {o.delays.length > 0 ? o.delays.map((d, i) => (
                          <div key={i} className="relative">
                            <div className="absolute -left-[13px] top-1 w-1 h-1 rounded-full bg-slate-400"></div>
                            <span className="font-semibold text-slate-700">{d.time} {d.date}:</span> {d.reason}
                          </div>
                        )) : <span className="italic text-slate-400">—</span>}
                      </div>
                    </TableCell>

                    {/* Nguy cơ */}
                    <TableCell className="px-2">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase
                        ${isHigh ? "bg-red-100 text-red-700" : o.risk === "medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}
                      `}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isHigh ? "bg-red-500" : o.risk === "medium" ? "bg-amber-500" : "bg-emerald-500"}`}></span>
                        {riskToVietnamese(o.risk)}
                      </span>
                    </TableCell>

                    {/* Thu hộ */}
                    <TableCell className="text-right font-bold text-slate-700 text-[12px] whitespace-nowrap px-2">
                      {o.codAmount.toLocaleString("vi-VN")}đ
                    </TableCell>

                    {/* Thao tác — buttons + inline notes */}
                    <TableCell className="px-1">
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
                        {/* Row 1: action buttons */}
                        <div className="flex items-center gap-1 justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTodoOrder(o);
                            }}
                            className="p-1 w-7 h-7 flex items-center justify-center text-blue-500 hover:bg-blue-50 hover:text-blue-600 border border-transparent hover:border-blue-200 transition-colors rounded"
                            title="Thêm vào Công Việc"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setClaimDelayedOrder(o);
                            }}
                            className="p-1 w-7 h-7 flex items-center justify-center text-orange-500 hover:bg-orange-50 hover:text-orange-600 border border-transparent hover:border-orange-200 transition-colors rounded"
                            title="Chuyển vào Đơn có vấn đề"
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTrackingCode(o.requestCode);
                            }}
                            className="p-1 w-7 h-7 flex items-center justify-center text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 border border-transparent hover:border-emerald-200 transition-colors rounded"
                            title="Tra hành trình"
                          >
                            <Truck className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {/* Row 2: inline staff notes */}
                        <InlineStaffNote requestCode={o.requestCode} initialValue={o.staffNotes} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="bg-slate-50 border-t border-slate-200 p-3 flex items-center justify-between shrink-0">
          <span className="text-[13px] text-slate-500 font-medium">
            Trang <b className="text-slate-700">{currentPage}</b> / {totalPages} <span className="opacity-50">|</span> {sortedData.length} đơn
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 flex items-center gap-1 border border-slate-200 rounded text-[13px] font-medium bg-white hover:bg-slate-100 disabled:opacity-50 shadow-sm transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Trước
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 flex items-center gap-1 border border-slate-200 rounded text-[13px] font-medium bg-white hover:bg-slate-100 disabled:opacity-50 shadow-sm transition-all"
            >
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
          defaultTitle={`Xử lý đơn ${todoOrder.requestCode}`}
          defaultDescription={`Đơn: ${todoOrder.requestCode} - Shop: ${todoOrder.shopName} - KH: ${todoOrder.receiverName} - Hoãn ${todoOrder.delayCount} lần - Nguy cơ: ${riskToVietnamese(todoOrder.risk)}`}
          defaultPriority={riskToPriority(todoOrder.risk)}
          linkedOrderId={todoOrder.id}
          source="FROM_DELAYED"
        />
      )}

      {/* Claim Dialog */}
      <AddClaimFromPageDialog
        open={!!claimDelayedOrder}
        onClose={() => setClaimDelayedOrder(null)}
        order={claimDelayedOrder ? { id: claimDelayedOrder.id, requestCode: claimDelayedOrder.requestCode, carrierName: claimDelayedOrder.carrierName, shopName: claimDelayedOrder.shopName, codAmount: claimDelayedOrder.codAmount } : undefined}
        source="FROM_DELAYED"
      />

      {/* Tracking Popup */}
      <TrackingPopup
        requestCode={trackingCode || ""}
        isOpen={!!trackingCode}
        onClose={() => setTrackingCode(null)}
      />

      {/* Order Detail Dialog */}
      <OrderDetailDialog
        requestCode={detailRequestCode}
        open={!!detailRequestCode}
        onClose={() => setDetailRequestCode(null)}
        userRole="ADMIN"
      />
    </div>
  );
}
