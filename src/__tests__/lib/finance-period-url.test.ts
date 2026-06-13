import { describe, expect, it } from "vitest";
import { buildPeriodSearch, readPeriodFromParams } from "@/lib/finance/period-url";

describe("readPeriodFromParams", () => {
  it("mặc định month khi thiếu tham số", () => {
    expect(readPeriodFromParams(new URLSearchParams())).toEqual({ period: "month", from: "", to: "" });
  });
  it("đọc custom range", () => {
    const p = new URLSearchParams("period=custom&from=2026-01-01&to=2026-01-31");
    expect(readPeriodFromParams(p)).toEqual({ period: "custom", from: "2026-01-01", to: "2026-01-31" });
  });
});

describe("buildPeriodSearch", () => {
  it("preset chỉ có period", () => {
    expect(buildPeriodSearch("quarter", "", "")).toBe("period=quarter");
  });
  it("custom kèm from/to", () => {
    expect(buildPeriodSearch("custom", "2026-01-01", "2026-01-31")).toBe(
      "period=custom&from=2026-01-01&to=2026-01-31"
    );
  });
  it("custom thiếu ngày thì bỏ qua from/to", () => {
    expect(buildPeriodSearch("custom", "", "")).toBe("period=custom");
  });
});
