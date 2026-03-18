import { describe, it, expect } from "vitest";
import {
  formatVND,
  formatDate,
  formatDateOnly,
  parseVietnameseDate,
  daysAgo,
  formatNumber,
  truncate,
} from "@/lib/utils";

// ============================================================
// formatVND
// ============================================================
describe("formatVND", () => {
  it("formats typical VND amount", () => {
    expect(formatVND(1500000)).toBe("1.500.000đ");
  });

  it("formats zero", () => {
    expect(formatVND(0)).toBe("0đ");
  });

  it("returns '0đ' for NaN", () => {
    expect(formatVND(NaN)).toBe("0đ");
  });

  it("formats negative amount", () => {
    const result = formatVND(-500000);
    expect(result).toContain("500.000");
    expect(result).toContain("đ");
  });

  it("rounds decimal amount", () => {
    expect(formatVND(1000.7)).toBe("1.001đ");
  });

  it("formats large amount", () => {
    expect(formatVND(1000000000)).toBe("1.000.000.000đ");
  });
});

// ============================================================
// formatNumber
// ============================================================
describe("formatNumber", () => {
  it("formats number with Vietnamese separator", () => {
    expect(formatNumber(1500000)).toBe("1.500.000");
  });

  it("returns '0' for NaN", () => {
    expect(formatNumber(NaN)).toBe("0");
  });

  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });
});

// ============================================================
// formatDate
// ============================================================
describe("formatDate", () => {
  it("formats Date object to DD/MM/YYYY HH:mm", () => {
    const d = new Date(2024, 11, 25, 14, 30); // 25/12/2024 14:30
    const result = formatDate(d);
    expect(result).toBe("25/12/2024 14:30");
  });

  it("returns '—' for null", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("returns '—' for undefined", () => {
    expect(formatDate(undefined)).toBe("—");
  });

  it("returns '—' for invalid date string", () => {
    expect(formatDate("not-a-date")).toBe("—");
  });

  it("formats ISO string", () => {
    const result = formatDate("2024-06-15T08:00:00.000Z");
    expect(result).toMatch(/\d{2}\/\d{2}\/2024 \d{2}:\d{2}/);
  });

  it("pads single digit day and month", () => {
    const d = new Date(2024, 0, 5, 9, 5); // 05/01/2024 09:05
    expect(formatDate(d)).toBe("05/01/2024 09:05");
  });
});

// ============================================================
// formatDateOnly
// ============================================================
describe("formatDateOnly", () => {
  it("formats Date object to DD/MM/YYYY", () => {
    const d = new Date(2024, 11, 25);
    expect(formatDateOnly(d)).toBe("25/12/2024");
  });

  it("returns '—' for null", () => {
    expect(formatDateOnly(null)).toBe("—");
  });

  it("returns '—' for undefined", () => {
    expect(formatDateOnly(undefined)).toBe("—");
  });

  it("returns '—' for invalid date", () => {
    expect(formatDateOnly("invalid")).toBe("—");
  });

  it("pads single digit day and month", () => {
    const d = new Date(2024, 0, 3); // 03/01/2024
    expect(formatDateOnly(d)).toBe("03/01/2024");
  });
});

// ============================================================
// parseVietnameseDate
// ============================================================
describe("parseVietnameseDate", () => {
  it("parses DD/MM/YYYY format", () => {
    const result = parseVietnameseDate("25/12/2024");
    expect(result).not.toBeNull();
    expect(result!.getDate()).toBe(25);
    expect(result!.getMonth()).toBe(11); // 0-indexed
    expect(result!.getFullYear()).toBe(2024);
  });

  it("parses DD/MM/YYYY HH:mm:ss format", () => {
    const result = parseVietnameseDate("25/12/2024 14:30:00");
    expect(result).not.toBeNull();
    expect(result!.getHours()).toBe(14);
    expect(result!.getMinutes()).toBe(30);
    expect(result!.getSeconds()).toBe(0);
  });

  it("parses DD/MM/YYYY HH:mm format (without seconds)", () => {
    const result = parseVietnameseDate("15/06/2024 09:05");
    expect(result).not.toBeNull();
    expect(result!.getHours()).toBe(9);
    expect(result!.getMinutes()).toBe(5);
  });

  it("returns null for invalid date (30/02/2024 - Feb 30)", () => {
    expect(parseVietnameseDate("30/02/2024")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(parseVietnameseDate(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(parseVietnameseDate(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseVietnameseDate("")).toBeNull();
  });

  it("returns null for wrong format (YYYY-MM-DD)", () => {
    expect(parseVietnameseDate("2024-12-25")).toBeNull();
  });

  it("handles single digit day and month", () => {
    const result = parseVietnameseDate("5/6/2024");
    expect(result).not.toBeNull();
    expect(result!.getDate()).toBe(5);
    expect(result!.getMonth()).toBe(5); // June = index 5
  });

  it("returns null for invalid month (13th month)", () => {
    expect(parseVietnameseDate("01/13/2024")).toBeNull();
  });
});

// ============================================================
// daysAgo
// ============================================================
describe("daysAgo", () => {
  it("returns 0 for null", () => {
    expect(daysAgo(null)).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(daysAgo(undefined)).toBe(0);
  });

  it("returns ~0 for today", () => {
    expect(daysAgo(new Date())).toBe(0);
  });

  it("returns 7 for date 7 days ago", () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    expect(daysAgo(sevenDaysAgo)).toBe(7);
  });

  it("returns correct days for string date", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(daysAgo(threeDaysAgo.toISOString())).toBe(3);
  });

  it("returns 0 for invalid date string", () => {
    expect(daysAgo("not-a-date")).toBe(0);
  });
});

// ============================================================
// truncate
// ============================================================
describe("truncate", () => {
  it("returns original text if shorter than maxLength", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("returns original text if exact maxLength", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });

  it("truncates text longer than maxLength with ellipsis", () => {
    expect(truncate("abcdefghijk", 5)).toBe("abcde...");
  });

  it("handles empty string", () => {
    expect(truncate("", 5)).toBe("");
  });

  it("truncates Vietnamese text correctly", () => {
    const text = "Đây là một đoạn văn bản rất dài";
    const result = truncate(text, 10);
    expect(result).toHaveLength(13); // 10 chars + "..."
    expect(result.endsWith("...")).toBe(true);
  });
});
