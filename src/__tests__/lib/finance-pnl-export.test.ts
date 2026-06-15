import { describe, expect, it } from "vitest";
import { buildPnlExportRows } from "@/lib/finance/pnl-export";
import type { FinancePnlData } from "@/lib/finance/landing";

const pnl = (net: number): FinancePnlData => ({
  revenue: { totalFeeFromShop: 1000, totalCarrierFee: 300, netRevenue: 700 },
  claims: { customerComp: 0, carrierComp: 0, claimDiff: 0 },
  grossProfit: 700,
  operatingExpenses: [],
  totalOperatingExpenses: 200,
  netProfit: net,
  month: "2026-06",
});

describe("buildPnlExportRows", () => {
  it("2 cột khi không so sánh", () => {
    const { headers, rows } = buildPnlExportRows(pnl(500));
    expect(headers).toEqual(["Khoản mục", "Số tiền"]);
    expect(rows[0]).toEqual(["Tổng phí thu từ shop", 1000]);
    expect(rows[rows.length - 1]).toEqual(["LỢI NHUẬN RÒNG", 500]);
  });
  it("4 cột + Δ% khi có previous", () => {
    const { headers, rows } = buildPnlExportRows(pnl(550), pnl(500));
    expect(headers).toEqual(["Khoản mục", "Kỳ này", "Kỳ trước", "Δ%"]);
    const last = rows[rows.length - 1];
    expect(last[0]).toBe("LỢI NHUẬN RÒNG");
    expect(last[1]).toBe(550);
    expect(last[2]).toBe(500);
    expect(last[3]).toBe(10);
  });
});
