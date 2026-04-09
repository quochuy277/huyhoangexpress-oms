import { normalizeVietnameseAscii, repairUtf8Mojibake } from "@/lib/text-encoding";

const STATUS_LABEL_BY_KEY: Record<string, string> = {
  processing: "Đang xử lý",
  pending: "Chờ xử lý",
  "cho xu ly": "Chờ xử lý",
  "dang chuyen kho giao": "Đang chuyển kho giao",
  "dang giao hang": "Đang giao hàng",
  "da giao hang": "Đã giao hàng",
  "da doi soat giao hang": "Đã đối soát giao hàng",
  "hoan giao hang": "Hoãn giao hàng",
  "xac nhan hoan": "Xác nhận hoàn",
  "dang chuyen kho tra toan bo": "Đang chuyển kho trả toàn bộ",
  "hoan tra hang": "Hoãn trả hàng",
  "da tra hang toan bo": "Đã trả hàng toàn bộ",
  "da tra hang mot phan": "Đã trả hàng một phần",
  "da huy": "Đã hủy",
};

const STATUS_LABEL_BY_ENUM: Record<string, string> = {
  PROCESSING: "Đang xử lý",
  PENDING: "Chờ xử lý",
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
  CANCELLED: "Đã hủy",
};

export function formatDelayedStatusLabel(status: string) {
  if (!status) {
    return "";
  }

  const repairedStatus = repairUtf8Mojibake(status).trim();

  return (
    STATUS_LABEL_BY_ENUM[repairedStatus] ??
    STATUS_LABEL_BY_KEY[normalizeVietnameseAscii(repairedStatus)] ??
    repairedStatus
  );
}
