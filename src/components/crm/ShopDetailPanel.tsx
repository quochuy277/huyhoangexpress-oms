"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import {
  X, Phone, MessageSquare, Mail, Handshake, Settings, FileText,
  Loader2, Edit, Save, XCircle, UserPlus
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend
} from "recharts";

interface ShopDetailPanelProps {
  shopName: string;
  userRole: string;
  userId: string;
  userName: string;
  canManageCRM?: boolean;
  canEditShopInfo?: boolean;
  onClose: () => void;
  onOpenCareLog: (shopName: string) => void;
}

const CONTACT_ICONS: Record<string, { icon: React.ReactNode; label: string }> = {
  PHONE_CALL: { icon: <Phone className="w-4 h-4" />, label: "📞" },
  MESSAGE: { icon: <MessageSquare className="w-4 h-4" />, label: "💬" },
  EMAIL: { icon: <Mail className="w-4 h-4" />, label: "📧" },
  IN_PERSON: { icon: <Handshake className="w-4 h-4" />, label: "🤝" },
  SYSTEM: { icon: <Settings className="w-4 h-4" />, label: "📋" },
  OTHER: { icon: <FileText className="w-4 h-4" />, label: "📝" },
};

const RESULT_BADGES: Record<string, { label: string; color: string }> = {
  RESOLVED: { label: "Đã giải quyết ✅", color: "text-green-600 bg-green-50" },
  IN_PROGRESS: { label: "Đang xử lý 🔄", color: "text-blue-600 bg-blue-50" },
  WAITING: { label: "Chờ phản hồi ⏳", color: "text-yellow-700 bg-yellow-50" },
  UNSATISFIED: { label: "KH không hài lòng ⚠️", color: "text-red-600 bg-red-50" },
  OTHER: { label: "Khác", color: "text-slate-600 bg-slate-50" },
};

const CLASS_BADGE: Record<string, { label: string; cls: string }> = {
  VIP: { label: "VIP", cls: "bg-purple-100 text-purple-700 border-purple-200" },
  NORMAL: { label: "Thường", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  NEW: { label: "Mới", cls: "bg-green-100 text-green-700 border-green-200" },
  WARNING: { label: "Cảnh báo", cls: "bg-orange-100 text-orange-700 border-orange-200" },
  INACTIVE: { label: "Ngừng", cls: "bg-red-100 text-red-700 border-red-200" },
};

// Vietnamese delivery status map (matching status-mapper.ts REVERSE_STATUS_MAP)
const DELIVERY_STATUS_VN: Record<string, string> = {
  PROCESSING: "Đang xử lý",
  IN_TRANSIT: "Đang chuyển kho giao",
  DELIVERING: "Đang giao hàng",
  DELIVERED: "Đã giao hàng",
  RECONCILED: "Đã đối soát giao hàng",
  DELIVERY_DELAYED: "Hoãn giao hàng",
  RETURN_CONFIRMED: "Xác nhận hoàn",
  RETURNING_FULL: "Đang chuyển kho trả toàn bộ",
  RETURN_DELAYED: "Hoãn trả hàng",
  RETURNED_FULL: "Đã trả hàng toàn bộ",
  RETURNED_PARTIAL: "Đã trả hàng một phần",
};

const DELIVERY_STATUS_COLORS: Record<string, string> = {
  PROCESSING: "text-gray-600 bg-gray-50",
  IN_TRANSIT: "text-blue-600 bg-blue-50",
  DELIVERING: "text-cyan-600 bg-cyan-50",
  DELIVERED: "text-green-600 bg-green-50",
  RECONCILED: "text-emerald-600 bg-emerald-50",
  DELIVERY_DELAYED: "text-red-600 bg-red-50",
  RETURN_CONFIRMED: "text-orange-600 bg-orange-50",
  RETURN_DELAYED: "text-amber-600 bg-amber-50",
  RETURNING_FULL: "text-amber-600 bg-amber-50",
  RETURNED_FULL: "text-purple-600 bg-purple-50",
  RETURNED_PARTIAL: "text-violet-600 bg-violet-50",
};

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

function formatDate(date: string | Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

interface EditableProfileState {
  contactPerson: string;
  phone: string;
  email: string;
  zalo: string;
  address: string;
  internalShopNote: string;
}

export function ShopDetailPanel({ shopName, userRole, userId, userName, canManageCRM, canEditShopInfo, onClose, onOpenCareLog }: ShopDetailPanelProps) {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["crm-shop-detail", shopName],
    queryFn: async () => {
      const res = await fetch(`/api/crm/shops/${encodeURIComponent(shopName)}`);
      if (!res.ok) throw new Error("Failed to fetch shop detail");
      return res.json();
    },
  });

  const detail = data?.data;

  // Editable shop info state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditableProfileState>({
    contactPerson: "", phone: "", email: "", zalo: "", address: "", internalShopNote: ""
  });

  // Permission-based editing
  const canAssign = canManageCRM ?? (userRole === "ADMIN");
  const canEditInfo = canEditShopInfo ?? (userRole === "ADMIN");
  const [showAssigneeEditor, setShowAssigneeEditor] = useState(false);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [assignSaving, setAssignSaving] = useState(false);

  useEffect(() => {
    if (detail?.profile) {
      setEditForm({
        contactPerson: detail.profile.contactPerson || "",
        phone: detail.profile.phone || "",
        email: detail.profile.email || "",
        zalo: detail.profile.zalo || "",
        address: detail.profile.address || "",
        internalShopNote: detail.profile.internalShopNote || "",
      });
    }
  }, [detail?.profile]);

  const handleSaveInfo = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/shops/${encodeURIComponent(shopName)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("Save failed");
      setIsEditing(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["crm-shops"] });
    } catch {
      alert("Lỗi khi lưu thông tin");
    } finally {
      setSaving(false);
    }
  };

  const handleLoadUsers = async () => {
    if (allUsers.length > 0) return;
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) return;
      const data = await res.json();
      const users = Array.isArray(data) ? data : (data.data || data.users || []);
      setAllUsers(
        users
          .filter((u: { isActive?: boolean }) => u.isActive !== false)
          .map((u: { id: string; name: string }) => ({ id: u.id, name: u.name }))
      );
    } catch { /* ignore */ }
  };

  const handleAddAssignee = async () => {
    if (!selectedAssignee) return;
    setAssignSaving(true);
    try {
      await fetch("/api/crm/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedAssignee, shopNames: [shopName] }),
      });
      setSelectedAssignee("");
      setShowAssigneeEditor(false);
      refetch();
    } catch {
      alert("Lỗi khi gán nhân viên");
    } finally {
      setAssignSaving(false);
    }
  };

  const updateField = (key: keyof EditableProfileState, value: string) =>
    setEditForm((prev) => ({ ...prev, [key]: value }));

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Panel — responsive width */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] md:w-[560px] lg:w-[640px] bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 truncate">{shopName}</h2>
            {detail?.profile?.classification && (
              <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium mt-1 inline-block",
                CLASS_BADGE[detail.profile.classification]?.cls || ""
              )}>
                {CLASS_BADGE[detail.profile.classification]?.label || detail.profile.classification}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-2 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-5 sm:space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : !detail ? (
            <p className="text-center text-slate-400 py-20">Không tìm thấy dữ liệu</p>
          ) : (
            <>
              {/* Section A: Info — Editable */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700">Thông tin cơ bản</h3>
                  {!isEditing ? (
                    canEditInfo && <button onClick={() => setIsEditing(true)}
                      className="text-xs px-2.5 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 font-medium">
                      <Edit className="w-3 h-3" /> Sửa
                    </button>
                  ) : (
                    <div className="flex gap-1.5">
                      <button onClick={() => setIsEditing(false)}
                        className="text-xs px-2.5 py-1 text-slate-500 hover:bg-slate-100 rounded-lg flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Hủy
                      </button>
                      <button onClick={handleSaveInfo} disabled={saving}
                        className="text-xs px-2.5 py-1 text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1 font-medium disabled:opacity-50">
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Lưu
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
                    {([
                      { key: "contactPerson", label: "Người liên hệ", type: "text" },
                      { key: "phone", label: "SĐT", type: "tel" },
                      { key: "email", label: "Email", type: "email" },
                      { key: "zalo", label: "Zalo", type: "text" },
                    ] as const).map((field) => (
                      <div key={field.key}>
                        <label className="text-[11px] text-slate-400 block mb-0.5">{field.label}</label>
                        <input
                          type={field.type}
                          value={editForm[field.key]}
                          onChange={(e) => updateField(field.key, e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                    ))}
                    <div className="col-span-1 sm:col-span-2">
                      <label className="text-[11px] text-slate-400 block mb-0.5">Địa chỉ</label>
                      <input type="text" value={editForm.address}
                        onChange={(e) => updateField("address", e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label className="text-[11px] text-slate-400 block mb-0.5">Ghi chú nội bộ</label>
                      <textarea value={editForm.internalShopNote}
                        onChange={(e) => updateField("internalShopNote", e.target.value)}
                        rows={2}
                        className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div><span className="text-slate-400">Người liên hệ:</span> <span className="text-slate-700">{detail.profile.contactPerson || "—"}</span></div>
                    <div><span className="text-slate-400">SĐT:</span> <span className="text-slate-700">{detail.profile.phone || "—"}</span></div>
                    <div><span className="text-slate-400">Email:</span> <span className="text-slate-700">{detail.profile.email || "—"}</span></div>
                    <div><span className="text-slate-400">Zalo:</span> <span className="text-slate-700">{detail.profile.zalo || "—"}</span></div>
                    <div className="col-span-1 sm:col-span-2"><span className="text-slate-400">Địa chỉ:</span> <span className="text-slate-700">{detail.profile.address || "—"}</span></div>
                    {detail.profile.internalShopNote && (
                      <div className="col-span-1 sm:col-span-2 p-2.5 bg-yellow-50 rounded-lg border border-yellow-200 text-sm text-yellow-800">
                        <span className="font-medium">Ghi chú nội bộ:</span> {detail.profile.internalShopNote}
                      </div>
                    )}
                  </div>
                )}

                {/* Assignee row — editable by admin only */}
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="text-slate-400 shrink-0">NV phụ trách:</span>
                  <span className="text-slate-700 flex-1">
                    {detail.assignees?.map((a: { name: string }) => a.name).join(", ") || "—"}
                  </span>
                  {canAssign && (
                    <button
                      onClick={() => { setShowAssigneeEditor(!showAssigneeEditor); handleLoadUsers(); }}
                      className="text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg flex items-center gap-1 shrink-0"
                    >
                      <UserPlus className="w-3 h-3" /> Thêm
                    </button>
                  )}
                </div>
                {showAssigneeEditor && canAssign && (
                  <div className="mt-2 flex gap-2">
                    <select value={selectedAssignee} onChange={(e) => setSelectedAssignee(e.target.value)}
                      className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <option value="">— Chọn nhân viên —</option>
                      {allUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <button onClick={handleAddAssignee} disabled={!selectedAssignee || assignSaving}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      {assignSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Gán"}
                    </button>
                  </div>
                )}

                {/* Start date */}
                <div className="mt-2 text-sm">
                  <span className="text-slate-400">Ngày bắt đầu:</span>{" "}
                  <span className="text-slate-700">{detail.profile.startDate ? new Date(detail.profile.startDate).toLocaleDateString("vi-VN") : "—"}</span>
                </div>
              </div>

              {/* Section B: Stats */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Thống kê</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  {[
                    { label: "Tổng đơn", value: detail.stats.totalOrders },
                    { label: "Doanh thu tổng", value: formatVND(detail.stats.totalRevenue) },
                    { label: "Tỷ lệ giao TC", value: `${detail.stats.successRate}%` },
                    { label: "Tỷ lệ hoàn", value: `${detail.stats.returnRate}%` },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-slate-50 rounded-lg p-2.5 sm:p-3 text-center">
                      <p className="text-[11px] sm:text-xs text-slate-500">{stat.label}</p>
                      <p className="text-base sm:text-lg font-bold text-slate-800 mt-0.5">{stat.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-[11px] sm:text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                  <span>COD: {formatVND(detail.stats.totalCOD)}</span>
                  <span>TB: {detail.stats.avgOrdersPerMonth} đơn/tháng</span>
                  <span>Đối tác: {detail.stats.mainCarrier}</span>
                  <span>Vấn đề: {detail.stats.claimCount}</span>
                </div>

                {/* Combo Chart: Bar (Revenue) + Line (Orders) — 6 months */}
                {detail.monthlyOrders?.length > 0 && (
                  <div className="mt-4 h-[180px] sm:h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={detail.monthlyOrders}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 10 }} width={40}
                          tickFormatter={(v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`}
                        />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} width={30} />
                        <Tooltip
                          formatter={(value: unknown, name: unknown) => {
                            const v = Number(value);
                            return [String(name) === "revenue" ? formatVND(v) : v, String(name) === "revenue" ? "Doanh thu" : "Số đơn"];
                          }}
                          labelFormatter={(label: unknown) => `Tháng ${label}`}
                        />
                        <Legend
                          formatter={(value: unknown) => String(value) === "revenue" ? "Doanh thu" : "Số đơn"}
                          wrapperStyle={{ fontSize: 11 }}
                        />
                        <Bar yAxisId="left" dataKey="revenue" fill="#93c5fd" radius={[4, 4, 0, 0]} barSize={24} />
                        <Line yAxisId="right" type="monotone" dataKey="count" stroke="#f97316" strokeWidth={2}
                          dot={{ fill: "#f97316", r: 3 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Section C: Care Logs */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700">Lịch sử chăm sóc</h3>
                  <button
                    onClick={() => onOpenCareLog(shopName)}
                    className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    + Thêm ghi nhận
                  </button>
                </div>
                {detail.careLogs?.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">Chưa có lịch sử chăm sóc</p>
                ) : (
                  <div className="space-y-3 relative ml-4 border-l-2 border-slate-200 pl-4">
                    {detail.careLogs?.map((log: {
                      id: string; contactMethod: string; content: string;
                      result: string | null; authorName: string; createdAt: string; isAutoLog: boolean;
                    }) => {
                      const icon = CONTACT_ICONS[log.contactMethod] || CONTACT_ICONS.OTHER;
                      const resultBadge = log.result ? RESULT_BADGES[log.result] : null;
                      return (
                        <div key={log.id} className="relative">
                          <div className="absolute -left-[21px] top-1 w-4 h-4 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center text-[10px]">
                            {icon.label.charAt(0)}
                          </div>
                          <div className={cn("text-sm", log.isAutoLog && "opacity-60")}>
                            <p className="text-xs text-slate-400 mb-0.5">
                              {icon.label} <span className="font-medium text-slate-600">{log.authorName}</span> — {formatDate(log.createdAt)}
                            </p>
                            <p className="text-slate-700">{log.content}</p>
                            {resultBadge && (
                              <span className={cn("text-xs px-2 py-0.5 rounded mt-1 inline-block", resultBadge.color)}>
                                {resultBadge.label}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section D: Recent Orders — Vietnamese status */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Đơn hàng gần đây</h3>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full text-xs min-w-[480px]">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        <th className="text-left px-3 py-2 font-medium text-slate-500">Mã YC</th>
                        <th className="text-left px-3 py-2 font-medium text-slate-500">Trạng Thái</th>
                        <th className="text-left px-3 py-2 font-medium text-slate-500">Ngày</th>
                        <th className="text-right px-3 py-2 font-medium text-slate-500">COD</th>
                        <th className="text-right px-3 py-2 font-medium text-slate-500">Doanh Thu</th>
                        <th className="text-left px-3 py-2 font-medium text-slate-500">Vấn Đề</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detail.recentOrders?.map((order: {
                        requestCode: string; deliveryStatus: string; createdTime: string;
                        codAmount: number; revenue: number; hasClaimOrder: boolean; claimIssueType: string | null;
                      }) => {
                        const statusVN = DELIVERY_STATUS_VN[order.deliveryStatus] || order.deliveryStatus;
                        const statusColor = DELIVERY_STATUS_COLORS[order.deliveryStatus] || "text-slate-600 bg-slate-50";
                        return (
                          <tr key={order.requestCode} className="hover:bg-slate-50">
                            <td className="px-3 py-2">
                              <a href={`/orders/${order.requestCode}`} className="text-blue-600 hover:underline font-medium">
                                {order.requestCode}
                              </a>
                            </td>
                            <td className="px-3 py-2">
                              <span className={cn("text-[11px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap", statusColor)}>
                                {statusVN}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{order.createdTime ? new Date(order.createdTime).toLocaleDateString("vi-VN") : "—"}</td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">{formatVND(order.codAmount)}</td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">{formatVND(order.revenue)}</td>
                            <td className="px-3 py-2">
                              {order.hasClaimOrder && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">
                                  {order.claimIssueType || "Claim"}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <a href={`/orders?shop=${encodeURIComponent(shopName)}`} className="block text-center text-xs text-blue-600 hover:underline mt-2 py-2">
                  Xem tất cả đơn →
                </a>
              </div>

              {/* Section E: Related Todos */}
              {detail.relatedTodos?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Công việc liên quan</h3>
                  <div className="space-y-2">
                    {detail.relatedTodos.map((todo: { id: string; title: string; status: string; dueDate: string | null; assignee: { name: string } }) => (
                      <div key={todo.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg text-sm">
                        <div className="min-w-0 flex-1 mr-2">
                          <p className="text-slate-700 font-medium truncate">{todo.title}</p>
                          <p className="text-xs text-slate-400">{todo.assignee.name} · {todo.dueDate ? new Date(todo.dueDate).toLocaleDateString("vi-VN") : ""}</p>
                        </div>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full border shrink-0",
                          todo.status === "DONE" ? "bg-green-50 text-green-700 border-green-200" :
                            todo.status === "IN_PROGRESS" ? "bg-blue-50 text-blue-700 border-blue-200" :
                              "bg-slate-50 text-slate-600 border-slate-200"
                        )}>
                          {todo.status === "DONE" ? "Xong" : todo.status === "IN_PROGRESS" ? "Đang làm" : "Cần làm"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
