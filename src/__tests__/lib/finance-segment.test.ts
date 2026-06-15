import { describe, expect, it } from "vitest";
import { resolveActiveSegment } from "@/lib/finance/segment";

describe("resolveActiveSegment", () => {
  const ids = ["carrier", "shop", "negative"];
  it("trả về param khi hợp lệ", () => {
    expect(resolveActiveSegment("shop", ids, "carrier")).toBe("shop");
  });
  it("trả về fallback khi param null", () => {
    expect(resolveActiveSegment(null, ids, "carrier")).toBe("carrier");
  });
  it("trả về fallback khi param không thuộc danh sách", () => {
    expect(resolveActiveSegment("xxx", ids, "carrier")).toBe("carrier");
  });
});
