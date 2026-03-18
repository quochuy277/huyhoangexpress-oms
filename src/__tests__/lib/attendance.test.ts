import { describe, it, expect } from "vitest";
import {
  parseDeviceType,
  isAfterTime,
  calculateLateMinutes,
} from "@/lib/attendance";

// ============================================================
// parseDeviceType
// ============================================================
describe("parseDeviceType", () => {
  it("detects Chrome on Windows", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";
    expect(parseDeviceType(ua)).toBe("Chrome / Windows");
  });

  it("detects Edge on Windows", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
    expect(parseDeviceType(ua)).toBe("Edge / Windows");
  });

  it("detects Safari on MacOS", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15";
    expect(parseDeviceType(ua)).toBe("Safari / MacOS");
  });

  it("detects Firefox on Windows", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0";
    expect(parseDeviceType(ua)).toBe("Firefox / Windows");
  });

  it("detects Chrome on Android", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36";
    expect(parseDeviceType(ua)).toBe("Chrome / Android");
  });

  it("detects Safari on iPhone", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";
    expect(parseDeviceType(ua)).toBe("Safari / iPhone");
  });

  it("detects Chrome on Linux", () => {
    const ua =
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";
    expect(parseDeviceType(ua)).toBe("Chrome / Linux");
  });

  it("returns Unknown for unrecognized UA", () => {
    expect(parseDeviceType("")).toBe("Unknown / Unknown");
  });

  it("detects iPad", () => {
    const ua =
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";
    expect(parseDeviceType(ua)).toBe("Safari / iPad");
  });
});

// ============================================================
// isAfterTime
// ============================================================
describe("isAfterTime", () => {
  const makeDate = (hours: number, minutes: number): Date => {
    // Create a date with specific local time
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  it("returns false when check-in is before threshold", () => {
    // 08:00 vs threshold 08:30 → not late
    const d = makeDate(8, 0);
    expect(isAfterTime(d, "08:30")).toBe(false);
  });

  it("returns false when check-in is exactly at threshold", () => {
    // 08:30 vs threshold 08:30 → not late (not strictly after)
    const d = makeDate(8, 30);
    expect(isAfterTime(d, "08:30")).toBe(false);
  });

  it("returns true when check-in is after threshold", () => {
    // 08:45 vs threshold 08:30 → late
    const d = makeDate(8, 45);
    expect(isAfterTime(d, "08:30")).toBe(true);
  });

  it("returns true when check-in is 1 minute after threshold", () => {
    const d = makeDate(8, 31);
    expect(isAfterTime(d, "08:30")).toBe(true);
  });

  it("returns true when check-in is an hour late", () => {
    const d = makeDate(9, 30);
    expect(isAfterTime(d, "08:30")).toBe(true);
  });

  it("returns false for midnight check-in with 08:30 threshold", () => {
    const d = makeDate(0, 0);
    expect(isAfterTime(d, "08:30")).toBe(false);
  });
});

// ============================================================
// calculateLateMinutes
// ============================================================
describe("calculateLateMinutes", () => {
  const makeDate = (hours: number, minutes: number): Date => {
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  it("returns 0 when on time", () => {
    const d = makeDate(8, 30);
    expect(calculateLateMinutes(d, "08:30")).toBe(0);
  });

  it("returns 0 when early", () => {
    const d = makeDate(8, 0);
    expect(calculateLateMinutes(d, "08:30")).toBe(0);
  });

  it("returns 15 when 15 minutes late", () => {
    const d = makeDate(8, 45);
    expect(calculateLateMinutes(d, "08:30")).toBe(15);
  });

  it("returns 60 when 1 hour late", () => {
    const d = makeDate(9, 30);
    expect(calculateLateMinutes(d, "08:30")).toBe(60);
  });

  it("returns 1 when 1 minute late", () => {
    const d = makeDate(8, 31);
    expect(calculateLateMinutes(d, "08:30")).toBe(1);
  });

  it("returns 0 (not negative) when early", () => {
    const d = makeDate(7, 0);
    const result = calculateLateMinutes(d, "08:30");
    expect(result).toBeGreaterThanOrEqual(0);
  });
});
