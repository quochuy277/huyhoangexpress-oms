import { describe, expect, it } from "vitest";
import { buildBudgetAlerts } from "@/lib/finance/alerts";
import type { FinanceBudgetSummary } from "@/lib/finance/landing";

function summary(budgets: Array<{ categoryId: string; categoryName: string; budgetAmount: number; spent: number; ratio: number }>): FinanceBudgetSummary {
  return { month: "2026-06", hasAlert: false, budgets: budgets.map((b) => ({ ...b, remaining: b.budgetAmount - b.spent })) };
}

describe("buildBudgetAlerts", () => {
  it("ratio > 100 → critical", () => {
    const a = buildBudgetAlerts(summary([{ categoryId: "c1", categoryName: "Marketing", budgetAmount: 100, spent: 110, ratio: 110 }]));
    expect(a).toHaveLength(1);
    expect(a[0].severity).toBe("critical");
    expect(a[0].id).toBe("budget:c1");
    expect(a[0].href).toBe("/finance/expenses");
  });
  it("ratio 90–100 → warning", () => {
    const a = buildBudgetAlerts(summary([{ categoryId: "c2", categoryName: "Khác", budgetAmount: 100, spent: 95, ratio: 95 }]));
    expect(a[0].severity).toBe("warning");
  });
  it("ratio ≤ 90 hoặc ngân sách 0 → bỏ qua", () => {
    expect(buildBudgetAlerts(summary([
      { categoryId: "c3", categoryName: "A", budgetAmount: 100, spent: 50, ratio: 50 },
      { categoryId: "c4", categoryName: "B", budgetAmount: 0, spent: 0, ratio: 0 },
    ]))).toEqual([]);
  });
});
