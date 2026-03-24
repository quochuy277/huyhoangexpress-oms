import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format number as Vietnamese currency (VND)
 * Accepts Prisma Decimal, number, null, or undefined
 * @example formatVND(1500000) → "1.500.000đ"
 */
export function formatVND(amount: number | { toNumber?: () => number } | null | undefined): string {
  const num = amount == null ? 0 : typeof amount === "number" ? amount : Number(amount);
  if (isNaN(num)) return "0đ";
  return (
    new Intl.NumberFormat("vi-VN").format(Math.round(num)) + "đ"
  );
}

/**
 * Vietnam timezone constant — used across all date formatting
 */
const VN_TIMEZONE = "Asia/Ho_Chi_Minh";

/**
 * Format Date to Vietnamese format HH:mm DD/MM/YYYY
 * Always uses Vietnam timezone (UTC+7) regardless of server/client timezone
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";

  return d.toLocaleString("vi-VN", {
    timeZone: VN_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Format Date to DD/MM/YYYY (date only, no time)
 * Always uses Vietnam timezone (UTC+7) regardless of server/client timezone
 */
export function formatDateOnly(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";

  return d.toLocaleDateString("vi-VN", {
    timeZone: VN_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Parse Vietnamese date string "DD/MM/YYYY HH:mm:ss" → Date object
 * Returns null if parsing fails
 */
export function parseVietnameseDate(
  dateStr: string | null | undefined
): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null;

  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Pattern: DD/MM/YYYY or DD/MM/YYYY HH:mm:ss
  const match = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
  );

  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // JS months are 0-indexed
  const year = parseInt(match[3], 10);
  const hours = match[4] ? parseInt(match[4], 10) : 0;
  const minutes = match[5] ? parseInt(match[5], 10) : 0;
  const seconds = match[6] ? parseInt(match[6], 10) : 0;

  // Validate that the date is real BEFORE applying timezone offset
  // (e.g., reject Feb 30, but don't fail on timezone day-shift)
  const validationDate = new Date(Date.UTC(year, month, day));
  if (
    validationDate.getUTCDate() !== day ||
    validationDate.getUTCMonth() !== month ||
    validationDate.getUTCFullYear() !== year
  ) {
    return null;
  }

  // Excel dates from GHN are in Vietnam time (UTC+7).
  // Subtract 7 hours to store as correct UTC in the database.
  const VN_UTC_OFFSET_HOURS = 7;
  return new Date(Date.UTC(year, month, day, hours - VN_UTC_OFFSET_HOURS, minutes, seconds));
}

/**
 * Calculate how many days ago from now
 */
export function daysAgo(date: Date | string | null | undefined): number {
  if (!date) return 0;
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return 0;

  const now = new Date();
  const diff = now.getTime() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Format number with Vietnamese thousand separator
 * @example formatNumber(1500000) → "1.500.000"
 */
export function formatNumber(num: number): string {
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("vi-VN").format(num);
}

/**
 * Truncate text to a max length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}
