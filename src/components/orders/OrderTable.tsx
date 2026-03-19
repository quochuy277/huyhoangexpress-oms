"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { formatVND, formatDate } from "@/lib/utils";
import { mapStatusToVietnamese, STATUS_COLORS } from "@/lib/status-mapper";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, Edit2, AlertTriangle, CheckSquare, X, Truck } from "lucide-react";
import { AddTodoDialog } from "@/components/shared/AddTodoDialog";
import { TrackingPopup } from "@/components/tracking/TrackingPopup";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AddClaimFromPageDialog } from "@/components/shared/AddClaimFromPageDialog";
import { ClaimBadge } from "@/components/shared/ClaimBadge";
import type { DeliveryStatus, Priority } from "@prisma/client";

interface OrderRow {
  id: string;
  requestCode: string;
  carrierOrderCode: string | null;
  shopName: string | null;
  deliveryStatus: DeliveryStatus;
  status: string;
  createdTime: string | null;
  codAmount: number;
  totalFee: number;
  customerWeight: number | null;
  partialOrderType: string | null;
  staffNotes: string | null;
  revenue: number; // Used for something? No, removed from display.
  receiverPhone: string | null;
  receiverName: string | null;
  claimOrder?: { issueType: string } | null;
}

interface ApiResponse {
  orders: OrderRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface OrderTableProps {
  userRole: string;
  selectedRows: string[];
  setSelectedRows: (rows: string[]) => void;
}

export function OrderTable({ userRole, selectedRows, setSelectedRows }: OrderTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [todoModalOrder, setTodoModalOrder] = useState<OrderRow | null>(null);
  const [claimOrder, setClaimOrder] = useState<OrderRow | null>(null);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const isAdminOrManager = userRole === "ADMIN" || userRole === "MANAGER";

  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const sortBy = searchParams.get("sortBy") || "createdTime";
  const sortOrder = searchParams.get("sortOrder") || "desc";

  const queryKey = ["orders", searchParams.toString()];
  const { data, isLoading: loading } = useQuery<ApiResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams(searchParams.toString());
      const res = await fetch(`/api/orders?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
  });

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
    router.push(`${pathname}?${params.toString()}`);
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!data?.orders) return;
    if (e.target.checked) {
      const allIds = data.orders.map((o) => o.requestCode);
      setSelectedRows(Array.from(new Set([...selectedRows, ...allIds])));
    } else {
      const pageIds = data.orders.map((o) => o.requestCode);
      setSelectedRows(selectedRows.filter((id) => !pageIds.includes(id)));
    }
  };

  const handleSelectRow = (requestCode: string) => {
    if (selectedRows.includes(requestCode)) {
      setSelectedRows(selectedRows.filter((id) => id !== requestCode));
    } else {
      setSelectedRows([...selectedRows, requestCode]);
    }
  };

  const currentOrderCodes = data?.orders.map((o) => o.requestCode) || [];
  const allSelected = currentOrderCodes.length > 0 && currentOrderCodes.every((id) => selectedRows.includes(id));
  const someSelected = currentOrderCodes.some((id) => selectedRows.includes(id));

  const columns = [
    { key: "requestCode", label: "Mã Yêu Cầu", sortable: true, width: "w-[160px]" },
    { key: "carrierOrderCode", label: "Mã Đơn Đối Tác", sortable: true, width: "w-[140px]" },
    { key: "shopName", label: "Tên Cửa Hàng", sortable: true, width: "w-[180px]" },
    { key: "receiverPhone", label: "SĐT", sortable: true, width: "w-[120px]" },
    { key: "deliveryStatus", label: "Trạng Thái", sortable: true, width: "w-[160px]" },
    { key: "createdTime", label: "Thời Gian Tạo", sortable: true, width: "w-[150px]" },
    { key: "codAmount", label: "Thu Hộ", sortable: true, width: "w-[120px]", right: true },
    { key: "totalFee", label: "Tổng Phí", sortable: true, width: "w-[120px]", right: true },
    { key: "customerWeight", label: "Khối Lượng KH", sortable: true, width: "w-[100px]", right: true },
    { key: "partialOrderType", label: "Đơn Hàng Một Phần", sortable: true, width: "w-[130px]" },
    { key: "staffNotes", label: "Ghi Chú", sortable: false, width: "w-[180px]" },
    { key: "actions", label: "Thao Tác", sortable: false, width: "w-[130px]" },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {isAdminOrManager && (
                <th className="px-3 py-2.5 w-[50px] text-center">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    checked={allSelected}
                    ref={input => {
                      if (input) input.indeterminate = someSelected && !allSelected;
                    }}
                    onChange={handleSelectAll}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider ${col.width} ${
                    col.sortable ? "cursor-pointer hover:text-slate-700 select-none" : ""
                  } ${col.right ? "text-right" : "text-left"}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className={`flex items-center gap-1 ${col.right ? "justify-end" : ""}`}>
                    {col.label}
                    {col.sortable && (
                      <ArrowUpDown
                        className={`w-3 h-3 ${
                          sortBy === col.key ? "text-blue-500" : "text-slate-300"
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
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {isAdminOrManager && <td className="px-3"></td>}
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-3">
                      <div className="h-4 bg-slate-100 rounded w-3/4" />
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
              data?.orders.map((order) => (
                <tr
                  key={order.id}
                  className={`group transition-colors ${
                    selectedRows.includes(order.requestCode) ? "bg-blue-50/50" : "hover:bg-slate-50"
                  }`}
                >
                  {isAdminOrManager && (
                    <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={selectedRows.includes(order.requestCode)}
                        onChange={() => handleSelectRow(order.requestCode)}
                      />
                    </td>
                  )}
                  {/* Mã Yêu Cầu */}
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      {order.claimOrder && <ClaimBadge issueType={order.claimOrder.issueType} />}
                      <button
                        onClick={() => router.push(`/orders/${order.requestCode}?from=${encodeURIComponent(`${pathname}?${searchParams.toString()}`)}`)}
                        className="font-mono text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                      >
                        {order.requestCode}
                      </button>
                    </div>
                  </td>
                  {/* Mã Đơn Đối Tác */}
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => router.push(`/orders/${order.requestCode}?from=${encodeURIComponent(`${pathname}?${searchParams.toString()}`)}`)}
                      className="block w-full text-slate-700 truncate max-w-[140px] font-mono text-xs hover:text-blue-600 text-left"
                    >
                      {order.carrierOrderCode || "—"}
                    </button>
                  </td>
                  {/* Tên Cửa Hàng */}
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => router.push(`/orders/${order.requestCode}?from=${encodeURIComponent(`${pathname}?${searchParams.toString()}`)}`)}
                      className="block w-full text-slate-700 truncate max-w-[180px] text-left"
                    >
                      {order.shopName || "—"}
                    </button>
                  </td>
                  {/* SĐT */}
                  <td className="px-3 py-2.5">
                    {order.receiverPhone ? (
                      <a href={`tel:${order.receiverPhone}`} className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-xs">
                        {order.receiverPhone}
                      </a>
                    ) : (
                      <span className="text-slate-400 font-mono text-xs">—</span>
                    )}
                  </td>
                  {/* Trạng Thái */}
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                        STATUS_COLORS[order.deliveryStatus] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {mapStatusToVietnamese(order.deliveryStatus)}
                    </span>
                  </td>
                  {/* Thời Gian Tạo */}
                  <td className="px-3 py-2.5 text-slate-500 text-xs">
                    {formatDate(order.createdTime)}
                  </td>
                  {/* Thu Hộ */}
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-700">
                    {formatVND(order.codAmount)}
                  </td>
                  {/* Tổng Phí */}
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-700">
                    {formatVND(order.totalFee)}
                  </td>
                  {/* Khối Lượng KH */}
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-700">
                    {order.customerWeight ? `${order.customerWeight}g` : "—"}
                  </td>
                  {/* Đơn Hàng Một Phần */}
                  <td className="px-3 py-2.5 text-slate-700 text-xs">
                    {order.partialOrderType || "—"}
                  </td>
                  {/* Ghi Chú (Editable) */}
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <NoteCell
                      requestCode={order.requestCode}
                      initialNote={order.staffNotes}
                    />
                  </td>
                  {/* Thao Tác */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setClaimOrder(order);
                        }}
                        className="p-1.5 text-orange-500 hover:bg-orange-50 hover:text-orange-600 border border-transparent hover:border-orange-200 transition-colors rounded"
                        title="Chuyển vào Đơn có vấn đề"
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTodoModalOrder(order);
                        }}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 hover:text-blue-600 border border-transparent hover:border-blue-200 transition-colors rounded"
                        title="Thêm vào Công Việc"
                      >
                        <CheckSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTrackingCode(order.requestCode);
                        }}
                        className="p-1.5 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 border border-transparent hover:border-emerald-200 transition-colors rounded"
                        title="Tra hành trình"
                      >
                        <Truck className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-t border-slate-200 bg-slate-50 mt-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Hiển thị</span>
              <select
                className="border border-slate-300 rounded px-1 min-w-[50px] bg-white h-7 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={data.pageSize}
                onChange={(e) => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("pageSize", e.target.value);
                  params.set("page", "1");
                  router.push(`${pathname}?${params.toString()}`);
                }}
              >
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span>đơn/trang</span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block pl-4 border-l border-slate-300">
              {(data.page - 1) * data.pageSize + 1}–
              {Math.min(data.page * data.pageSize, data.total)} / {data.total.toLocaleString("vi-VN")} đơn
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(1)}
              disabled={data.page <= 1}
              className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => goToPage(data.page - 1)}
              disabled={data.page <= 1}
              className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-xs font-medium text-slate-600">
              {data.page} / {data.totalPages}
            </span>
            <button
              onClick={() => goToPage(data.page + 1)}
              disabled={data.page >= data.totalPages}
              className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => goToPage(data.totalPages)}
              disabled={data.page >= data.totalPages}
              className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Todo Dialog */}
      {todoModalOrder && (
        <AddTodoDialog
          open={!!todoModalOrder}
          onClose={() => setTodoModalOrder(null)}
          defaultTitle={`Xử lý đơn ${todoModalOrder.requestCode}`}
          defaultDescription={`Đơn hàng: ${todoModalOrder.requestCode} - ${todoModalOrder.shopName || "Không rõ shop"} - ${todoModalOrder.receiverName || "Không rõ KH"}`}
          defaultPriority="MEDIUM"
          linkedOrderId={todoModalOrder.id}
          source="FROM_ORDERS"
        />
      )}

      {/* Claim Dialog */}
      <AddClaimFromPageDialog
        open={!!claimOrder}
        onClose={() => setClaimOrder(null)}
        onSuccess={() => refetchOrders()}
        order={claimOrder || undefined}
        source="FROM_ORDERS"
      />

      {/* Tracking Popup */}
      <TrackingPopup
        requestCode={trackingCode || ""}
        isOpen={!!trackingCode}
        onClose={() => setTrackingCode(null)}
      />
    </div>
  );
}

function NoteCell({ requestCode, initialNote }: { requestCode: string; initialNote: string | null }) {
  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState(initialNote || "");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const saveNote = async () => {
    if (note === (initialNote || "")) {
      setIsEditing(false);
      return;
    }
    
    setIsSaving(true);
    try {
      const res = await fetch("/api/orders/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestCode, staffNotes: note }),
      });
      if (!res.ok) throw new Error("Failed to save");
    } catch (err) {
      alert("Lỗi khi lưu ghi chú");
      setNote(initialNote || ""); // Revert on error
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="relative">
        <textarea
          ref={inputRef}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={saveNote}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              inputRef.current?.blur(); // Triggers onBlur
            } else if (e.key === "Escape") {
              setNote(initialNote || "");
              setIsEditing(false);
            }
          }}
          className="w-full text-xs p-1.5 border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm resize-none"
          rows={2}
          disabled={isSaving}
          placeholder="Thêm ghi chú..."
        />
      </div>
    );
  }

  const displayNote = note.length > 50 ? note.slice(0, 50) + "..." : note;

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="group/note flex items-start justify-between min-h-[1.5rem] cursor-text rounded p-1 -m-1 hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm"
      title={note ? "Sửa ghi chú" : "Thêm ghi chú"}
    >
      {note ? (
        <span className="text-xs text-slate-700 break-words whitespace-pre-wrap flex-1">{displayNote}</span>
      ) : (
        <span className="text-xs text-slate-400 italic flex-1">Thêm ghi chú...</span>
      )}
      <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover/note:opacity-100 transition-opacity ml-1 shrink-0 mt-0.5" />
    </div>
  );
}
