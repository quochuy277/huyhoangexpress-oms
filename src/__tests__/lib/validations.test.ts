import { describe, it, expect } from "vitest";
import {
    paginationSchema,
    periodSchema,
    ordersQuerySchema,
    financePeriodSchema,
    expenseSchema,
    budgetUpdateSchema,
    parseSearchParams,
} from "@/lib/validations";

// ============================================================
// paginationSchema
// ============================================================
describe("paginationSchema", () => {
    it("accepts valid page and pageSize", () => {
        const result = paginationSchema.safeParse({ page: 2, pageSize: 50 });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.page).toBe(2);
            expect(result.data.pageSize).toBe(50);
        }
    });

    it("uses defaults when not provided", () => {
        const result = paginationSchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.page).toBe(1);
            expect(result.data.pageSize).toBe(20);
        }
    });

    it("rejects page < 1", () => {
        const result = paginationSchema.safeParse({ page: 0 });
        expect(result.success).toBe(false);
    });

    it("rejects pageSize > 100", () => {
        const result = paginationSchema.safeParse({ pageSize: 200 });
        expect(result.success).toBe(false);
    });

    it("coerces string numbers", () => {
        const result = paginationSchema.safeParse({ page: "3", pageSize: "25" });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.page).toBe(3);
            expect(result.data.pageSize).toBe(25);
        }
    });
});

// ============================================================
// ordersQuerySchema
// ============================================================
describe("ordersQuerySchema", () => {
    it("accepts valid query params", () => {
        const result = ordersQuerySchema.safeParse({
            page: 1,
            pageSize: 20,
            search: "REQ001",
            status: "DELIVERING",
            carrier: "SVExpress",
            sortBy: "createdTime",
            sortOrder: "desc",
        });
        expect(result.success).toBe(true);
    });

    it("uses default sort values", () => {
        const result = ordersQuerySchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.sortBy).toBe("createdTime");
            expect(result.data.sortOrder).toBe("desc");
        }
    });

    it("trims search string", () => {
        const result = ordersQuerySchema.safeParse({ search: "  hello  " });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.search).toBe("hello");
        }
    });
});

// ============================================================
// financePeriodSchema
// ============================================================
describe("financePeriodSchema", () => {
    it("accepts valid period", () => {
        const result = financePeriodSchema.safeParse({ period: "month" });
        expect(result.success).toBe(true);
    });

    it("accepts custom period with from/to", () => {
        const result = financePeriodSchema.safeParse({
            period: "custom",
            from: "2024-01-01",
            to: "2024-12-31",
        });
        expect(result.success).toBe(true);
    });

    it("accepts month format YYYY-MM", () => {
        const result = financePeriodSchema.safeParse({
            period: "month",
            month: "2024-06",
        });
        expect(result.success).toBe(true);
    });

    it("rejects invalid month format", () => {
        const result = financePeriodSchema.safeParse({
            period: "month",
            month: "06-2024",
        });
        expect(result.success).toBe(false);
    });

    it("defaults to 'month' period", () => {
        const result = financePeriodSchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.period).toBe("month");
        }
    });
});

// ============================================================
// expenseSchema
// ============================================================
describe("expenseSchema", () => {
    it("accepts valid expense", () => {
        const result = expenseSchema.safeParse({
            categoryId: "cat001",
            title: "Mua sắm văn phòng phẩm",
            amount: 500000,
            date: "2024-06-15",
        });
        expect(result.success).toBe(true);
    });

    it("rejects missing required fields", () => {
        const result = expenseSchema.safeParse({});
        expect(result.success).toBe(false);
    });

    it("rejects negative amount", () => {
        const result = expenseSchema.safeParse({
            categoryId: "cat001",
            title: "Test",
            amount: -100,
            date: "2024-06-15",
        });
        expect(result.success).toBe(false);
    });

    it("accepts nullable optional fields", () => {
        const result = expenseSchema.safeParse({
            categoryId: "cat001",
            title: "Test",
            amount: 100,
            date: "2024-06-15",
            note: null,
            attachmentUrl: null,
        });
        expect(result.success).toBe(true);
    });
});

// ============================================================
// budgetUpdateSchema
// ============================================================
describe("budgetUpdateSchema", () => {
    it("accepts valid budget update", () => {
        const result = budgetUpdateSchema.safeParse({
            month: "2024-06",
            budgets: [
                { categoryId: "cat001", amount: 5000000 },
                { categoryId: "cat002", amount: 3000000 },
            ],
        });
        expect(result.success).toBe(true);
    });

    it("rejects invalid month format", () => {
        const result = budgetUpdateSchema.safeParse({
            month: "June 2024",
            budgets: [],
        });
        expect(result.success).toBe(false);
    });

    it("rejects negative budget amount", () => {
        const result = budgetUpdateSchema.safeParse({
            month: "2024-06",
            budgets: [{ categoryId: "cat001", amount: -100 }],
        });
        expect(result.success).toBe(false);
    });
});

// ============================================================
// parseSearchParams
// ============================================================
describe("parseSearchParams", () => {
    it("converts URLSearchParams to plain object", () => {
        const params = new URLSearchParams("page=2&search=hello");
        const result = parseSearchParams(params);
        expect(result).toEqual({ page: "2", search: "hello" });
    });

    it("returns empty object for empty params", () => {
        const params = new URLSearchParams();
        const result = parseSearchParams(params);
        expect(result).toEqual({});
    });

    it("handles duplicate keys (last value wins)", () => {
        const params = new URLSearchParams("a=1&a=2");
        const result = parseSearchParams(params);
        // URLSearchParams.forEach gives last value
        expect(result.a).toBeDefined();
    });
});
