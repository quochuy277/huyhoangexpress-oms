import type { TodoStatus } from "@prisma/client";

const DEFAULT_TZ_OFFSET_MINUTES = 420; // +07:00 (VN, không có DST)
const DAY_MS = 86_400_000;

/** Trần số việc nạp cho các view không phân trang. */
export const BOARD_OPEN_CAP = 200;
export const BOARD_DONE_LIMIT = 20;
export const FOCUS_CAP = 200;

export function getTzOffsetMinutes(): number {
  const raw = process.env.APP_TZ_OFFSET;
  if (raw == null || raw.trim() === "") return DEFAULT_TZ_OFFSET_MINUTES;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : DEFAULT_TZ_OFFSET_MINUTES;
}

export interface DayWindows {
  todayStart: Date;
  todayEnd: Date;
  weekStart: Date;
  weekEnd: Date;
}

/** Mốc đầu/cuối ngày & tuần (Thứ Hai) tính theo giờ VN, trả về dưới dạng instant tuyệt đối. */
export function getDayWindows(now: Date = new Date()): DayWindows {
  const offsetMs = getTzOffsetMinutes() * 60_000;
  const local = new Date(now.getTime() + offsetMs); // "giờ tường VN" đặt trong các trường UTC
  const todayStart = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offsetMs,
  );
  const todayEnd = new Date(todayStart.getTime() + DAY_MS);

  const dow = local.getUTCDay(); // 0=CN..6=T7 theo giờ VN
  const deltaToMonday = (dow + 6) % 7; // CN→6, T2→0, T3→1...
  const weekStart = new Date(todayStart.getTime() - deltaToMonday * DAY_MS);
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);

  return { todayStart, todayEnd, weekStart, weekEnd };
}

/** 00:00 VN của ngày đầu tháng kế (dùng cho dueFilter "month"). */
export function getMonthEnd(now: Date = new Date()): Date {
  const offsetMs = getTzOffsetMinutes() * 60_000;
  const local = new Date(now.getTime() + offsetMs);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) - offsetMs);
}

export type DueClass = "overdue" | "today" | "upcoming" | "none";

/** Phân loại hạn theo mức ngày (giờ VN). DONE/null → "none". */
export function classifyDue(
  dueDate: Date | string | null,
  status: TodoStatus,
  now: Date = new Date(),
): DueClass {
  if (status === "DONE" || dueDate == null) return "none";
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  if (Number.isNaN(due.getTime())) return "none";
  const { todayStart, todayEnd } = getDayWindows(now);
  if (due.getTime() < todayStart.getTime()) return "overdue";
  if (due.getTime() < todayEnd.getTime()) return "today";
  return "upcoming";
}
