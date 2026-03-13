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
 */
export const STATUS_CATEGORIES = {
  ACTIVE: [DeliveryStatus.IN_TRANSIT, DeliveryStatus.DELIVERING] as const,
  COMPLETED: [DeliveryStatus.DELIVERED, DeliveryStatus.RECONCILED] as const,
  PROBLEM: [DeliveryStatus.DELIVERY_DELAYED, DeliveryStatus.RETURN_DELAYED] as const,
  RETURNING: [DeliveryStatus.RETURN_CONFIRMED, DeliveryStatus.RETURNING_FULL] as const,
  RETURNED: [DeliveryStatus.RETURNED_FULL, DeliveryStatus.RETURNED_PARTIAL] as const,
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
  RETURNING_FULL: "bg-amber-100 text-amber-700",
  RETURN_DELAYED: "bg-red-100 text-red-700",
  RETURNED_FULL: "bg-purple-100 text-purple-700",
  RETURNED_PARTIAL: "bg-violet-100 text-violet-700",
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
