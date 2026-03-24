export const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string; tw: string; twBg: string }> = {
  URGENT: { label: "Khẩn cấp", color: "#dc2626", bg: "#fef2f2", border: "#fecaca", dot: "#EF4444", tw: "text-red-600", twBg: "bg-red-50 text-red-600" },
  HIGH: { label: "Cao", color: "#d97706", bg: "#fffbeb", border: "#fde68a", dot: "#F59E0B", tw: "text-amber-600", twBg: "bg-amber-50 text-amber-600" },
  MEDIUM: { label: "Trung bình", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", dot: "#2563EB", tw: "text-blue-600", twBg: "bg-blue-50 text-blue-600" },
  LOW: { label: "Thấp", color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb", dot: "#9CA3AF", tw: "text-gray-500", twBg: "bg-gray-50 text-gray-500" },
};

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; tw: string; twBg: string }> = {
  TODO: { label: "Cần làm", color: "#6b7280", bg: "#f3f4f6", tw: "text-gray-500", twBg: "bg-gray-100 text-gray-600" },
  IN_PROGRESS: { label: "Đang làm", color: "#d97706", bg: "#fffbeb", tw: "text-amber-600", twBg: "bg-amber-50 text-amber-600" },
  DONE: { label: "Hoàn thành", color: "#16a34a", bg: "#f0fdf4", tw: "text-green-600", twBg: "bg-green-50 text-green-600" },
};

export const SOURCE_CONFIG: Record<string, { label: string; color: string; bg: string; tw: string; twBg: string }> = {
  MANUAL: { label: "Thủ công", color: "#6b7280", bg: "#f3f4f6", tw: "text-gray-500", twBg: "bg-gray-100 text-gray-500" },
  FROM_DELAYED: { label: "Đơn hoãn", color: "#d97706", bg: "#fffbeb", tw: "text-amber-600", twBg: "bg-amber-50 text-amber-600" },
  FROM_RETURNS: { label: "Đơn hoàn", color: "#eab308", bg: "#fefce8", tw: "text-yellow-600", twBg: "bg-yellow-50 text-yellow-600" },
  FROM_CLAIMS: { label: "Khiếu nại", color: "#dc2626", bg: "#fef2f2", tw: "text-red-600", twBg: "bg-red-50 text-red-600" },
  FROM_ORDERS: { label: "Đơn hàng", color: "#2563eb", bg: "#eff6ff", tw: "text-blue-600", twBg: "bg-blue-50 text-blue-600" },
  FROM_CRM: { label: "CRM", color: "#7c3aed", bg: "#f5f3ff", tw: "text-violet-600", twBg: "bg-violet-50 text-violet-600" },
};

export const DUE_FILTER_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "overdue", label: "Quá hạn" },
  { value: "today", label: "Hôm nay" },
  { value: "week", label: "Tuần này" },
  { value: "month", label: "Tháng này" },
  { value: "none", label: "Không có thời hạn" },
] as const;
