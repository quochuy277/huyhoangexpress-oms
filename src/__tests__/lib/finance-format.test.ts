import { describe, expect, it } from "vitest";
import { formatVnd } from "@/lib/finance/format";

describe("formatVnd", () => {
  it("định dạng số nguyên kèm hậu tố đ", () => {
    expect(formatVnd(1234567)).toBe("1.234.567đ");
  });
  it("làm tròn số thập phân", () => {
    expect(formatVnd(1000.6)).toBe("1.001đ");
  });
  it("xử lý số âm", () => {
    expect(formatVnd(-2000)).toBe("-2.000đ");
  });
  it("0 trả về 0đ", () => {
    expect(formatVnd(0)).toBe("0đ");
  });
});
