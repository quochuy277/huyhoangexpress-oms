"use client";

import { memo, useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { AlertTriangle, CheckSquare, Flag, Info, Truck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProcessedDelayedOrder } from "@/lib/delay-analyzer";
import { AddClaimFromPageDialog } from "@/components/shared/AddClaimFromPageDialog";
import { AddTodoDialog } from "@/components/shared/AddTodoDialog";
import { ClaimBadge } from "@/components/shared/ClaimBadge";
import { InlineStaffNote } from "@/components/shared/InlineStaffNote";
import { OrderDetailDialog } from "@/components/shared/OrderDetailDialog";
import { TrackingPopup } from "@/components/tracking/TrackingPopup";
import { CopyOrderButton } from "@/components/delayed/CopyOrderButton";

type SortableDelayedKey =
  | "requestCode"
  | "shopName"
  | "status"
  | "delayCount"
  | "createdTime"
  | "riskScore"
  | "codAmount";

function DelayedOrderTableInner({
  data,
  userRole,
  sortKey,
  sortDir,
  onSortChange,
  page,
  pageSize,
}: {
  data: ProcessedDelayedOrder[];
  userRole: string;
  sortKey: SortableDelayedKey;
  sortDir: "asc" | "desc";
  onSortChange: (key: SortableDelayedKey) => void;
  page: number;
  pageSize: number;
}) {
  const [todoOrder, setTodoOrder] = useState<ProcessedDelayedOrder | null>(null);
  const [claimDelayedOrder, setClaimDelayedOrder] = useState<ProcessedDelayedOrder | null>(null);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [detailRequestCode, setDetailRequestCode] = useState<string | null>(null);

  const riskToPriority = (risk: string): "LOW" | "MEDIUM" | "HIGH" | "URGENT" => {
    if (risk === "high") return "URGENT";
    if (risk === "medium") return "HIGH";
    return "MEDIUM";
  };

  const riskLabel = (risk: string) => {
    if (risk === "high") return "Cao";
    if (risk === "medium") return "Trung binh";
    return "Thap";
  };

  const HeaderCell = ({
    label,
    sortName,
    width,
  }: {
    label: string;
    sortName: SortableDelayedKey;
    width?: string;
  }) => (
    <TableHead
      className="cursor-pointer whitespace-nowrap px-2 text-[11px] font-medium uppercase text-slate-500 transition-colors hover:bg-slate-100"
      style={width ? { width, minWidth: width } : undefined}
      onClick={() => onSortChange(sortName)}
    >
      {label} {sortKey === sortName && (sortDir === "asc" ? "↑" : "↓")}
    </TableHead>
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden overflow-auto md:block">
        <Table className="table-fixed">
          <TableHeader className="sticky top-0 z-10 bg-slate-50 shadow-sm">
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-1 text-center text-[11px] font-medium uppercase text-slate-500" style={{ width: "42px" }}>
                STT
              </TableHead>
              <HeaderCell label="Ma Yeu Cau" sortName="requestCode" width="130px" />
              <HeaderCell label="Cua Hang" sortName="shopName" width="120px" />
              <TableHead className="px-2 text-[11px] font-medium uppercase text-slate-500" style={{ width: "210px" }}>
                Thong Tin Don
              </TableHead>
              <HeaderCell label="Trang Thai" sortName="status" width="110px" />
              <HeaderCell label="Hoan" sortName="delayCount" width="58px" />
              <HeaderCell label="Ngay Tao" sortName="createdTime" width="90px" />
              <TableHead className="px-2 text-[11px] font-medium uppercase text-slate-500" style={{ width: "150px" }}>
                Ly Do
              </TableHead>
              <HeaderCell label="Nguy Co" sortName="riskScore" width="82px" />
              <HeaderCell label="Thu Ho" sortName="codAmount" width="95px" />
              <TableHead className="px-1 text-center text-[11px] font-medium uppercase text-slate-500" style={{ width: "120px" }}>
                Thao Tac
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-48 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center p-6">
                    <Info className="mb-2 h-8 w-8 text-slate-300" />
                    <p className="font-medium text-slate-700">Khong tim thay don hang delayed</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((order, index) => {
                const isHigh = order.risk === "high";
                const borderClass = isHigh
                  ? "border-l-[3px] border-l-red-500"
                  : order.risk === "medium"
                    ? "border-l-[3px] border-l-amber-500"
                    : "border-l-[3px] border-l-emerald-500";

                return (
                  <TableRow key={order.requestCode} className={`border-b border-slate-100 hover:bg-slate-50/50 ${borderClass}`}>
                    <TableCell className="px-1 text-center text-[12px] font-medium text-slate-500">
                      {(page - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell className="px-2 text-[11px] font-bold text-slate-800">
                      <div className="flex flex-col gap-1">
                        {order.claimOrder && <ClaimBadge issueType={order.claimOrder.issueType} />}
                        <button
                          type="button"
                          onClick={() => setDetailRequestCode(order.requestCode)}
                          className="text-left font-mono hover:text-blue-600 hover:underline"
                        >
                          {order.requestCode}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="truncate px-2 text-[12px] text-slate-700" title={order.shopName}>
                      {order.shopName}
                    </TableCell>
                    <TableCell className="px-2">
                      <div className="space-y-1 text-[11px] text-slate-500">
                        <div className="truncate" title={order.carrierOrderCode}>
                          Ma: <span className="font-medium text-slate-800">{order.carrierOrderCode || "-"}</span>
                        </div>
                        <div className="truncate">
                          Ten: <span className="font-medium text-slate-800">{order.receiverName}</span> -{" "}
                          <span className="text-blue-600">{order.receiverPhone}</span>
                        </div>
                        <div className="truncate" title={order.fullAddress}>
                          DC: {order.fullAddress}
                        </div>
                        <CopyOrderButton order={order} />
                      </div>
                    </TableCell>
                    <TableCell className="px-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold ${
                          order.status.toLowerCase().includes("hoan")
                            ? "bg-orange-100 text-orange-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {order.status.toLowerCase().includes("dang giao") && (
                          <AlertTriangle className="h-2.5 w-2.5" />
                        )}
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-1 text-center">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded text-[12px] font-bold ${
                          order.delayCount >= 3
                            ? "bg-red-100 text-red-700"
                            : order.delayCount === 2
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {order.delayCount}
                      </span>
                    </TableCell>
                    <TableCell className="px-2">
                      <div className="text-[11px] text-slate-700">
                        {order.createdTime ? format(new Date(order.createdTime), "dd/MM/yy", { locale: vi }) : "-"}
                        <div className="mt-0.5 text-[10px] text-slate-400">{order.daysAge} ngay truoc</div>
                      </div>
                    </TableCell>
                    <TableCell className="px-2">
                      <div className="flex max-w-[145px] flex-wrap gap-1">
                        {order.uniqueReasons.slice(0, 2).map((reason) => (
                          <span
                            key={`${order.requestCode}-${reason}`}
                            className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="px-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          isHigh
                            ? "bg-red-100 text-red-700"
                            : order.risk === "medium"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isHigh ? "bg-red-500" : order.risk === "medium" ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                        />
                        {riskLabel(order.risk)}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 text-right text-[12px] font-bold text-slate-700">
                      {order.codAmount.toLocaleString("vi-VN")}d
                    </TableCell>
                    <TableCell className="px-1">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setTodoOrder(order)}
                            className="flex h-7 w-7 items-center justify-center rounded border border-transparent text-blue-500 transition-colors hover:border-blue-200 hover:bg-blue-50"
                            title="Them vao Cong Viec"
                          >
                            <CheckSquare className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setClaimDelayedOrder(order)}
                            className="flex h-7 w-7 items-center justify-center rounded border border-transparent text-orange-500 transition-colors hover:border-orange-200 hover:bg-orange-50"
                            title="Chuyen vao Don co van de"
                          >
                            <Flag className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTrackingCode(order.requestCode)}
                            className="flex h-7 w-7 items-center justify-center rounded border border-transparent text-emerald-500 transition-colors hover:border-emerald-200 hover:bg-emerald-50"
                            title="Tra hanh trinh"
                          >
                            <Truck className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <InlineStaffNote requestCode={order.requestCode} initialValue={order.staffNotes} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 p-3 md:hidden">
        {data.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
            Khong tim thay don hang delayed.
          </div>
        ) : (
          data.map((order) => (
            <article
              key={order.requestCode}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailRequestCode(order.requestCode)}
                      className="font-mono text-sm font-bold text-slate-800 hover:text-blue-600"
                    >
                      {order.requestCode}
                    </button>
                    {order.claimOrder && <ClaimBadge issueType={order.claimOrder.issueType} />}
                  </div>
                  <p className="text-xs font-medium text-slate-500">{order.shopName}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    order.risk === "high"
                      ? "bg-red-100 text-red-700"
                      : order.risk === "medium"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {riskLabel(order.risk)}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-600">
                <div>
                  <p className="text-slate-400">Nguoi nhan</p>
                  <p className="font-semibold text-slate-700">{order.receiverName}</p>
                  <p className="text-blue-600">{order.receiverPhone}</p>
                </div>
                <div>
                  <p className="text-slate-400">COD</p>
                  <p className="font-bold text-slate-800">{order.codAmount.toLocaleString("vi-VN")}d</p>
                  <p className="text-slate-500">{order.delayCount} lan hoan</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400">Dia chi</p>
                  <p className="line-clamp-2 text-slate-700">{order.fullAddress}</p>
                </div>
                <div className="col-span-2 flex flex-wrap gap-1">
                  {order.uniqueReasons.slice(0, 2).map((reason) => (
                    <span
                      key={`${order.requestCode}-${reason}-mobile`}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <CopyOrderButton order={order} />
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setDetailRequestCode(order.requestCode)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-700"
                >
                  Chi tiet
                </button>
                <button
                  type="button"
                  onClick={() => setTrackingCode(order.requestCode)}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700"
                >
                  Tracking
                </button>
                <button
                  type="button"
                  onClick={() => setTodoOrder(order)}
                  className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] font-semibold text-blue-700"
                >
                  Todo
                </button>
                <button
                  type="button"
                  onClick={() => setClaimDelayedOrder(order)}
                  className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-[12px] font-semibold text-orange-700"
                >
                  Claim
                </button>
              </div>

              <div className="mt-3">
                <InlineStaffNote requestCode={order.requestCode} initialValue={order.staffNotes} />
              </div>
            </article>
          ))
        )}
      </div>

      {todoOrder && (
        <AddTodoDialog
          open={Boolean(todoOrder)}
          onClose={() => setTodoOrder(null)}
          defaultTitle={`Xu ly don ${todoOrder.requestCode}`}
          defaultDescription={`Don: ${todoOrder.requestCode} - Shop: ${todoOrder.shopName} - KH: ${todoOrder.receiverName} - Hoan ${todoOrder.delayCount} lan - Nguy co: ${riskLabel(todoOrder.risk)}`}
          defaultPriority={riskToPriority(todoOrder.risk)}
          linkedOrderId={todoOrder.id}
          source="FROM_DELAYED"
          userRole={userRole}
        />
      )}

      <AddClaimFromPageDialog
        open={Boolean(claimDelayedOrder)}
        onClose={() => setClaimDelayedOrder(null)}
        order={
          claimDelayedOrder
            ? {
                id: claimDelayedOrder.id,
                requestCode: claimDelayedOrder.requestCode,
                carrierName: claimDelayedOrder.carrierName,
                shopName: claimDelayedOrder.shopName,
                codAmount: claimDelayedOrder.codAmount,
              }
            : undefined
        }
        source="FROM_DELAYED"
        userRole={userRole}
      />

      <TrackingPopup
        requestCode={trackingCode || ""}
        isOpen={Boolean(trackingCode)}
        onClose={() => setTrackingCode(null)}
      />

      <OrderDetailDialog
        requestCode={detailRequestCode}
        open={Boolean(detailRequestCode)}
        onClose={() => setDetailRequestCode(null)}
        userRole={userRole}
      />
    </div>
  );
}

export const DelayedOrderTable = memo(DelayedOrderTableInner);
