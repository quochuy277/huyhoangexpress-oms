import { z } from "zod";

// Shared pagination params
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// Shared period filter
export const periodSchema = z.enum(["month", "last_month", "quarter", "half", "year", "custom"]).default("month");

// Shared date range
export const dateRangeSchema = z.object({
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

// Shared sort params
export const sortSchema = z.object({
  sortBy: z.string().default("createdTime"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Orders list params
export const ordersQuerySchema = paginationSchema.merge(sortSchema).extend({
  search: z.string().trim().optional(),
  status: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  hasNotes: z.enum(["true", "false", ""]).optional(),
  shopName: z.string().optional(),
  salesStaff: z.string().optional(),
  partialOrderType: z.enum(["Đơn toàn bộ", "Đơn một phần", ""]).optional(),
  regionGroup: z.string().optional(),
  dateField: z.enum([
    "createdTime",
    "pickupTime",
    "lastUpdated",
    "paymentConfirmDate",
    "reconciliationDate",
    "deliveredDate",
  ]).default("createdTime").optional(),
  valueField: z.enum(["codAmount", "totalFee", "carrierFee", "revenue"]).optional(),
  valueCondition: z.enum(["gt", "eq", "lt"]).optional(),
  valueAmount: z.coerce.number().min(0).optional(),
});

// Finance period params
export const financePeriodSchema = z.object({
  period: periodSchema,
  from: z.string().optional(),
  to: z.string().optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Format: YYYY-MM").optional(),
});

// Expense create/update
export const expenseSchema = z.object({
  categoryId: z.string().min(1),
  title: z.string().min(1),
  amount: z.coerce.number().positive(),
  date: z.string().min(1),
  note: z.string().nullable().optional(),
  attachmentUrl: z.string().url().nullable().optional(),
  attachmentName: z.string().nullable().optional(),
});

// Budget update
export const budgetUpdateSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  budgets: z.array(z.object({
    categoryId: z.string(),
    amount: z.coerce.number().min(0),
  })),
});

// Helper to parse search params into an object
export function parseSearchParams(searchParams: URLSearchParams): Record<string, string> {
  const obj: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}
