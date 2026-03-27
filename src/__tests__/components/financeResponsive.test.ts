import { describe, expect, test } from "vitest";
import {
  buildBudgetSummary,
  buildCarrierSummary,
  buildCashbookTransactionSummary,
  buildExpenseSummary,
  buildNegativeRevenueSummary,
  buildPnlSections,
  buildShopPayoutSummary,
  buildShopSummary,
  shouldUseMobileCards,
} from "@/components/finance/financeResponsive";

describe("financeResponsive", () => {
  test("returns mobile card mode below tablet breakpoint", () => {
    expect(shouldUseMobileCards(375)).toBe(true);
    expect(shouldUseMobileCards(767)).toBe(true);
    expect(shouldUseMobileCards(768)).toBe(false);
  });

  test("builds expense summary with stable primary fields", () => {
    expect(
      buildExpenseSummary({
        id: "exp-1",
        title: "Quang cao",
        amount: 1250000,
        note: "Meta",
        date: "2026-03-20T00:00:00.000Z",
        category: { name: "Marketing" },
      }),
    ).toMatchObject({
      title: "Quang cao",
      categoryName: "Marketing",
      amountLabel: "1.250.000đ",
      noteLabel: "Meta",
    });
  });

  test("builds budget summary with ratio and state labels", () => {
    expect(
      buildBudgetSummary({
        categoryId: "cat-1",
        categoryName: "Van hanh",
        budgetAmount: 5000000,
        spent: 4600000,
        remaining: 400000,
        ratio: 92,
      }),
    ).toMatchObject({
      categoryName: "Van hanh",
      ratioLabel: "92%",
      statusTone: "danger",
    });
  });

  test("builds pnl sections for accordion mobile view", () => {
    expect(
      buildPnlSections({
        revenue: {
          totalFeeFromShop: 1000000,
          totalCarrierFee: 300000,
          netRevenue: 700000,
        },
        claims: {
          customerComp: 120000,
          carrierComp: 20000,
          claimDiff: -100000,
        },
        grossProfit: 600000,
        operatingExpenses: [{ name: "Luong", total: 150000 }],
        totalOperatingExpenses: 150000,
        netProfit: 450000,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "revenue", title: "Doanh thu" }),
        expect.objectContaining({ key: "netProfit", title: "Loi nhuan" }),
      ]),
    );
  });

  test("builds carrier summary card data", () => {
    expect(
      buildCarrierSummary({
        carrier: "GHN",
        orderCount: 12,
        revenue: 1500000,
        margin: 11,
        negativeCount: 1,
        codTotal: 2200000,
      }),
    ).toMatchObject({
      title: "GHN",
      revenueLabel: "1.500.000đ",
      marginLabel: "11%",
    });
  });

  test("builds shop summary card data", () => {
    expect(
      buildShopSummary({
        shop: "Shop A",
        total: 32,
        revenue: 4200000,
        deliveryRate: 88,
        returnRate: 7,
        codTotal: 8000000,
        avgFee: 130000,
      }),
    ).toMatchObject({
      title: "Shop A",
      revenueLabel: "4.200.000đ",
      deliveryRateLabel: "88%",
    });
  });

  test("builds negative revenue summary card data", () => {
    expect(
      buildNegativeRevenueSummary({
        requestCode: "REQ01",
        carrierName: "GHN",
        creatorShopName: "Shop A",
        status: "RETURNED",
        revenue: -120000,
        codAmount: 200000,
        regionGroup: "HN",
      }),
    ).toMatchObject({
      title: "REQ01",
      revenueLabel: "-120.000đ",
      codLabel: "200.000đ",
    });
  });

  test("builds cashbook transaction summary with signed amount", () => {
    expect(
      buildCashbookTransactionSummary({
        id: "tx-1",
        transactionTime: "2026-03-20T08:30:00.000Z",
        receiptCode: "PT001",
        content: "Thu COD",
        amount: 350000,
        balance: 8100000,
        groupType: "COD",
      }),
    ).toMatchObject({
      receiptCode: "PT001",
      amountLabel: "+350.000đ",
      balanceLabel: "8.100.000đ",
      groupLabel: "COD",
    });
  });

  test("builds shop payout mobile card summary", () => {
    expect(
      buildShopPayoutSummary({
        shop: "Shop A",
        count: 3,
        total: 5000000,
        fee: 35000,
        lastDate: "2026-03-25T00:00:00.000Z",
      }),
    ).toMatchObject({
      title: "Shop A",
      totalLabel: "5.000.000đ",
      feeLabel: "35.000đ",
    });
  });
});
