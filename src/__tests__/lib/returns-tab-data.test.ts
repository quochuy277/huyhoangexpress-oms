import { describe, expect, it, vi } from "vitest";

import {
  clearReturnsPaginationParams,
  createEmptyReturnsTabData,
  fetchReturnsSummary,
  fetchReturnsTabData,
  getReturnShopNames,
  invalidateReturnsTabs,
  resolveReturnsTabPage,
  shouldFetchReturnsTab,
} from "@/lib/returns-tab-data";

describe("returns tab data helpers", () => {
  it("fetches only the requested active tab", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ requestCode: "REQ-001", shopName: "Shop A" }],
      }),
    });

    const rows = await fetchReturnsTabData(fetchMock as never, "warehouse");

    expect(rows).toEqual([{ requestCode: "REQ-001", shopName: "Shop A" }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/orders/returns?tab=warehouse");
  });

  it("fetches lightweight summary counts for return tabs", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { partial: 12, full: 7, warehouse: 5 },
      }),
    });

    const summary = await fetchReturnsSummary(fetchMock as never);

    expect(summary).toEqual({ partial: 12, full: 7, warehouse: 5 });
    expect(fetchMock).toHaveBeenCalledWith("/api/orders/returns/summary");
  });

  it("does not refetch a tab when cached data already exists", () => {
    const state = createEmptyReturnsTabData();
    state.partial = [{ requestCode: "REQ-001" } as never];

    expect(shouldFetchReturnsTab(state, "partial")).toBe(false);
    expect(shouldFetchReturnsTab(state, "warehouse")).toBe(true);
    expect(shouldFetchReturnsTab(state, "partial", true)).toBe(true);
  });

  it("invalidates only the tabs that need to refresh", () => {
    const next = invalidateReturnsTabs(
      {
        partial: [{ requestCode: "REQ-001" } as never],
        full: [{ requestCode: "REQ-002" } as never],
        warehouse: [{ requestCode: "REQ-003" } as never],
      },
      ["partial", "warehouse"],
    );

    expect(next.partial).toBeNull();
    expect(next.full).toEqual([{ requestCode: "REQ-002" }]);
    expect(next.warehouse).toBeNull();
  });

  it("collects unique sorted shop names from loaded tabs", () => {
    const names = getReturnShopNames({
      partial: [
        { requestCode: "REQ-001", shopName: "Shop B" } as never,
        { requestCode: "REQ-002", shopName: "Shop A" } as never,
      ],
      full: null,
      warehouse: [
        { requestCode: "REQ-003", shopName: "Shop A" } as never,
        { requestCode: "REQ-004", shopName: "Shop C" } as never,
      ],
    });

    expect(names).toEqual(["Shop A", "Shop B", "Shop C"]);
  });

  it("resolve page theo từng tab từ query string", () => {
    const searchParams = new URLSearchParams(
      "partialPage=3&fullPage=2&warehousePage=4&page=99",
    );

    expect(resolveReturnsTabPage(searchParams, "partial")).toBe(3);
    expect(resolveReturnsTabPage(searchParams, "full")).toBe(2);
    expect(resolveReturnsTabPage(searchParams, "warehouse")).toBe(4);
  });

  it("fallback về trang 1 khi page không hợp lệ", () => {
    const searchParams = new URLSearchParams(
      "partialPage=0&fullPage=-2&warehousePage=abc",
    );

    expect(resolveReturnsTabPage(searchParams, "partial")).toBe(1);
    expect(resolveReturnsTabPage(searchParams, "full")).toBe(1);
    expect(resolveReturnsTabPage(searchParams, "warehouse")).toBe(1);
  });

  it("xóa các tham số phân trang riêng của returns khi đổi bộ lọc", () => {
    const searchParams = new URLSearchParams(
      "tab=warehouse&search=abc&partialPage=3&fullPage=2&warehousePage=7&page=5",
    );

    clearReturnsPaginationParams(searchParams);

    expect(searchParams.get("tab")).toBe("warehouse");
    expect(searchParams.get("search")).toBe("abc");
    expect(searchParams.has("partialPage")).toBe(false);
    expect(searchParams.has("fullPage")).toBe(false);
    expect(searchParams.has("warehousePage")).toBe(false);
    expect(searchParams.has("page")).toBe(false);
  });
});
