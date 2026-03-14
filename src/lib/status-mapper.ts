import { DeliveryStatus } from "@prisma/client";

/**
 * Map Vietnamese status strings from Excel → DeliveryStatus enum
 */
const STATUS_MAP: Record<string, DeliveryStatus> = {
  "Đang chuyển kho giao": DeliveryStatus.IN_TRANSIT,
  "Đang giao hàng": DeliveryStatus.DELIVERING,
  "Đã giao hàng": DeliveryStatus.DELIVERED,
  "Đã đối soát giao hàng": DeliveryStatus.RECONCILED,
  "Hoãn giao hàng": DeliveryStatus.DELIVERY_DELAYED,
  "Xác nhận hoàn": DeliveryStatus.RETURN_CONFIRMED,
  "Đang chuyển kho trả toàn bộ": DeliveryStatus.RETURNING_FULL,
  "Hoãn trả hàng": DeliveryStatus.RETURN_DELAYED,
  "Đã trả hàng toàn bộ": DeliveryStatus.RETURNED_FULL,
  "Đã trả hàng một phần": DeliveryStatus.RETURNED_PARTIAL,
};

/**
 * Map DeliveryStatus enum → Vietnamese display text
 */
const REVERSE_STATUS_MAP: Record<DeliveryStatus, string> = {
  [DeliveryStatus.PROCESSING]: "Đang xử lý",
  [DeliveryStatus.IN_TRANSIT]: "Đang chuyển kho giao",
  [DeliveryStatus.DELIVERING]: "Đang giao hàng",
  [DeliveryStatus.DELIVERED]: "Đã giao hàng",
  [DeliveryStatus.RECONCILED]: "Đã đối soát giao hàng",
  [DeliveryStatus.DELIVERY_DELAYED]: "Hoãn giao hàng",
  [DeliveryStatus.RETURN_CONFIRMED]: "Xác nhận hoàn",
  [DeliveryStatus.RETURNING_FULL]: "Đang chuyển kho trả toàn bộ",
  [DeliveryStatus.RETURN_DELAYED]: "Hoãn trả hàng",
  [DeliveryStatus.RETURNED_FULL]: "Đã trả hàng toàn bộ",
  [DeliveryStatus.RETURNED_PARTIAL]: "Đã trả hàng một phần",
};

/**
 * Status category groupings for filtering
 *
 * FINAL STATUS CATEGORIES (source of truth):
 * ┌─────────────────────┬────────────────┬───────────┬─────────────────────────┐
 * │ Vietnamese Status   │ Enum           │ Category  │ Page                    │
 * ├─────────────────────┼────────────────┼───────────┼─────────────────────────┤
 * │ Đang chuyển kho giao│ IN_TRANSIT     │ Active    │ Quản lý đơn hàng       │
 * │ Đang giao hàng      │ DELIVERING     │ Active*   │ Quản lý đơn hàng       │
 * │ Đã giao hàng        │ DELIVERED      │ Completed │ Quản lý đơn hàng       │
 * │ Đã đối soát giao    │ RECONCILED     │ Completed │ Quản lý đơn hàng       │
 * │ Hoãn giao hàng      │ DELIVERY_DELAYED│ Problem  │ Chăm sóc đơn Hoãn      │
 * │ Xác nhận hoàn       │ RETURN_CONFIRMED│ Problem  │ Chăm sóc đơn Hoãn      │
 * │ Hoãn trả hàng       │ RETURN_DELAYED │ Returning │ Theo dõi đơn Hoàn       │
 * │ Đang chuyển kho trả │ RETURNING_FULL │ Returning │ Theo dõi đơn Hoàn       │
 * │ Đã trả toàn bộ      │ RETURNED_FULL  │ Completed │ Quản lý đơn hàng       │
 * │ Đã trả một phần     │ RETURNED_PARTIAL│ Completed │ Quản lý đơn hàng       │
 * └─────────────────────┴────────────────┴───────────┴─────────────────────────┘
 *
 * ★ DELIVERING also appears in "Chăm sóc đơn Hoãn" if publicNotes contains "Hoãn giao hàng"
 */
export const STATUS_CATEGORIES = {
  ACTIVE: [DeliveryStatus.IN_TRANSIT, DeliveryStatus.DELIVERING] as const,
  COMPLETED: [
    DeliveryStatus.DELIVERED, DeliveryStatus.RECONCILED,
    DeliveryStatus.RETURNED_FULL, DeliveryStatus.RETURNED_PARTIAL,
  ] as const,
  PROBLEM: [DeliveryStatus.DELIVERY_DELAYED, DeliveryStatus.RETURN_CONFIRMED] as const,
  RETURNING: [DeliveryStatus.RETURN_DELAYED, DeliveryStatus.RETURNING_FULL] as const,
} as const;

/**
 * Status badge color mappings
 */
export const STATUS_COLORS: Record<string, string> = {
  PROCESSING: "bg-gray-100 text-gray-700",
  IN_TRANSIT: "bg-blue-100 text-blue-700",
  DELIVERING: "bg-cyan-100 text-cyan-700",
  DELIVERED: "bg-green-100 text-green-700",
  RECONCILED: "bg-emerald-100 text-emerald-700",
  DELIVERY_DELAYED: "bg-red-100 text-red-700",
  RETURN_CONFIRMED: "bg-orange-100 text-orange-700",
  RETURN_DELAYED: "bg-amber-100 text-amber-700",
  RETURNING_FULL: "bg-amber-100 text-amber-700",
  RETURNED_FULL: "bg-purple-100 text-purple-700",
  RETURNED_PARTIAL: "bg-violet-100 text-violet-700",
  // Special badge for DELIVERING orders with delay history
  DELIVERING_REDELIVER: "bg-sky-100 text-sky-700",
};

/**
 * Convert Vietnamese status text from Excel to DeliveryStatus enum
 * Returns PROCESSING if status text is not recognized
 */
export function mapStatusToEnum(vietnameseStatus: string): DeliveryStatus {
  if (!vietnameseStatus) return DeliveryStatus.PROCESSING;

  const trimmed = vietnameseStatus.trim();

  // Direct match
  if (STATUS_MAP[trimmed]) {
    return STATUS_MAP[trimmed];
  }

  // Partial match (case-insensitive)
  for (const [key, value] of Object.entries(STATUS_MAP)) {
    if (trimmed.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  return DeliveryStatus.PROCESSING;
}

/**
 * Convert DeliveryStatus enum to Vietnamese display text
 */
export function mapStatusToVietnamese(status: DeliveryStatus): string {
  return REVERSE_STATUS_MAP[status] || "Không xác định";
}

/**
 * Get all available status options for dropdown/filter
 */
export function getStatusOptions(): Array<{
  value: DeliveryStatus;
  label: string;
}> {
  return Object.entries(REVERSE_STATUS_MAP).map(([value, label]) => ({
    value: value as DeliveryStatus,
    label,
  }));
}

/**
 * Check if a DELIVERING order has delay history (should appear in delayed care page)
 */
export function hasDelayHistory(publicNotes: string | null | undefined): boolean {
  if (!publicNotes) return false;
  return publicNotes.includes("Hoãn giao hàng");
}
