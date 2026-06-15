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

  it("dòng chi phí: giá trị âm giữ waterfall, Δ% tính theo độ lớn (tăng chi phí = Δ dương)", () => {
    const cur: FinancePnlData = {
      revenue: { totalFeeFromShop: 1000, totalCarrierFee: 400, netRevenue: 600 },
      claims: { customerComp: 0, carrierComp: 0, claimDiff: 0 },
      grossProfit: 600,
      operatingExpenses: [],
      totalOperatingExpenses: 250,
      netProfit: 350,
      month: "2026-06",
    };
    const prev: FinancePnlData = {
      revenue: { totalFeeFromShop: 900, totalCarrierFee: 320, netRevenue: 580 },
      claims: { customerComp: 0, carrierComp: 0, claimDiff: 0 },
      grossProfit: 580,
      operatingExpenses: [],
      totalOperatingExpenses: 200,
      netProfit: 380,
      month: "2026-05",
    };
    const { rows } = buildPnlExportRows(cur, prev);

    const carrier = rows.find((r) => r[0] === "Trừ phí NVC")!;
    expect(carrier[1]).toBe(-400); // cột số vẫn âm để cộng waterfall
    expect(carrier[2]).toBe(-320);
    expect(carrier[3]).toBe(25); // phí NVC 320→400 = +25% (không đảo dấu)

    const opex = rows.find((r) => r[0] === "Tổng chi phí vận hành")!;
    expect(opex[1]).toBe(-250);
    expect(opex[3]).toBe(25); // opex 200→250 = +25%
  });
});
