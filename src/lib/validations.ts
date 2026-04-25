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

// URL restricted to http/https protocols (blocks javascript:, data:, etc.)
const safeHttpUrl = z
  .string()
  .url()
  .refine(
    (value) => {
      try {
        const protocol = new URL(value).protocol;
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "URL phải bắt đầu bằng http(s)" },
  );

// Announcement create/update
export const announcementCreateSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề không được trống").max(200),
  content: z.string().trim().min(1, "Nội dung không được trống"),
  attachmentUrl: safeHttpUrl.nullable().optional(),
  attachmentName: z.string().trim().max(255).nullable().optional(),
  isPinned: z.boolean().optional(),
});

// Attendance PUT — status + optional note
export const attendanceUpdateSchema = z.object({
  status: z.enum(["PRESENT", "HALF_DAY", "ABSENT", "ON_LEAVE", "UNAPPROVED_LEAVE"]),
  editNote: z.string().trim().max(500).nullable().optional(),
});

// CRM prospect create (assignee + source required)
export const prospectCreateSchema = z.object({
  shopName: z.string().trim().min(1).max(200),
  source: z.enum([
    "FACEBOOK",
    "SHOPEE",
    "TIKTOK_SHOP",
    "REFERRAL",
    "DIRECT",
    "LANDING_PAGE",
    "OTHER",
  ]),
  assigneeId: z.string().min(1),
  phone: z.string().trim().max(50).nullable().optional(),
  email: z.string().trim().email().nullable().optional().or(z.literal("")),
  contactPerson: z.string().trim().max(200).nullable().optional(),
  zalo: z.string().trim().max(100).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  sourceDetail: z.string().trim().max(500).nullable().optional(),
  productType: z.string().trim().max(200).nullable().optional(),
  estimatedSize: z.enum(["SMALL", "MEDIUM", "LARGE"]).nullable().optional(),
  currentCarrier: z.string().trim().max(200).nullable().optional(),
  note: z.string().trim().max(2000).nullable().optional(),
});

// CRM prospect update — same shape, all optional
export const prospectUpdateSchema = prospectCreateSchema.partial();

// CRM shop profile update
export const shopProfileUpdateSchema = z.object({
  phone: z.string().trim().max(50).nullable().optional(),
  email: z.string().trim().email().nullable().optional().or(z.literal("")),
  contactPerson: z.string().trim().max(200).nullable().optional(),
  zalo: z.string().trim().max(100).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  internalShopNote: z.string().trim().max(2000).nullable().optional(),
  classification: z.enum(["VIP", "NORMAL", "NEW", "WARNING", "INACTIVE"]).nullable().optional().or(z.literal("")),
  startDate: z.string().nullable().optional(),
});

// Feedback submit
export const feedbackCreateSchema = z.object({
  content: z.string().trim().min(1, "Nội dung không được trống").max(5000),
});

// Finance expense category create/rename
export const expenseCategorySchema = z.object({
  name: z.string().trim().min(1, "Tên danh mục không được trống").max(100),
});

// Helper to parse search params into an object
export function parseSearchParams(searchParams: URLSearchParams): Record<string, string> {
  const obj: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}
