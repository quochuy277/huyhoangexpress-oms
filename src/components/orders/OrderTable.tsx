"use client";

import type { ChangeEvent } from "react";
import { memo, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpDown,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  StickyNote,
  Truck,
} from "lucide-react";

import { OrderStaffNoteDialog } from "@/components/orders/OrderStaffNoteDialog";
import { ClaimBadge } from "@/components/shared/ClaimBadge";
import { AddClaimFromPageDialog } from "@/components/shared/AddClaimFromPageDialog";
import { AddTodoDialog } from "@/components/shared/AddTodoDialog";
import { OrderDetailDialog } from "@/components/shared/OrderDetailDialog";
import { TrackingPopup } from "@/components/tracking/TrackingPopup";
import { mapStatusToVietnamese, STATUS_COLORS } from "@/lib/status-mapper";
import { formatDate, formatVND } from "@/lib/utils";
import type { OrderRow, OrdersApiResponse } from "@/types/orders";

interface OrderTableProps {
  userRole: string;
  canEditStaffNotes: boolean;
  selectedRows: string[];
  setSelectedRows: (rows: string[]) => void;
  initialOrdersData: OrdersApiResponse | null;
}

interface TableColumn {
  key: string;
  label: string;
  sortable: boolean;
  width: string;
  right?: boolean;
}

const EMPTY_VALUE = "—";

const columns: TableColumn[] = [
  { key: "requestCode", label: "Mã yêu cầu", sortable: true, width: "w-[160px]" },
  { key: "carrierOrderCode", label: "Mã đơn đối tác", sortable: false, width: "w-[160px]" },
  { key: "shopName", label: "Tên cửa hàng", sortable: true, width: "w-[180px]" },
  { key: "recipientInfo", label: "Thông tin người nhận", sortable: false, width: "w-[220px]" },
  { key: "deliveryStatus", label: "Trạng thái", sortable: true, width: "w-[160px]" },
  { key: "createdTime", label: "Thời gian tạo", sortable: true, width: "w-[150px]" },
  { key: "codAmount", label: "Thu hộ", sortable: true, width: "w-[130px]", right: true },
  { key: "totalFee", label: "Tổng phí", sortable: true, width: "w-[120px]", right: true },
  { key: "customerWeight", label: "Khối lượng", sortable: true, width: "w-[110px]", right: true },
  { key: "actions", label: "Thao tác", sortable: false, width: "w-[190px]" },
];

function hasStaffNote(staffNotes: string | null | undefined) {
  return (staffNotes?.trim().length ?? 0) > 0;
}

function OrderTableInner({
  userRole,
  canEditStaffNotes,
  selectedRows,
  setSelectedRows,
  initialOrdersData,
}: OrderTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [todoModalOrder, setTodoModalOrder] = useState<OrderRow | null>(null);
  const [claimOrder, setClaimOrder] = useState<OrderRow | null>(null);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [detailRequestCode, setDetailRequestCode] = useState<string | null>(null);
  const [noteDialogOrder, setNoteDialogOrder] = useState<OrderRow | null>(null);
  const usedInitialDataRef = useRef(false);
  const queryClient = useQueryClient();

  const isAdminOrManager = userRole === "ADMIN" || userRole === "MANAGER";
  const sortBy = searchParams.get("sortBy") || "createdTime";
  const sortOrder = searchParams.get("sortOrder") || "desc";
  const currentQueryString = searchParams.toString();
  const initialData = !usedInitialDataRef.current ? initialOrdersData ?? undefined : undefined;
  const queryKey = ["orders", currentQueryString];

  const { data, isLoading: loading, isFetching } = useQuery<OrdersApiResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams(currentQueryString);
      const res = await fetch(`/api/orders?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    initialData,
    initialDataUpdatedAt: initialData ? Date.now() : undefined,
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    usedInitialDataRef.current = true;
  }, []);

  const refetchOrders = () => queryClient.invalidateQueries({ queryKey: ["orders"] });

  const handleSort = (column: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (sortBy === column) {
      params.set("sortOrder", sortOrder === "asc" ? "desc" : "asc");
    } else {
      params.set("sortBy", column);
      params.set("sortOrder", "desc");
    }
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleSelectAll = (event: ChangeEvent<HTMLInputElement>) => {
    if (!data?.orders) return;
    if (event.target.checked) {
      const allIds = data.orders.map((order) => order.requestCode);
      setSelectedRows(Array.from(new Set([...selectedRows, ...allIds])));
      return;
    }

    const pageIds = data.orders.map((order) => order.requestCode);
    setSelectedRows(selectedRows.filter((id) => !pageIds.includes(id)));
  };

  const handleSelectRow = (requestCode: string) => {
    if (selectedRows.includes(requestCode)) {
      setSelectedRows(selectedRows.filter((id) => id !== requestCode));
      return;
    }

    setSelectedRows([...selectedRows, requestCode]);
  };

  const handleNoteSaved = (staffNotes: string | null) => {
    if (!noteDialogOrder) return;

    const requestCode = noteDialogOrder.requestCode;
    queryClient.setQueryData<OrdersApiResponse | undefined>(queryKey, (current) => {
      if (!current) return current;

      return {
        ...current,
        orders: current.orders.map((order) =>
          order.requestCode === requestCode ? { ...order, staffNotes } : order,
        ),
      };
    });
    setNoteDialogOrder((current) =>
      current ? { ...current, staffNotes } : current,
    );
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  const currentOrderCodes = data?.orders.map((order) => order.requestCode) || [];
  const allSelected =
    currentOrderCodes.length > 0 &&
    currentOrderCodes.every((id) => selectedRows.includes(id));
  const someSelected = currentOrderCodes.some((id) => selectedRows.includes(id));

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {isFetching && !loading && (
        <div className="absolute right-3 top-3 z-10 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">
          Đang cập nhật...
        </div>
      )}

      <div className="block divide-y divide-slate-100 sm:hidden">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="animate-pulse p-4">
              <div className="mb-2 h-4 w-3/4 rounded bg-slate-100" />
              <div className="h-3 w-1/2 rounded bg-slate-100" />
            </div>
          ))
        ) : data?.orders.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            Không tìm thấy đơn hàng nào
          </div>
        ) : (
          data?.orders.map((order) => {
            const noteExists = hasStaffNote(order.staffNotes);

            return (
              <div
                key={order.id}
                className={`px-4 py-3 ${
                  selectedRows.includes(order.requestCode) ? "bg-blue-50/50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {isAdminOrManager && (
                    <input
                      type="checkbox"
                      className="mt-1 h-[18px] w-[18px] shrink-0 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedRows.includes(order.requestCode)}
                      onChange={() => handleSelectRow(order.requestCode)}
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => setDetailRequestCode(order.requestCode)}
                        className="truncate text-left font-mono text-xs font-semibold text-blue-600 hover:underline"
                      >
                        {order.requestCode}
                      </button>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          STATUS_COLORS[order.deliveryStatus] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {mapStatusToVietnamese(order.deliveryStatus)}
                      </span>
                    </div>

                    {order.claimOrder && (
                      <div className="mt-1">
                        <ClaimBadge issueType={order.claimOrder.issueType} />
                      </div>
                    )}

                    <div className="mt-2 space-y-0.5 text-xs">
                      <div className="font-medium text-slate-700">
                        {order.receiverName?.trim() || EMPTY_VALUE}
                      </div>
                      <div className="text-slate-500">
                        {order.receiverPhone?.trim() || EMPTY_VALUE}
                      </div>
                      <div className="text-slate-400">
                        {order.receiverProvince?.trim() || EMPTY_VALUE}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-3 text-xs">
                      <span className="truncate text-slate-500">
                        {order.shopName?.trim() || EMPTY_VALUE}
                      </span>
                      <span className="max-w-[120px] truncate font-mono text-slate-400">
                        {order.carrierOrderCode?.trim() || EMPTY_VALUE}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-semibold text-slate-700">
                          {formatVND(order.codAmount)}
                        </span>
                        <span className="text-slate-400">
                          Phí: {formatVND(order.totalFee)}
                        </span>
                      </div>

                      <div className="ml-auto flex shrink-0 items-center gap-1">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setNoteDialogOrder(order);
                          }}
                          className={`rounded border p-2 transition-colors ${
                            noteExists
                              ? "border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100"
                              : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                          }`}
                          title={noteExists ? "Ghi chú nội bộ" : "Thêm ghi chú nội bộ"}
                          aria-label={noteExists ? "Ghi chú nội bộ" : "Thêm ghi chú nội bộ"}
                        >
                          <StickyNote className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setClaimOrder(order);
                          }}
                          className="rounded border border-transparent p-2 text-orange-500 transition-colors hover:border-orange-200 hover:bg-orange-50"
                          title="Đơn có vấn đề"
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setTodoModalOrder(order);
                          }}
                          className="rounded border border-transparent p-2 text-blue-500 transition-colors hover:border-blue-200 hover:bg-blue-50"
                          title="Công việc"
                        >
                          <CheckSquare className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setTrackingCode(order.requestCode);
                          }}
                          className="rounded border border-transparent p-2 text-emerald-500 transition-colors hover:border-emerald-200 hover:bg-emerald-50"
                          title="Hành trình"
                        >
                          <Truck className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-1 text-[11px] text-slate-400">
                      {order.createdTime ? formatDate(order.createdTime) : EMPTY_VALUE}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-[1320px] w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {isAdminOrManager && (
                <th className="w-[50px] px-3 py-2.5 text-center">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    checked={allSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = someSelected && !allSelected;
                    }}
                    onChange={handleSelectAll}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                    column.width
                  } ${column.sortable ? "cursor-pointer select-none hover:text-slate-700" : ""} ${
                    column.right ? "text-right" : "text-left"
                  }`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div
                    className={`flex items-center gap-1 ${
                      column.right ? "justify-end" : ""
                    }`}
                  >
                    {column.label}
                    {column.sortable && (
                      <ArrowUpDown
                        className={`h-3 w-3 ${
                          sortBy === column.key ? "text-blue-500" : "text-slate-300"
                        }`}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 10 }).map((_, index) => (
                <tr key={index} className="animate-pulse">
                  {isAdminOrManager && <td className="px-3" />}
                  {columns.map((column) => (
                    <td key={column.key} className="px-3 py-3">
                      <div className="h-4 w-3/4 rounded bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data?.orders.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (isAdminOrManager ? 1 : 0)}
                  className="px-3 py-12 text-center text-sm text-slate-400"
                >
                  Không tìm thấy đơn hàng nào
                </td>
              </tr>
            ) : (
              data?.orders.map((order) => {
                const noteExists = hasStaffNote(order.staffNotes);

                return (
                  <tr
                    key={order.id}
                    className={`group transition-colors ${
                      selectedRows.includes(order.requestCode)
                        ? "bg-blue-50/50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    {isAdminOrManager && (
                      <td
                        className="px-3 py-2.5 text-center"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedRows.includes(order.requestCode)}
                          onChange={() => handleSelectRow(order.requestCode)}
                        />
                      </td>
                    )}

                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-0.5">
                        {order.claimOrder && (
                          <ClaimBadge issueType={order.claimOrder.issueType} />
                        )}
                        <button
                          onClick={() => setDetailRequestCode(order.requestCode)}
                          className="text-left font-mono text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {order.requestCode}
                        </button>
                      </div>
                    </td>

                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => setDetailRequestCode(order.requestCode)}
                        className="block max-w-[150px] truncate text-left font-mono text-xs text-slate-700 hover:text-blue-600"
                      >
                        {order.carrierOrderCode?.trim() || EMPTY_VALUE}
                      </button>
                    </td>

                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => setDetailRequestCode(order.requestCode)}
                        className="block max-w-[180px] truncate text-left text-slate-700"
                      >
                        {order.shopName?.trim() || EMPTY_VALUE}
                      </button>
                    </td>

                    <td className="px-3 py-2.5">
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium text-slate-800">
                          {order.receiverName?.trim() || EMPTY_VALUE}
                        </div>
                        <div className="font-mono text-xs text-slate-500">
                          {order.receiverPhone?.trim() ? (
                            <a
                              href={`tel:${order.receiverPhone.trim()}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {order.receiverPhone.trim()}
                            </a>
                          ) : (
                            EMPTY_VALUE
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          {order.receiverProvince?.trim() || EMPTY_VALUE}
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[order.deliveryStatus] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {mapStatusToVietnamese(order.deliveryStatus)}
                      </span>
                    </td>

                    <td className="px-3 py-2.5 text-xs text-slate-500">
                      {order.createdTime ? formatDate(order.createdTime) : EMPTY_VALUE}
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-700">
                      {formatVND(order.codAmount)}
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-700">
                      {formatVND(order.totalFee)}
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-700">
                      {order.customerWeight ? `${order.customerWeight}g` : EMPTY_VALUE}
                    </td>

                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setNoteDialogOrder(order);
                          }}
                          className={`rounded border p-2 transition-colors ${
                            noteExists
                              ? "border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100"
                              : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                          }`}
                          title={noteExists ? "Ghi chú nội bộ" : "Thêm ghi chú nội bộ"}
                          aria-label={noteExists ? "Ghi chú nội bộ" : "Thêm ghi chú nội bộ"}
                        >
                          <StickyNote className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setClaimOrder(order);
                          }}
                          className="rounded border border-transparent p-2 text-orange-500 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                          title="Chuyển vào Đơn có vấn đề"
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setTodoModalOrder(order);
                          }}
                          className="rounded border border-transparent p-2 text-blue-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                          title="Thêm vào Công việc"
                        >
                          <CheckSquare className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setTrackingCode(order.requestCode);
                          }}
                          className="rounded border border-transparent p-2 text-emerald-500 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600"
                          title="Tra hành trình"
                        >
                          <Truck className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Hiển thị</span>
              <select
                className="h-9 min-w-[50px] rounded border border-slate-300 bg-white px-1 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={data.pageSize}
                onChange={(event) => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("pageSize", event.target.value);
                  params.set("page", "1");
                  router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                }}
              >
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span>đơn/trang</span>
            </div>
            <p className="hidden border-l border-slate-300 pl-4 text-xs text-slate-500 sm:block">
              {(data.page - 1) * data.pageSize + 1}–
              {Math.min(data.page * data.pageSize, data.total)} /{" "}
              {data.total.toLocaleString("vi-VN")} đơn
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(1)}
              disabled={data.page <= 1}
              className="rounded p-2 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => goToPage(data.page - 1)}
              disabled={data.page <= 1}
              className="rounded p-2 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-1 text-xs font-medium text-slate-600">
              {data.page} / {data.totalPages}
            </span>
            <button
              onClick={() => goToPage(data.page + 1)}
              disabled={data.page >= data.totalPages}
              className="rounded p-2 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => goToPage(data.totalPages)}
              disabled={data.page >= data.totalPages}
              className="rounded p-2 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {todoModalOrder && (
        <AddTodoDialog
          open={!!todoModalOrder}
          onClose={() => setTodoModalOrder(null)}
          defaultTitle={`Xử lý đơn ${todoModalOrder.requestCode}`}
          defaultDescription={`Đơn hàng: ${todoModalOrder.requestCode} - ${
            todoModalOrder.shopName || "Không rõ shop"
          } - ${todoModalOrder.receiverName || "Không rõ KH"}`}
          defaultPriority="MEDIUM"
          linkedOrderId={todoModalOrder.id}
          source="FROM_ORDERS"
          userRole={userRole}
        />
      )}

      <AddClaimFromPageDialog
        open={!!claimOrder}
        onClose={() => setClaimOrder(null)}
        onSuccess={() => refetchOrders()}
        order={claimOrder || undefined}
        source="FROM_ORDERS"
      />

      <TrackingPopup
        requestCode={trackingCode || ""}
        isOpen={!!trackingCode}
        onClose={() => setTrackingCode(null)}
      />

      <OrderDetailDialog
        requestCode={detailRequestCode}
        open={!!detailRequestCode}
        onClose={() => setDetailRequestCode(null)}
        userRole={userRole}
      />

      <OrderStaffNoteDialog
        open={!!noteDialogOrder}
        onOpenChange={(open) => {
          if (!open) {
            setNoteDialogOrder(null);
          }
        }}
        order={noteDialogOrder}
        canEditStaffNotes={canEditStaffNotes}
        onSaved={handleNoteSaved}
      />
    </div>
  );
}

export const OrderTable = memo(OrderTableInner);
