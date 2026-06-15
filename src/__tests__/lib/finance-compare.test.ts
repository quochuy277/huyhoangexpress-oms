import { describe, expect, it } from "vitest";
import { computeDeltaPercent, computeTargetPercent, getPreviousRange, getYoyRange } from "@/lib/finance/compare";

describe("getPreviousRange", () => {
  it("trả về kỳ liền trước cùng độ dài", () => {
    const range = { from: new Date("2026-03-01T00:00:00Z"), to: new Date("2026-03-31T23:59:59.999Z") };
    const prev = getPreviousRange(range);
    expect(prev.to.getTime()).toBe(range.from.getTime() - 1);
    expect(range.from.getTime() - prev.from.getTime()).toBe(range.to.getTime() - range.from.getTime());
  });
});

describe("getYoyRange", () => {
  it("lùi đúng 1 năm", () => {
    const range = { from: new Date("2026-03-01T00:00:00Z"), to: new Date("2026-03-31T00:00:00Z") };
    const yoy = getYoyRange(range);
    expect(yoy.from.getUTCFullYear()).toBe(2025);
    expect(yoy.to.getUTCFullYear()).toBe(2025);
  });
});

describe("computeDeltaPercent", () => {
  it("tính % thay đổi", () => { expect(computeDeltaPercent(110, 100)).toBe(10); });
  it("dùng trị tuyệt đối của previous", () => { expect(computeDeltaPercent(-50, -100)).toBe(50); });
  it("previous = 0 → null", () => { expect(computeDeltaPercent(100, 0)).toBeNull(); });
});

describe("computeTargetPercent", () => {
  it("tính tiến độ", () => { expect(computeTargetPercent(180, 200)).toBe(90); });
  it("target null/0 → null", () => {
    expect(computeTargetPercent(180, null)).toBeNull();
    expect(computeTargetPercent(180, 0)).toBeNull();
  });
});
