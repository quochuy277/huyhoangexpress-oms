import type { OrderChangeType } from "@prisma/client";
import { parseVietnameseDate } from "@/lib/utils";
import { mapStatusToVietnamese } from "@/lib/status-mapper";
import type { DeliveryStatus } from "@prisma/client";

// ============================================================
// Types
// ============================================================

export interface DetectedChange {
  requestCode: string;
  changeType: OrderChangeType;
  previousValue: string | null;
  newValue: string | null;
  changeDetail: string | null;
  changeTimestamp: Date | null;
}

// ============================================================
// Timestamp regex — matches "HH:MM - DD/MM/YYYY" or "HH:MM-DD-MM-YYYY"
// ============================================================

const TIMESTAMP_REGEX = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.*)/;

// ============================================================
// Change patterns — keyword matching for internalNotes lines
// ============================================================

const CHANGE_PATTERNS: Array<{
  type: OrderChangeType;
  patterns: RegExp[];
}> = [
  { type: "WEIGHT_CHANGE",         patterns: [/đổi khối lượng/i, /webhook đổi khối lượng/i] },
  { type: "CARRIER_FEE_CONFIRMED", patterns: [/xác nhận phí nvc thu/i, /kế toán.*xác nhận phí/i] },
  { type: "RECIPIENT_CHANGE",      patterns: [/đổi thông tin người nhận/i] },
  { type: "SURCHARGE_CHANGE",      patterns: [/đổi nội bộ phụ phí/i] },
  { type: "SERVICE_FEE_CHANGE",    patterns: [/webhook đổi tổng phí dịch vụ/i, /đổi nội bộ tổng phí/i] },
  { type: "COD_CONFIRMED",         patterns: [/xác nhận đã thanh toán cod/i] },
  { type: "RETURN_COMPLETED",      patterns: [/đã thực hiện trả hàng/i] },
  { type: "CARRIER_SWITCH",        patterns: [/đổi đơn vị vận chuyển/i, /đổi nvc/i] },
  { type: "REDELIVER",             patterns: [/kéo giao lại/i] },
  { type: "INTERNAL_STATUS_NOTE",  patterns: [/đổi nội bộ trạng thái/i, /sửa trạng thái đơn hàng/i] },
  { type: "RETURN_APPROVED",       patterns: [/xác nhận duyệt hoàn/i, /duyệt hoàn/i] },
  { type: "COD_AMOUNT_CHANGE",     patterns: [/đổi tiền hàng/i, /đổi tổng thu hộ nvc/i] },
  { type: "CLAIM_RELATED",         patterns: [/yêu cầu khiếu nại/i, /yêu cầu đền bù/i, /tạo ticket/i] },
];

// Patterns to IGNORE (normal operations, not "changes")
const IGNORED_PATTERNS: RegExp[] = [
  /đã tạo đơn hàng/i,
  /đang được lấy bởi shipper/i,
  /đã duyệt đơn hàng/i,
  /thao tác chuyển kỳ/i,
  /thuộc khu vực bị chặn/i,
  /đổi cài đặt cấu hình thu hộ/i,
  /đổi chiều dài sản phẩm/i,
];

// Staff note: "TênNV: nội dung" — e.g. "Đỗ Kim Huệ: Hoàn"
const STAFF_NOTE_PATTERN = /^[A-ZÀ-Ỹa-zà-ỹ\s]{2,}:\s*\S/;

// ============================================================
// Core functions
// ============================================================

/**
 * Normalize internalNotes text into individual lines.
 * Handles \r\n, \n, and trims each line.
 */
export function normalizeNotes(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Parse a single note line to extract timestamp and content.
 * Input: "14:30 - 20/03/2026 Nội dung gì đó"
 * Output: { timestamp: Date, content: "Nội dung gì đó" }
 */
export function parseNoteLine(line: string): {
  timestamp: Date | null;
  content: string;
} {
  const match = line.match(TIMESTAMP_REGEX);
  if (match) {
    const time = match[1]; // "14:30"
    const dateStr = match[2].replace(/-/g, "/"); // normalize to "/"
    const content = match[3];
    // Combine into format parseVietnameseDate understands: "DD/MM/YYYY HH:mm:ss"
    const combined = `${dateStr} ${time}:00`;
    const timestamp = parseVietnameseDate(combined);
    return { timestamp, content };
  }
  return { timestamp: null, content: line };
}

/**
 * Classify a note content line into an OrderChangeType.
 * Returns null if the line should be ignored (normal operation).
 */
export function classifyNoteChange(content: string): OrderChangeType | null {
  // 1. Check ignored patterns first
  for (const pattern of IGNORED_PATTERNS) {
    if (pattern.test(content)) return null;
  }

  // 2. Check specific change patterns
  for (const { type, patterns } of CHANGE_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(content)) return type;
    }
  }

  // 3. Check staff note pattern (e.g. "Đỗ Kim Huệ: Hoàn")
  if (STAFF_NOTE_PATTERN.test(content)) return "STAFF_NOTE";

  // 4. Fallback
  return "OTHER";
}

/**
 * Extract "from → to" values from a note content.
 * Handles: "đổi ... từ X thành Y" patterns.
 * Uses lastIndexOf("thành") to avoid issues with names containing "thành".
 */
export function extractValues(
  content: string,
  changeType: OrderChangeType
): { prev: string | null; next: string | null } {
  // Try "từ ... thành ..." pattern (match last "thành" to handle names like "Nguyễn Thành")
  const fromIdx = content.search(/từ\s+/i);
  if (fromIdx !== -1) {
    const afterFrom = content.slice(fromIdx).replace(/^từ\s+/i, "");
    const lastThanhIdx = afterFrom.lastIndexOf(" thành ");
    if (lastThanhIdx !== -1) {
      return {
        prev: afterFrom.slice(0, lastThanhIdx).trim(),
        next: afterFrom
          .slice(lastThanhIdx + 7)
          .trim()
          .replace(/[,;.]$/, ""),
      };
    }
  }

  // Special case: "xác nhận phí NVC thu 42,001đ" — no "từ...thành"
  if (
    changeType === "CARRIER_FEE_CONFIRMED" ||
    changeType === "COD_CONFIRMED"
  ) {
    const amountMatch = content.match(/([\d,.]+)đ/);
    return { prev: null, next: amountMatch ? amountMatch[1] + "đ" : null };
  }

  return { prev: null, next: null };
}

// ============================================================
// Main detection function — compare old vs new data for one order
// ============================================================

export interface ExistingOrderData {
  requestCode: string;
  deliveryStatus: DeliveryStatus;
  internalNotes: string | null;
}

/**
 * Detect all changes between existing order data and new parsed data.
 * Returns array of DetectedChange objects (may be empty if no changes).
 */
export function detectOrderChanges(
  existing: ExistingOrderData,
  newDeliveryStatus: DeliveryStatus,
  newInternalNotes: string | null
): DetectedChange[] {
  const changes: DetectedChange[] = [];
  const now = new Date();

  // --- 1. STATUS_CHANGE: compare deliveryStatus enum ---
  if (existing.deliveryStatus !== newDeliveryStatus) {
    const oldText = mapStatusToVietnamese(existing.deliveryStatus);
    const newText = mapStatusToVietnamese(newDeliveryStatus);
    changes.push({
      requestCode: existing.requestCode,
      changeType: "STATUS_CHANGE",
      previousValue: oldText,
      newValue: newText,
      changeDetail: `Trạng thái: ${oldText} → ${newText}`,
      changeTimestamp: null,
    });
  }

  // --- 2. INTERNAL NOTES: find new lines & classify ---
  const oldLines = new Set(normalizeNotes(existing.internalNotes));
  const newLines = normalizeNotes(newInternalNotes);
  const addedLines = newLines.filter((line) => !oldLines.has(line));

  for (const line of addedLines) {
    const { timestamp, content } = parseNoteLine(line);
    const changeType = classifyNoteChange(content);

    if (changeType === null) continue; // Ignored pattern

    const { prev, next } = extractValues(content, changeType);

    changes.push({
      requestCode: existing.requestCode,
      changeType,
      previousValue: prev,
      newValue: next,
      changeDetail: line, // Full original line with timestamp
      changeTimestamp: timestamp,
    });
  }

  return changes;
}
