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
import { ChevronLeft, ChevronRight, AlertTriangle, Info } from "lucide-react";
import { ProcessedDelayedOrder } from "@/lib/delay-analyzer";
import { CopyOrderButton } from "./CopyOrderButton";
import Link from "next/link";

export function DelayedOrderTable({ data }: { data: ProcessedDelayedOrder[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const [sortKey, setSortKey] = useState<keyof ProcessedDelayedOrder>("delayCount");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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
  // Reset page if filtered data shrinks
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

  const TheadCol = ({ label, sortName }: { label: string, sortName: keyof ProcessedDelayedOrder | "stt" }) => (
    <TableHead 
      className="text-[12px] font-medium uppercase text-slate-500 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
      onClick={() => requestSort(sortName)}
    >
      {label} {sortKey === sortName && (sortDir === "asc" ? "↑" : "↓")}
    </TableHead>
  );

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex-1 overflow-auto custom-scrollbar">
        <Table>
          <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[50px] text-[12px] font-medium uppercase text-slate-500 text-center">STT</TableHead>
              <TheadCol label="Mã Yêu Cầu" sortName="requestCode" />
              <TheadCol label="Cửa Hàng" sortName="shopName" />
              <TableHead className="text-[12px] font-medium uppercase text-slate-500 min-w-[240px]">Thông Tin Đơn Hàng</TableHead>
              <TheadCol label="Trạng Thái" sortName="status" />
              <TheadCol label="Số Lần Hoãn" sortName="delayCount" />
              <TheadCol label="Ngày Tạo Đơn" sortName="createdTime" />
              <TableHead className="text-[12px] font-medium uppercase text-slate-500 min-w-[220px]">Lý Do Hoãn Giao</TableHead>
              <TableHead className="text-[12px] font-medium uppercase text-slate-500 min-w-[220px]">Chi Tiết Hoãn Giao</TableHead>
              <TheadCol label="Nguy Cơ" sortName="riskScore" />
              <TableHead 
                className="text-[12px] font-medium uppercase text-slate-500 text-right cursor-pointer hover:bg-slate-100"
                onClick={() => requestSort("codAmount")}
              >
                Thu Hộ (VND) {sortKey === "codAmount" && (sortDir === "asc" ? "↑" : "↓")}
              </TableHead>
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
                const isHigh = o.risk === "high";
                const borderClass = isHigh ? "border-l-[3px] border-l-red-500" : o.risk === "medium" ? "border-l-[3px] border-l-amber-500" : "border-l-[3px] border-l-emerald-500";
                
                return (
                  <TableRow key={o.requestCode} className={`border-b border-slate-100 hover:bg-slate-50/50 ${borderClass}`}>
                    <TableCell className="text-center font-medium text-slate-500 text-[13px]">
                      {(currentPage - 1) * PAGE_SIZE + idx + 1}
                    </TableCell>
                    <TableCell className="font-bold text-slate-800 text-[12px] whitespace-nowrap">
                      <Link href={`/orders/${o.requestCode}`} className="hover:text-blue-600 hover:underline">
                        {o.requestCode}
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-700 text-[13px]">{o.shopName}</TableCell>
                    
                    <TableCell>
                      <div className="text-[12px] text-slate-500 space-y-1">
                        <div>Mã đơn: <span className="text-slate-800 font-medium">{o.carrierOrderCode || '-'}</span></div>
                        <div>Tên: <span className="text-slate-800 font-medium">{o.receiverName}</span> - SĐT: <span className="text-blue-600 font-medium">{o.receiverPhone}</span></div>
                        <div className="truncate max-w-[220px]" title={o.fullAddress}>ĐC: <span className="text-slate-800">{o.fullAddress}</span></div>
                        <CopyOrderButton order={o} />
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold whitespace-nowrap
                        ${o.status.includes("Hoãn") ? "bg-orange-100 text-orange-700" : o.status.includes("Hoàn") ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}
                      `}>
                        {o.status.includes("Đang giao") && <AlertTriangle className="w-3 h-3" />}
                        {o.status}
                      </span>
                    </TableCell>

                    <TableCell className="text-center">
                      <span className={`inline-flex justify-center items-center w-7 h-7 rounded text-[13px] font-bold shadow-sm
                        ${o.delayCount >= 3 ? "bg-red-100 text-red-700" : o.delayCount === 2 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}
                      `}>
                        {o.delayCount}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="text-[12px] text-slate-700 whitespace-nowrap">
                        {o.createdTime ? format(new Date(o.createdTime), "dd/MM/yyyy", { locale: vi }) : "-"}
                        <div className="text-[10px] text-slate-400 mt-0.5">{o.daysAge} ngày trước</div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {o.uniqueReasons.map((r, i) => (
                          <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded-md border border-slate-200 font-medium leading-relaxed">
                            {r}
                          </span>
                        ))}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-[11px] text-slate-600 max-w-[220px] space-y-1.5 relative pl-3 border-l-2 border-slate-200">
                        {o.delays.length > 0 ? o.delays.map((d, i) => (
                          <div key={i} className="relative">
                            <div className="absolute -left-[17px] top-1.5 w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                            <span className="font-semibold text-slate-700">{d.time} {d.date}:</span> {d.reason}
                          </div>
                        )) : <span className="italic text-slate-400">Không có cấu trúc delay note hợp lệ.</span>}
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase
                        ${isHigh ? "bg-red-100 text-red-700" : o.risk === "medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}
                      `}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isHigh ? "bg-red-500" : o.risk === "medium" ? "bg-amber-500" : "bg-emerald-500"}`}></span>
                        {isHigh ? "Cao" : o.risk === "medium" ? "Trung bình" : "Thấp"}
                      </span>
                    </TableCell>

                    <TableCell className="text-right font-bold text-slate-700 text-[13px] whitespace-nowrap">
                      {o.codAmount.toLocaleString("vi-VN")} đ
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
    </div>
  );
}
