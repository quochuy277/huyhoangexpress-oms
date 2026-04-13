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
import { OrderDetailDialog } from "@/components/shared/OrderDetailDialog";
import { ClaimBadge } from "@/components/shared/ClaimBadge";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ReturnOrder } from "@/types/returns";
import { format } from "date-fns";

function getWarehouseDate(o: ReturnOrder): Date | null {
  if (o.partialOrderType === "Đơn một phần" && o.warehouseArrivalDate) {
    return new Date(o.warehouseArrivalDate);
  }
  return o.lastUpdated ? new Date(o.lastUpdated) : null;
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return format(d, "dd/MM/yyyy HH:mm");
}

interface TrackingCheckboxProps {
  checked: boolean;
  byName: string | null;
  byAt: string | null;
  onToggle: () => void;
  labelOn: string;
  labelOff: string;
}

function TrackingCheckbox({ checked, byName, byAt, onToggle, labelOn, labelOff }: TrackingCheckboxProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="flex items-center gap-1 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="w-3.5 h-3.5 cursor-pointer accent-blue-600"
        />
        <span className={`text-[10px] font-medium ${checked ? "text-emerald-700" : "text-slate-500"}`}>
          {checked ? labelOn : labelOff}
        </span>
      </label>
      {checked && byName && (
        <span className="text-[9.5px] text-slate-400 leading-tight pl-4">
          {byName}{byAt ? ` – ${fmtDateTime(byAt)}` : ""}
        </span>
      )}
    </div>
  );
}

interface Props {
  data: ReturnOrder[];
  pageSize: number;
  onConfirmAskedToggle: (requestCode: string, value: boolean) => Promise<void>;
  onCustomerConfirmedToggle: (requestCode: string, value: boolean) => Promise<void>;
}

export function WaitingReturnTab({ data, pageSize, onConfirmAskedToggle, onCustomerConfirmedToggle }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get('warehousePage')) || 1;
  const setCurrentPage = (page: number | ((prev: number) => number)) => {
    const resolved = typeof page === 'function' ? page(currentPage) : page;
    const params = new URLSearchParams(searchParams.toString());
    if (resolved <= 1) {
      params.delete('warehousePage');
    } else {
      params.set('warehousePage', String(resolved));
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  const [sortKey, setSortKey] = useState<string>("warehouseDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [todoOrder, setTodoOrder] = useState<ReturnOrder | null>(null);
  const [claimReturnOrder, setClaimReturnOrder] = useState<ReturnOrder | null>(null);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [detailRequestCode, setDetailRequestCode] = useState<string | null>(null);

  // Filter params are handled server-side (search/shopName/hasNotes/confirmAsked).
  // Sort
  const filtered = [...data].sort((a, b) => {
    let va: any, vb: any;
    if (sortKey === "warehouseDate") {
      va = getWarehouseDate(a)?.getTime() ?? 0;
      vb = getWarehouseDate(b)?.getTime() ?? 0;
    } else {
      va = (a as any)[sortKey] ?? "";
      vb = (b as any)[sortKey] ?? "";
    }
    if (typeof va === "string") { va = va.toLowerCase(); vb = (vb as string).toLowerCase(); }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const safePage = Math.max(1, currentPage);
  const pageData = filtered;
  const hasNextPage = pageData.length >= pageSize;

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

  const getStatusBadge = (o: ReturnOrder) => {
    const s = o.status || "";
    if (s.toLowerCase().includes("hoãn trả") || o.deliveryStatus === "RETURN_DELAYED") {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700 whitespace-nowrap">Hoãn trả hàng</span>;
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 whitespace-nowrap">Đã giao hàng</span>;
  };

  return (
    <>
      <div className="flex-1 overflow-auto custom-scrollbar">
        <Table className="table-fixed">
          <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[11px] font-medium uppercase text-slate-500 text-center px-1" style={{ width: "40px" }}>STT</TableHead>
              <SortHead label="Mã Yêu Cầu" k="requestCode" w="130px" />
              <SortHead label="Mã Đơn Đối Tác" k="carrierOrderCode" w="110px" />
              <SortHead label="Tên Cửa Hàng" k="shopName" w="130px" />
              <TableHead className="text-[11px] font-medium uppercase text-slate-500 px-2" style={{ width: "110px" }}>Trạng Thái</TableHead>
              <SortHead label="Ngày Về Kho" k="warehouseDate" w="90px" />
              <TableHead className="text-[11px] font-medium uppercase text-slate-500 text-center px-1" style={{ width: "100px" }}>Đã Hỏi KH</TableHead>
              <TableHead className="text-[11px] font-medium uppercase text-slate-500 text-center px-1" style={{ width: "100px" }}>KH Xác Nhận</TableHead>
              <TableHead className="text-[11px] font-medium uppercase text-slate-500 px-2" style={{ width: "130px" }}>Ghi Chú</TableHead>
              <TableHead className="text-[11px] font-medium uppercase text-slate-500 text-center px-1" style={{ width: "100px" }}>Thao Tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-48 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center p-6">
                    <Info className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="font-medium text-slate-700">Không tìm thấy đơn hàng</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pageData.map((o, idx) => {
                const whDate = getWarehouseDate(o);
                return (
                  <TableRow key={o.requestCode} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <TableCell className="text-center font-medium text-slate-500 text-[12px] px-1">
                      {(safePage - 1) * pageSize + idx + 1}
                    </TableCell>
                    <TableCell className="font-bold text-slate-800 text-[11px] px-2 truncate" title={o.requestCode}>
                      <div className="flex flex-col gap-0.5">
                        {o.claimOrder && <ClaimBadge issueType={o.claimOrder.issueType} />}
                        <button
                          onClick={() => setDetailRequestCode(o.requestCode)}
                          className="hover:text-blue-600 hover:underline font-mono cursor-pointer text-left"
                        >{o.requestCode}</button>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-700 text-[11px] px-2 truncate">{o.carrierOrderCode || "-"}</TableCell>
                    <TableCell className="text-slate-700 text-[12px] px-2 truncate" title={o.shopName || ""}>{o.shopName || "-"}</TableCell>
                    <TableCell className="px-2">{getStatusBadge(o)}</TableCell>
                    <TableCell className="text-[11px] text-slate-700 px-2 whitespace-nowrap">
                      {whDate ? format(whDate, "dd/MM/yyyy") : "-"}
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      <TrackingCheckbox
                        checked={o.customerConfirmAsked}
                        byName={o.confirmedAskedBy}
                        byAt={o.confirmedAskedAt}
                        onToggle={() => onConfirmAskedToggle(o.requestCode, !o.customerConfirmAsked)}
                        labelOn="Đã hỏi KH"
                        labelOff="Chưa hỏi"
                      />
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      <TrackingCheckbox
                        checked={o.customerConfirmed}
                        byName={o.customerConfirmedBy}
                        byAt={o.customerConfirmedAt}
                        onToggle={() => onCustomerConfirmedToggle(o.requestCode, !o.customerConfirmed)}
                        labelOn="KH đã XN"
                        labelOff="Chờ XN"
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
      {(safePage > 1 || hasNextPage) && (
        <div className="bg-slate-50 border-t border-slate-200 p-3 flex items-center justify-between shrink-0">
          <span className="text-[13px] text-slate-500 font-medium">
            Trang <b className="text-slate-700">{safePage}</b> <span className="opacity-50">|</span> {pageData.length} đơn
          </span>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
              className="px-3 py-1.5 flex items-center gap-1 border border-slate-200 rounded text-[13px] font-medium bg-white hover:bg-slate-100 disabled:opacity-50 shadow-sm transition-all">
              <ChevronLeft className="w-3.5 h-3.5" /> Trước
            </button>
            <button onClick={() => setCurrentPage((p) => p + 1)} disabled={!hasNextPage}
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
          defaultTitle={`Trả hàng cho khách ${todoOrder.requestCode}`}
          defaultDescription={`Đơn chờ trả: ${todoOrder.requestCode} - Shop: ${todoOrder.shopName} - Về kho ngày ${getWarehouseDate(todoOrder) ? format(getWarehouseDate(todoOrder)!, "dd/MM/yyyy") : "?"}`}
          defaultPriority="HIGH"
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

      {/* Order Detail Dialog */}
      <OrderDetailDialog
        requestCode={detailRequestCode}
        open={!!detailRequestCode}
        onClose={() => setDetailRequestCode(null)}
        userRole="ADMIN"
      />
    </>
  );
}
