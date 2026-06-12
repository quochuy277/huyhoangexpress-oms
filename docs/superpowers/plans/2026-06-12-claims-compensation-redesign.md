# Claims Compensation Tab Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tái cấu trúc tab "Tổng hợp đền bù" của trang Claims: bộ lọc thời gian + cửa hàng, 7 thẻ số liệu định nghĩa thuần theo `claimStatus`, bảng "Chi tiết đền bù theo cửa hàng" kèm modal drill-down theo từng đơn, 2 biểu đồ chạy theo bộ lọc.

**Spec:** `docs/superpowers/specs/2026-06-12-claims-compensation-redesign-design.md`

**Architecture:** Logic tổng hợp được tách ra lib thuần (`src/lib/claims-compensation.ts`) để unit-test không cần mock Prisma. API `/api/claims/compensation` rút về một `findMany` duy nhất rồi gọi helper. Endpoint mới `/api/claims/compensation/details` phân trang theo shop. UI tách thành 3 file: filter bar, modal chi tiết, và tab chính.

**Tech Stack:** Next.js App Router, Prisma, TanStack React Query, Recharts, SheetJS (`xlsx`, dynamic import phía client), Vitest.

**Branch:** tạo nhánh `feature/claims-compensation-redesign` từ `main` trước khi bắt đầu (`git checkout -b feature/claims-compensation-redesign`).

**Quy ước quan trọng của codebase:**
- Mọi chuỗi hiển thị là tiếng Việt có dấu, file phải lưu UTF-8 (có test chống mojibake quét một số file claims).
- Style: inline `style={}` + một ít class Tailwind cho badge, theo đúng các file claims hiện có.
- Test chạy bằng `npx vitest run <file>` (PowerShell). Lint: `npm run lint`. Typecheck: `npx tsc --noEmit`.
- Commit message tiếng Anh, prefix `feat:`/`test:`/`refactor:` như lịch sử repo.

**Định nghĩa số liệu (từ spec, dùng xuyên suốt):**
- `COMPLETION_STATUSES` (có sẵn trong `src/lib/claims-config.ts`) = `RESOLVED`, `CUSTOMER_COMPENSATED`, `CUSTOMER_REJECTED`.
- **Đang xử lý** = `claimStatus` KHÔNG thuộc `COMPLETION_STATUSES`.
- **Chờ đền bù** = `claimStatus` thuộc `CARRIER_COMPENSATED` | `CARRIER_REJECTED` (tập con của Đang xử lý).
- **Tổng tiền đền bù** (`customerTotal`) = tổng `customerCompensation` của đơn `CUSTOMER_COMPENSATED`.
- **Tiền NVC đền bù** (`carrierTotal`) = tổng `carrierCompensation` của đơn `CARRIER_COMPENSATED`.
- **Chênh lệch** = `carrierTotal − customerTotal`.
- Cờ `isCompleted` KHÔNG tham gia bất kỳ số liệu nào.

---

## File Structure

| File | Vai trò |
|---|---|
| Create: `src/lib/claims-compensation.ts` | Helper thuần: parse khoảng ngày, bucket tháng, tổng hợp summary/shops/monthly/issue từ 1 mảng claim |
| Create: `src/__tests__/lib/claims-compensation.test.ts` | Unit test cho helper trên |
| Modify: `src/lib/claims-permissions.ts` | Thêm `canAccessCompensation()` dùng chung cho 3 route |
| Create: `src/__tests__/lib/claims-permissions.test.ts` | Unit test cho `canAccessCompensation` |
| Rewrite: `src/app/api/claims/compensation/route.ts` | 1 `findMany` + gọi helper; nhận `dateFrom/dateTo/shopName`, bỏ `period` |
| Rewrite: `src/__tests__/app/api/claims-compensation-route.test.ts` | Test route theo tham số và shape mới |
| Create: `src/app/api/claims/compensation/details/route.ts` | Endpoint phân trang đơn theo shop |
| Create: `src/__tests__/app/api/claims-compensation-details-route.test.ts` | Test endpoint details |
| Modify: `src/app/api/claims/filter-options/route.ts` | Nới quyền: `canViewClaims` HOẶC `canAccessCompensation` |
| Modify: `src/__tests__/app/api/claims-route-permissions.test.ts` | Thêm case user chỉ có quyền compensation vẫn đọc được filter-options |
| Create: `src/components/claims/compensation/CompensationFilterBar.tsx` | Preset thời gian + custom từ/đến ngày + dropdown shop |
| Create: `src/__tests__/components/compensationFilterBar.test.ts` | Unit test `getPresetRange` / `createDefaultCompensationFilters` |
| Create: `src/components/claims/compensation/ShopClaimsDetailModal.tsx` | Modal drill-down phân trang |
| Rewrite: `src/components/claims/ClaimsCompensationTab.tsx` | 7 thẻ, bảng shop mới + hàng tổng + export XLSX, 2 biểu đồ theo filter |

Không đổi: schema DB, `ClaimsPageWrapper`, tab 1, tab 2, `claimsResponsive.ts` (giữ nguyên tên class `claims-compensation-shop-table` / `claims-compensation-shop-cards` nên test responsive hiện có vẫn pass).

---

### Task 1: Lib tổng hợp `claims-compensation.ts`

**Files:**
- Create: `src/lib/claims-compensation.ts`
- Test: `src/__tests__/lib/claims-compensation.test.ts`

- [ ] **Step 1: Viết test fail**

Tạo `src/__tests__/lib/claims-compensation.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  buildMonthlyBuckets,
  resolveCompensationRange,
  summarizeCompensationClaims,
  type CompensationClaimRow,
} from "@/lib/claims-compensation";

const NOW = new Date(2026, 5, 12, 10, 0, 0); // 12/06/2026 10:00 local

function makeClaim(overrides: Partial<CompensationClaimRow> = {}): CompensationClaimRow {
  return {
    claimStatus: "PENDING",
    carrierCompensation: 0,
    customerCompensation: 0,
    detectedDate: new Date(2026, 2, 15),
    issueType: "LOST",
    shopName: "Shop A",
    ...overrides,
  };
}

describe("resolveCompensationRange", () => {
  it("defaults to year-to-date (1/1 -> end of today)", () => {
    const range = resolveCompensationRange({}, NOW);

    expect(range.from).toEqual(new Date(2026, 0, 1));
    expect(range.to).toEqual(new Date(2026, 5, 12, 23, 59, 59, 999));
  });

  it("parses explicit range and includes the whole dateTo day", () => {
    const range = resolveCompensationRange({ dateFrom: "2026-02-01", dateTo: "2026-02-28" }, NOW);

    expect(range.from).toEqual(new Date(2026, 1, 1));
    expect(range.to).toEqual(new Date(2026, 1, 28, 23, 59, 59, 999));
  });

  it("falls back to default when values are invalid or inverted", () => {
    const invalid = resolveCompensationRange({ dateFrom: "not-a-date", dateTo: "also-bad" }, NOW);
    expect(invalid.from).toEqual(new Date(2026, 0, 1));
    expect(invalid.to).toEqual(new Date(2026, 5, 12, 23, 59, 59, 999));

    const inverted = resolveCompensationRange({ dateFrom: "2026-05-10", dateTo: "2026-05-01" }, NOW);
    expect(inverted.from).toEqual(new Date(2026, 0, 1));
  });
});

describe("buildMonthlyBuckets", () => {
  it("spans months across a year boundary", () => {
    const buckets = buildMonthlyBuckets({
      from: new Date(2025, 10, 5),
      to: new Date(2026, 1, 20),
    });

    expect(buckets).toEqual(["11/2025", "12/2025", "01/2026", "02/2026"]);
  });
});

describe("summarizeCompensationClaims", () => {
  const range = { from: new Date(2026, 0, 1), to: new Date(2026, 2, 31, 23, 59, 59, 999) };

  it("partitions counts by claimStatus and sums both money directions", () => {
    const { summary } = summarizeCompensationClaims([
      makeClaim({ claimStatus: "PENDING" }),
      makeClaim({ claimStatus: "RESOLVED" }),
      makeClaim({ claimStatus: "CARRIER_COMPENSATED", carrierCompensation: 100000 }),
      makeClaim({ claimStatus: "CARRIER_REJECTED" }),
      makeClaim({ claimStatus: "CUSTOMER_COMPENSATED", customerCompensation: 60000 }),
      makeClaim({ claimStatus: "CUSTOMER_REJECTED" }),
    ], range);

    expect(summary).toEqual({
      totalClaims: 6,
      processingCount: 3,
      customerCompensatedCount: 1,
      customerRejectedCount: 1,
      pendingCount: 2,
      carrierTotal: 100000,
      customerTotal: 60000,
      difference: 40000,
    });
  });

  it("groups shop rows sorted by total claims desc", () => {
    const { shops } = summarizeCompensationClaims([
      makeClaim({ shopName: "Shop B" }),
      makeClaim({ shopName: "Shop A", claimStatus: "CUSTOMER_COMPENSATED", customerCompensation: 30000 }),
      makeClaim({ shopName: "Shop A", claimStatus: "CARRIER_COMPENSATED", carrierCompensation: 50000 }),
    ], range);

    expect(shops[0]).toEqual({
      shopName: "Shop A",
      totalClaims: 2,
      processing: 1,
      compensated: 1,
      rejected: 0,
      pending: 1,
      totalPaid: 30000,
    });
    expect(shops[1].shopName).toBe("Shop B");
  });

  it("zero-fills monthly buckets and issue types without claims", () => {
    const { monthlyData, issueDistribution } = summarizeCompensationClaims([
      makeClaim({
        claimStatus: "CUSTOMER_COMPENSATED",
        customerCompensation: 20000,
        detectedDate: new Date(2026, 1, 10),
      }),
    ], range);

    expect(monthlyData).toEqual([
      { month: "01/2026", carrier: 0, customer: 0 },
      { month: "02/2026", carrier: 0, customer: 20000 },
      { month: "03/2026", carrier: 0, customer: 0 },
    ]);

    expect(issueDistribution.find((entry) => entry.type === "LOST")?.count).toBe(1);
    expect(issueDistribution.find((entry) => entry.type === "DAMAGED")?.count).toBe(0);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npx vitest run src/__tests__/lib/claims-compensation.test.ts`
Expected: FAIL — `Cannot find module '@/lib/claims-compensation'` (hoặc tương đương).

- [ ] **Step 3: Viết implementation**

Tạo `src/lib/claims-compensation.ts`:

```ts
import { COMPLETION_STATUSES, ISSUE_TYPE_CONFIG } from "@/lib/claims-config";

export const PENDING_COMPENSATION_STATUSES: readonly string[] = [
  "CARRIER_COMPENSATED",
  "CARRIER_REJECTED",
];

const COMPLETION_STATUS_SET = new Set<string>(COMPLETION_STATUSES);

export type CompensationClaimRow = {
  claimStatus: string;
  carrierCompensation: number;
  customerCompensation: number;
  detectedDate: Date;
  issueType: string;
  shopName: string;
};

export type CompensationRange = {
  from: Date;
  to: Date;
};

export type CompensationSummary = {
  totalClaims: number;
  processingCount: number;
  customerCompensatedCount: number;
  customerRejectedCount: number;
  pendingCount: number;
  carrierTotal: number;
  customerTotal: number;
  difference: number;
};

export type CompensationShopRow = {
  shopName: string;
  totalClaims: number;
  processing: number;
  compensated: number;
  rejected: number;
  pending: number;
  totalPaid: number;
};

function parseDateParam(value?: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function resolveCompensationRange(
  params: { dateFrom?: string | null; dateTo?: string | null },
  now = new Date(),
): CompensationRange {
  const defaultRange: CompensationRange = {
    from: new Date(now.getFullYear(), 0, 1),
    to: endOfDay(now),
  };

  const from = parseDateParam(params.dateFrom) ?? defaultRange.from;
  const toBase = parseDateParam(params.dateTo);
  const to = toBase ? endOfDay(toBase) : defaultRange.to;

  if (from.getTime() > to.getTime()) {
    return defaultRange;
  }

  return { from, to };
}

function monthKeyOf(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

export function buildMonthlyBuckets(range: CompensationRange): string[] {
  const buckets: string[] = [];
  const cursor = new Date(range.from.getFullYear(), range.from.getMonth(), 1);
  const last = new Date(range.to.getFullYear(), range.to.getMonth(), 1);

  while (cursor.getTime() <= last.getTime()) {
    buckets.push(monthKeyOf(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return buckets;
}

export function summarizeCompensationClaims(claims: CompensationClaimRow[], range: CompensationRange) {
  const summary: CompensationSummary = {
    totalClaims: 0,
    processingCount: 0,
    customerCompensatedCount: 0,
    customerRejectedCount: 0,
    pendingCount: 0,
    carrierTotal: 0,
    customerTotal: 0,
    difference: 0,
  };

  const shopMap = new Map<string, CompensationShopRow>();
  const monthlyTotals = new Map<string, { carrier: number; customer: number }>();
  const issueCounts = new Map<string, number>();

  for (const claim of claims) {
    summary.totalClaims++;

    const isProcessing = !COMPLETION_STATUS_SET.has(claim.claimStatus);
    const isPending = PENDING_COMPENSATION_STATUSES.includes(claim.claimStatus);
    const isCompensated = claim.claimStatus === "CUSTOMER_COMPENSATED";
    const isRejected = claim.claimStatus === "CUSTOMER_REJECTED";
    const isCarrierCompensated = claim.claimStatus === "CARRIER_COMPENSATED";

    if (isProcessing) summary.processingCount++;
    if (isPending) summary.pendingCount++;
    if (isCompensated) {
      summary.customerCompensatedCount++;
      summary.customerTotal += claim.customerCompensation;
    }
    if (isRejected) summary.customerRejectedCount++;
    if (isCarrierCompensated) summary.carrierTotal += claim.carrierCompensation;

    let shop = shopMap.get(claim.shopName);
    if (!shop) {
      shop = {
        shopName: claim.shopName,
        totalClaims: 0,
        processing: 0,
        compensated: 0,
        rejected: 0,
        pending: 0,
        totalPaid: 0,
      };
      shopMap.set(claim.shopName, shop);
    }
    shop.totalClaims++;
    if (isProcessing) shop.processing++;
    if (isPending) shop.pending++;
    if (isCompensated) {
      shop.compensated++;
      shop.totalPaid += claim.customerCompensation;
    }
    if (isRejected) shop.rejected++;

    const monthKey = monthKeyOf(claim.detectedDate);
    const monthTotals = monthlyTotals.get(monthKey) ?? { carrier: 0, customer: 0 };
    if (isCarrierCompensated) monthTotals.carrier += claim.carrierCompensation;
    if (isCompensated) monthTotals.customer += claim.customerCompensation;
    monthlyTotals.set(monthKey, monthTotals);

    issueCounts.set(claim.issueType, (issueCounts.get(claim.issueType) ?? 0) + 1);
  }

  summary.difference = summary.carrierTotal - summary.customerTotal;

  const shops = [...shopMap.values()].sort((a, b) => b.totalClaims - a.totalClaims);

  const monthlyData = buildMonthlyBuckets(range).map((month) => ({
    month,
    carrier: monthlyTotals.get(month)?.carrier ?? 0,
    customer: monthlyTotals.get(month)?.customer ?? 0,
  }));

  const issueDistribution = Object.entries(ISSUE_TYPE_CONFIG).map(([type, config]) => ({
    type,
    label: config.label,
    count: issueCounts.get(type) ?? 0,
    color: config.color,
  }));

  return { summary, shops, monthlyData, issueDistribution };
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npx vitest run src/__tests__/lib/claims-compensation.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/claims-compensation.ts src/__tests__/lib/claims-compensation.test.ts
git commit -m "feat: add claims compensation aggregation helpers"
```

---

### Task 2: Helper quyền `canAccessCompensation`

**Files:**
- Modify: `src/lib/claims-permissions.ts`
- Test: `src/__tests__/lib/claims-permissions.test.ts` (mới)

- [ ] **Step 1: Viết test fail**

Tạo `src/__tests__/lib/claims-permissions.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { canAccessCompensation } from "@/lib/claims-permissions";

describe("canAccessCompensation", () => {
  it("allows ADMIN regardless of permissions", () => {
    expect(canAccessCompensation({ role: "ADMIN", permissions: null })).toBe(true);
  });

  it("allows canViewCompensation or canViewFinancePage", () => {
    expect(canAccessCompensation({
      role: "STAFF",
      permissions: { canViewCompensation: true } as never,
    })).toBe(true);
    expect(canAccessCompensation({
      role: "STAFF",
      permissions: { canViewFinancePage: true } as never,
    })).toBe(true);
  });

  it("denies users without either permission", () => {
    expect(canAccessCompensation({
      role: "STAFF",
      permissions: { canViewClaims: true } as never,
    })).toBe(false);
    expect(canAccessCompensation(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npx vitest run src/__tests__/lib/claims-permissions.test.ts`
Expected: FAIL — `canAccessCompensation` is not exported.

- [ ] **Step 3: Implementation**

Trong `src/lib/claims-permissions.ts`, thêm export mới vào CUỐI file (không sửa code hiện có — chuỗi "Không có quyền" phải giữ nguyên vì test text-encoding quét file này):

```ts
export function canAccessCompensation(user: ClaimsUser) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return Boolean(
    user.permissions?.canViewCompensation || user.permissions?.canViewFinancePage,
  );
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npx vitest run src/__tests__/lib/claims-permissions.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/claims-permissions.ts src/__tests__/lib/claims-permissions.test.ts
git commit -m "feat: add shared canAccessCompensation permission helper"
```

---

### Task 3: Viết lại route `/api/claims/compensation`

**Files:**
- Rewrite: `src/app/api/claims/compensation/route.ts`
- Rewrite: `src/__tests__/app/api/claims-compensation-route.test.ts`

- [ ] **Step 1: Viết lại test (fail trước)**

Thay TOÀN BỘ nội dung `src/__tests__/app/api/claims-compensation-route.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    claimOrder: {
      findMany: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function makeSession(overrides: Record<string, boolean> = {}) {
  return {
    user: {
      id: "user-1",
      name: "Tester",
      role: "STAFF",
      permissions: {
        canViewClaims: false,
        canViewCompensation: true,
        canViewFinancePage: false,
        ...overrides,
      },
    },
  };
}

describe("claims compensation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.claimOrder.findMany).mockResolvedValue([] as never);
  });

  it("rejects when user lacks compensation and finance permissions", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession({ canViewCompensation: false }) as never);
    const { GET } = await import("@/app/api/claims/compensation/route");

    const response = await GET(
      new NextRequest("http://localhost/api/claims/compensation", { method: "GET" }),
    );

    expect(response.status).toBe(403);
    expect(prisma.claimOrder.findMany).not.toHaveBeenCalled();
  });

  it("filters by explicit date range and shop", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    const { GET } = await import("@/app/api/claims/compensation/route");

    await GET(new NextRequest(
      "http://localhost/api/claims/compensation?dateFrom=2026-02-01&dateTo=2026-02-28&shopName=Shop%20A",
      { method: "GET" },
    ));

    expect(prisma.claimOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        detectedDate: {
          gte: new Date(2026, 1, 1),
          lte: new Date(2026, 1, 28, 23, 59, 59, 999),
        },
        order: { shopName: "Shop A" },
      }),
    }));
  });

  it("returns summary, shops, monthly data, and issue distribution", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    vi.mocked(prisma.claimOrder.findMany).mockResolvedValue([
      {
        claimStatus: "CUSTOMER_COMPENSATED",
        carrierCompensation: 0,
        customerCompensation: 50000,
        detectedDate: new Date(2026, 1, 10),
        issueType: "LOST",
        order: { shopName: "Shop A" },
      },
      {
        claimStatus: "CARRIER_COMPENSATED",
        carrierCompensation: 100000,
        customerCompensation: 0,
        detectedDate: new Date(2026, 1, 12),
        issueType: "LOST",
        order: { shopName: "Shop A" },
      },
    ] as never);

    const { GET } = await import("@/app/api/claims/compensation/route");
    const response = await GET(new NextRequest(
      "http://localhost/api/claims/compensation?dateFrom=2026-02-01&dateTo=2026-02-28",
      { method: "GET" },
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary).toMatchObject({
      totalClaims: 2,
      processingCount: 1,
      customerCompensatedCount: 1,
      customerRejectedCount: 0,
      pendingCount: 1,
      carrierTotal: 100000,
      customerTotal: 50000,
      difference: 50000,
    });
    expect(body.shops).toEqual([
      expect.objectContaining({
        shopName: "Shop A",
        totalClaims: 2,
        processing: 1,
        compensated: 1,
        rejected: 0,
        pending: 1,
        totalPaid: 50000,
      }),
    ]);
    expect(body.monthlyData).toEqual([
      { month: "02/2026", carrier: 100000, customer: 50000 },
    ]);
    expect(body.issueDistribution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "LOST", count: 2 }),
      ]),
    );
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npx vitest run src/__tests__/app/api/claims-compensation-route.test.ts`
Expected: FAIL — route cũ còn gọi `aggregate`/`$queryRaw` (mock không có) hoặc trả shape cũ.

- [ ] **Step 3: Viết lại route**

Thay TOÀN BỘ nội dung `src/app/api/claims/compensation/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  resolveCompensationRange,
  summarizeCompensationClaims,
  type CompensationClaimRow,
} from "@/lib/claims-compensation";
import { canAccessCompensation } from "@/lib/claims-permissions";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  if (!canAccessCompensation(session.user)) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const searchParams = new URL(req.url).searchParams;
  const range = resolveCompensationRange({
    dateFrom: searchParams.get("dateFrom"),
    dateTo: searchParams.get("dateTo"),
  });
  const shopName = searchParams.get("shopName") || "";

  try {
    const rows = await prisma.claimOrder.findMany({
      where: {
        detectedDate: { gte: range.from, lte: range.to },
        ...(shopName ? { order: { shopName } } : {}),
      },
      select: {
        claimStatus: true,
        carrierCompensation: true,
        customerCompensation: true,
        detectedDate: true,
        issueType: true,
        order: { select: { shopName: true } },
      },
    });

    const claims: CompensationClaimRow[] = rows.map((row) => ({
      claimStatus: row.claimStatus,
      carrierCompensation: Number(row.carrierCompensation || 0),
      customerCompensation: Number(row.customerCompensation || 0),
      detectedDate: row.detectedDate,
      issueType: row.issueType,
      shopName: row.order?.shopName || "Không rõ",
    }));

    return NextResponse.json(summarizeCompensationClaims(claims, range));
  } catch (error) {
    logger.error("GET /api/claims/compensation", "Error", error);
    return NextResponse.json({ error: "Lỗi truy vấn" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npx vitest run src/__tests__/app/api/claims-compensation-route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/claims/compensation/route.ts src/__tests__/app/api/claims-compensation-route.test.ts
git commit -m "feat: rebuild compensation API around date range, shop filter, and single query"
```

---

### Task 4: Endpoint mới `/api/claims/compensation/details`

**Files:**
- Create: `src/app/api/claims/compensation/details/route.ts`
- Test: `src/__tests__/app/api/claims-compensation-details-route.test.ts`

- [ ] **Step 1: Viết test fail**

Tạo `src/__tests__/app/api/claims-compensation-details-route.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    claimOrder: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function makeSession(overrides: Record<string, boolean> = {}) {
  return {
    user: {
      id: "user-1",
      name: "Tester",
      role: "STAFF",
      permissions: {
        canViewClaims: false,
        canViewCompensation: true,
        canViewFinancePage: false,
        ...overrides,
      },
    },
  };
}

describe("claims compensation details route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.claimOrder.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.claimOrder.findMany).mockResolvedValue([] as never);
  });

  it("rejects unauthenticated requests", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const { GET } = await import("@/app/api/claims/compensation/details/route");

    const response = await GET(new NextRequest(
      "http://localhost/api/claims/compensation/details?shopName=Shop%20A",
      { method: "GET" },
    ));

    expect(response.status).toBe(401);
  });

  it("rejects users without compensation access", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession({ canViewCompensation: false }) as never);
    const { GET } = await import("@/app/api/claims/compensation/details/route");

    const response = await GET(new NextRequest(
      "http://localhost/api/claims/compensation/details?shopName=Shop%20A",
      { method: "GET" },
    ));

    expect(response.status).toBe(403);
    expect(prisma.claimOrder.findMany).not.toHaveBeenCalled();
  });

  it("requires shopName", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    const { GET } = await import("@/app/api/claims/compensation/details/route");

    const response = await GET(new NextRequest(
      "http://localhost/api/claims/compensation/details",
      { method: "GET" },
    ));

    expect(response.status).toBe(400);
  });

  it("paginates and maps claim rows", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    vi.mocked(prisma.claimOrder.count).mockResolvedValue(45 as never);
    vi.mocked(prisma.claimOrder.findMany).mockResolvedValue([
      {
        id: "claim-1",
        claimStatus: "CUSTOMER_COMPENSATED",
        issueType: "LOST",
        detectedDate: new Date(2026, 1, 10),
        carrierCompensation: 100000,
        customerCompensation: 50000,
        order: { requestCode: "YC123" },
      },
    ] as never);

    const { GET } = await import("@/app/api/claims/compensation/details/route");
    const response = await GET(new NextRequest(
      "http://localhost/api/claims/compensation/details?shopName=Shop%20A&dateFrom=2026-01-01&dateTo=2026-03-31&page=2",
      { method: "GET" },
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.claimOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        order: { shopName: "Shop A" },
      }),
      orderBy: { detectedDate: "desc" },
      skip: 20,
      take: 20,
    }));
    expect(body.claims).toEqual([
      expect.objectContaining({
        id: "claim-1",
        requestCode: "YC123",
        claimStatus: "CUSTOMER_COMPENSATED",
        issueType: "LOST",
        carrierCompensation: 100000,
        customerCompensation: 50000,
      }),
    ]);
    expect(body.pagination).toEqual({ page: 2, pageSize: 20, total: 45 });
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npx vitest run src/__tests__/app/api/claims-compensation-details-route.test.ts`
Expected: FAIL — module route chưa tồn tại.

- [ ] **Step 3: Implementation**

Tạo `src/app/api/claims/compensation/details/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveCompensationRange } from "@/lib/claims-compensation";
import { canAccessCompensation } from "@/lib/claims-permissions";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  if (!canAccessCompensation(session.user)) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const searchParams = new URL(req.url).searchParams;
  const shopName = searchParams.get("shopName");
  if (!shopName) {
    return NextResponse.json({ error: "Thiếu tên cửa hàng" }, { status: 400 });
  }

  const range = resolveCompensationRange({
    dateFrom: searchParams.get("dateFrom"),
    dateTo: searchParams.get("dateTo"),
  });
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE),
  );

  const where = {
    detectedDate: { gte: range.from, lte: range.to },
    order: { shopName },
  };

  try {
    const [total, rows] = await Promise.all([
      prisma.claimOrder.count({ where }),
      prisma.claimOrder.findMany({
        where,
        select: {
          id: true,
          claimStatus: true,
          issueType: true,
          detectedDate: true,
          carrierCompensation: true,
          customerCompensation: true,
          order: { select: { requestCode: true } },
        },
        orderBy: { detectedDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      claims: rows.map((row) => ({
        id: row.id,
        requestCode: row.order?.requestCode || "—",
        detectedDate: row.detectedDate,
        issueType: row.issueType,
        claimStatus: row.claimStatus,
        carrierCompensation: Number(row.carrierCompensation || 0),
        customerCompensation: Number(row.customerCompensation || 0),
      })),
      pagination: { page, pageSize, total },
    });
  } catch (error) {
    logger.error("GET /api/claims/compensation/details", "Error", error);
    return NextResponse.json({ error: "Lỗi truy vấn" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npx vitest run src/__tests__/app/api/claims-compensation-details-route.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/claims/compensation/details/route.ts src/__tests__/app/api/claims-compensation-details-route.test.ts
git commit -m "feat: add paginated per-shop compensation details endpoint"
```

---

### Task 5: Nới quyền route `/api/claims/filter-options`

Lý do: tab đền bù mở cho `canViewCompensation || canViewFinancePage`, nhưng route filter-options hiện đòi `canViewClaims` → user tài chính thuần sẽ bị 403 khi tải dropdown cửa hàng.

**Files:**
- Modify: `src/app/api/claims/filter-options/route.ts`
- Modify: `src/__tests__/app/api/claims-route-permissions.test.ts`

- [ ] **Step 1: Thêm test case (fail trước)**

Trong `src/__tests__/app/api/claims-route-permissions.test.ts`, thêm test này NGAY SAU test `"returns distinct filter options from claim rows only"` (cùng `describe` block, dùng lại `makeSession`, `clearClaimsFilterOptionsCache` đã import sẵn trong file):

```ts
  it("allows compensation viewers to read filter options without canViewClaims", async () => {
    clearClaimsFilterOptionsCache();
    vi.mocked(auth).mockResolvedValue(
      makeSession({ canViewClaims: false, canViewCompensation: true }) as never,
    );
    vi.mocked(prisma.claimOrder.findMany).mockResolvedValueOnce([
      { order: { shopName: "Shop A", status: "DELIVERED" } },
    ] as never);

    const { GET } = await import("@/app/api/claims/filter-options/route");
    const response = await GET();

    expect(response.status).toBe(200);
  });
```

Lưu ý: nếu `beforeEach` của file chưa gọi `clearClaimsFilterOptionsCache()`, lời gọi đầu test ở trên đảm bảo cache không dính dữ liệu từ test trước.

- [ ] **Step 2: Chạy test, xác nhận case mới fail**

Run: `npx vitest run src/__tests__/app/api/claims-route-permissions.test.ts`
Expected: case mới FAIL với status 403; các case cũ vẫn PASS.

- [ ] **Step 3: Sửa route**

Trong `src/app/api/claims/filter-options/route.ts`:

Đổi import:

```ts
import { canAccessCompensation, hasClaimsPermission } from "@/lib/claims-permissions";
```

(bỏ import `requireClaimsPermission` nếu không còn dùng)

Thay block kiểm tra quyền:

```ts
    const denied = requireClaimsPermission(session.user, "canViewClaims");
    if (denied) {
      return denied;
    }
```

bằng:

```ts
    if (
      !hasClaimsPermission(session.user, "canViewClaims")
      && !canAccessCompensation(session.user)
    ) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403, headers: timing.headers() });
    }
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npx vitest run src/__tests__/app/api/claims-route-permissions.test.ts`
Expected: PASS toàn bộ, gồm case mới.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/claims/filter-options/route.ts src/__tests__/app/api/claims-route-permissions.test.ts
git commit -m "feat: allow compensation viewers to load claims filter options"
```

---

### Task 6: Component `CompensationFilterBar`

**Files:**
- Create: `src/components/claims/compensation/CompensationFilterBar.tsx`
- Test: `src/__tests__/components/compensationFilterBar.test.ts`

- [ ] **Step 1: Viết test fail (cho helper thuần)**

Tạo `src/__tests__/components/compensationFilterBar.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  createDefaultCompensationFilters,
  getPresetRange,
} from "@/components/claims/compensation/CompensationFilterBar";

const NOW = new Date(2026, 5, 12); // 12/06/2026

describe("getPresetRange", () => {
  it("computes month preset", () => {
    expect(getPresetRange("month", NOW)).toEqual({ dateFrom: "2026-06-01", dateTo: "2026-06-12" });
  });

  it("computes quarter preset", () => {
    expect(getPresetRange("quarter", NOW)).toEqual({ dateFrom: "2026-04-01", dateTo: "2026-06-12" });
  });

  it("computes year preset", () => {
    expect(getPresetRange("year", NOW)).toEqual({ dateFrom: "2026-01-01", dateTo: "2026-06-12" });
  });
});

describe("createDefaultCompensationFilters", () => {
  it("defaults to year-to-date with all shops", () => {
    expect(createDefaultCompensationFilters(NOW)).toEqual({
      preset: "year",
      dateFrom: "2026-01-01",
      dateTo: "2026-06-12",
      shopName: "",
    });
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npx vitest run src/__tests__/components/compensationFilterBar.test.ts`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Implementation**

Tạo `src/components/claims/compensation/CompensationFilterBar.tsx`:

```tsx
"use client";

import { memo } from "react";
import { format } from "date-fns";

export type CompensationPreset = "month" | "quarter" | "year" | "custom";

export type CompensationFilters = {
  preset: CompensationPreset;
  dateFrom: string; // yyyy-MM-dd
  dateTo: string; // yyyy-MM-dd
  shopName: string; // "" = tất cả cửa hàng
};

const PRESETS: Array<{ value: CompensationPreset; label: string }> = [
  { value: "month", label: "Tháng này" },
  { value: "quarter", label: "Quý này" },
  { value: "year", label: "Năm nay" },
  { value: "custom", label: "Tùy chọn" },
];

export function getPresetRange(
  preset: CompensationPreset,
  now = new Date(),
): { dateFrom: string; dateTo: string } {
  const dateTo = format(now, "yyyy-MM-dd");

  switch (preset) {
    case "month":
      return { dateFrom: format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd"), dateTo };
    case "quarter":
      return {
        dateFrom: format(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1), "yyyy-MM-dd"),
        dateTo,
      };
    default:
      return { dateFrom: format(new Date(now.getFullYear(), 0, 1), "yyyy-MM-dd"), dateTo };
  }
}

export function createDefaultCompensationFilters(now = new Date()): CompensationFilters {
  return { preset: "year", ...getPresetRange("year", now), shopName: "" };
}

const dateInputStyle: React.CSSProperties = {
  padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: "8px",
  fontSize: "12px", color: "#374151", outline: "none", background: "#fff",
};

const selectStyle: React.CSSProperties = {
  padding: "7px 12px", border: "1.5px solid #2563EB", borderRadius: "8px",
  fontSize: "13px", fontWeight: 600, color: "#2563EB", background: "#eff6ff",
  cursor: "pointer", outline: "none", maxWidth: "220px",
};

interface Props {
  filters: CompensationFilters;
  shopOptions: string[];
  onChange: (filters: CompensationFilters) => void;
}

function CompensationFilterBarInner({ filters, shopOptions, onChange }: Props) {
  const handlePreset = (preset: CompensationPreset) => {
    if (preset === "custom") {
      onChange({ ...filters, preset });
      return;
    }
    onChange({ ...filters, preset, ...getPresetRange(preset) });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "10px",
        alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {PRESETS.map((preset) => {
            const active = filters.preset === preset.value;
            return (
              <button
                key={preset.value}
                onClick={() => handlePreset(preset.value)}
                style={{
                  padding: "7px 14px", borderRadius: "999px", fontSize: "12px", fontWeight: 600,
                  border: active ? "1.5px solid #2563EB" : "1px solid #d1d5db",
                  background: active ? "#2563EB" : "#fff",
                  color: active ? "#fff" : "#475569",
                  cursor: "pointer", whiteSpace: "nowrap",
                }}
                aria-pressed={active}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <select
          value={filters.shopName}
          onChange={(e) => onChange({ ...filters, shopName: e.target.value })}
          style={selectStyle}
          aria-label="Lọc cửa hàng đền bù"
        >
          <option value="">Tất cả cửa hàng</option>
          {shopOptions.map((shop) => (
            <option key={shop} value={shop}>{shop}</option>
          ))}
        </select>
      </div>

      {filters.preset === "custom" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Từ</label>
          <input
            type="date"
            value={filters.dateFrom}
            max={filters.dateTo || undefined}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
            style={dateInputStyle}
            aria-label="Từ ngày thống kê đền bù"
          />
          <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Đến</label>
          <input
            type="date"
            value={filters.dateTo}
            min={filters.dateFrom || undefined}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
            style={dateInputStyle}
            aria-label="Đến ngày thống kê đền bù"
          />
        </div>
      )}
    </div>
  );
}

export const CompensationFilterBar = memo(CompensationFilterBarInner);
```

Ghi chú hành vi: khi user xóa trắng input ngày, chuỗi rỗng được gửi lên API — `resolveCompensationRange` tự fallback về mặc định nên không lỗi.

- [ ] **Step 4: Chạy test + lint, xác nhận pass**

Run: `npx vitest run src/__tests__/components/compensationFilterBar.test.ts`
Expected: PASS (4 tests).
Run: `npm run lint`
Expected: 0 errors (warnings có sẵn của repo thì bỏ qua).

- [ ] **Step 5: Commit**

```bash
git add src/components/claims/compensation/CompensationFilterBar.tsx src/__tests__/components/compensationFilterBar.test.ts
git commit -m "feat: add compensation filter bar with date presets and shop select"
```

---

### Task 7: Component `ShopClaimsDetailModal`

**Files:**
- Create: `src/components/claims/compensation/ShopClaimsDetailModal.tsx`

- [ ] **Step 1: Implementation**

Tạo `src/components/claims/compensation/ShopClaimsDetailModal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import { CLAIMS_MOBILE_BREAKPOINT } from "@/components/claims/claims-table/claimsResponsive";
import {
  CLAIM_STATUS_CONFIG,
  ISSUE_TYPE_CONFIG,
  formatClaimMoney,
  type ClaimStatusKey,
  type IssueTypeKey,
} from "@/lib/claims-config";

type DetailClaim = {
  id: string;
  requestCode: string;
  detectedDate: string;
  issueType: string;
  claimStatus: string;
  carrierCompensation: number;
  customerCompensation: number;
};

type DetailResponse = {
  claims: DetailClaim[];
  pagination: { page: number; pageSize: number; total: number };
};

const PAGE_SIZE = 20;

const DETAIL_TABLE_HEADERS = ["STT", "Mã YC", "Ngày PH", "Loại VĐ", "TT Xử Lý", "Tiền NVC ĐB", "Tiền ĐB KH"];

function pagerBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px",
    borderRadius: "8px", border: "1px solid #d1d5db",
    background: disabled ? "#f8fafc" : "#fff",
    fontSize: "12px", fontWeight: 600,
    color: disabled ? "#cbd5e1" : "#374151",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

export function ShopClaimsDetailModal({
  shopName,
  dateFrom,
  dateTo,
  onClose,
}: {
  shopName: string;
  dateFrom: string;
  dateTo: string;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery<DetailResponse>({
    queryKey: ["claims-compensation-details", shopName, dateFrom, dateTo, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        shopName,
        dateFrom,
        dateTo,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/claims/compensation/details?${params.toString()}`);
      if (!res.ok) throw new Error("Không thể tải chi tiết đền bù");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const claims = data?.claims ?? [];
  const total = data?.pagination.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return createPortal(
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 10050, backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label={`Chi tiết đền bù cửa hàng ${shopName}`}
        style={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          zIndex: 10051, background: "#fff", border: "1.5px solid #2563EB",
          borderRadius: "12px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          display: "flex", flexDirection: "column",
          width: "min(860px, calc(100vw - 24px))", maxHeight: "90vh",
        }}
      >
        <style>{`
          @media (max-width: ${CLAIMS_MOBILE_BREAKPOINT - 1}px) {
            .claims-compensation-detail-table { display: none !important; }
            .claims-compensation-detail-cards { display: flex !important; }
          }
          @media (min-width: ${CLAIMS_MOBILE_BREAKPOINT}px) {
            .claims-compensation-detail-cards { display: none !important; }
          }
        `}</style>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid #e5e7eb", padding: "14px 20px", gap: "10px",
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {shopName}
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              Đơn có vấn đề trong kỳ đã lọc · {total} đơn
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng chi tiết đền bù"
            style={{
              background: "none", border: "none", cursor: "pointer", padding: "4px",
              borderRadius: "6px", color: "#666", display: "flex", flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "14px 20px", overflowY: "auto", flex: 1, minHeight: 0 }}>
          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px", color: "#6b7280" }}>
              <Loader2 className="animate-spin" size={22} />
            </div>
          ) : isError ? (
            <div style={{ textAlign: "center", padding: "30px", color: "#b91c1c", fontSize: "13px" }}>
              Không thể tải chi tiết đền bù. Vui lòng thử lại.
            </div>
          ) : claims.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", color: "#9ca3af", fontSize: "13px" }}>
              Không có đơn nào trong kỳ đã lọc
            </div>
          ) : (
            <>
              <div className="claims-compensation-detail-table" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e5e7eb" }}>
                      {DETAIL_TABLE_HEADERS.map((header) => (
                        <th
                          key={header}
                          style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((claim, index) => {
                      const issueConfig = ISSUE_TYPE_CONFIG[claim.issueType as IssueTypeKey] || ISSUE_TYPE_CONFIG.OTHER;
                      const statusConfig = CLAIM_STATUS_CONFIG[claim.claimStatus as ClaimStatusKey] || CLAIM_STATUS_CONFIG.PENDING;
                      return (
                        <tr
                          key={claim.id}
                          style={{ borderBottom: "1px solid #f1f5f9", background: index % 2 === 0 ? "#fff" : "#f9fafb" }}
                        >
                          <td style={{ padding: "8px 10px", color: "#94a3b8" }}>
                            {(page - 1) * PAGE_SIZE + index + 1}
                          </td>
                          <td style={{ padding: "8px 10px", fontWeight: 700, color: "#2563EB", fontFamily: "monospace" }}>
                            {claim.requestCode}
                          </td>
                          <td style={{ padding: "8px 10px", color: "#475569", whiteSpace: "nowrap" }}>
                            {format(new Date(claim.detectedDate), "dd/MM/yyyy")}
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${issueConfig.bg} ${issueConfig.text} ${issueConfig.border}`}>
                              {issueConfig.label}
                            </span>
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${statusConfig.bg} ${statusConfig.text}`}>
                              {statusConfig.label}
                            </span>
                          </td>
                          <td style={{ padding: "8px 10px", color: "#16a34a", fontWeight: 600, whiteSpace: "nowrap" }}>
                            {formatClaimMoney(claim.carrierCompensation)}
                          </td>
                          <td style={{ padding: "8px 10px", color: "#dc2626", fontWeight: 600, whiteSpace: "nowrap" }}>
                            {formatClaimMoney(claim.customerCompensation)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div
                className="claims-compensation-detail-cards"
                data-testid="claims-compensation-detail-cards"
                style={{ display: "none", flexDirection: "column", gap: "10px" }}
              >
                {claims.map((claim) => {
                  const issueConfig = ISSUE_TYPE_CONFIG[claim.issueType as IssueTypeKey] || ISSUE_TYPE_CONFIG.OTHER;
                  const statusConfig = CLAIM_STATUS_CONFIG[claim.claimStatus as ClaimStatusKey] || CLAIM_STATUS_CONFIG.PENDING;
                  return (
                    <article
                      key={`${claim.id}-card`}
                      style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px", background: "#fff" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                        <span style={{ fontWeight: 700, color: "#2563EB", fontFamily: "monospace", fontSize: "13px" }}>
                          {claim.requestCode}
                        </span>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          {format(new Date(claim.detectedDate), "dd/MM/yy")}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${issueConfig.bg} ${issueConfig.text} ${issueConfig.border}`}>
                          {issueConfig.label}
                        </span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${statusConfig.bg} ${statusConfig.text}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "10px", fontSize: "12px" }}>
                        <div style={{ color: "#16a34a" }}>
                          NVC ĐB: <strong>{formatClaimMoney(claim.carrierCompensation)}</strong>
                        </div>
                        <div style={{ color: "#dc2626" }}>
                          ĐB KH: <strong>{formatClaimMoney(claim.customerCompensation)}</strong>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderTop: "1px solid #e5e7eb", padding: "12px 20px", gap: "10px",
        }}>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            Trang {page}/{totalPages}
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              aria-label="Trang trước chi tiết đền bù"
              style={pagerBtnStyle(page <= 1)}
            >
              <ChevronLeft size={14} /> Trước
            </button>
            <button
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
              aria-label="Trang sau chi tiết đền bù"
              style={pagerBtnStyle(page >= totalPages)}
            >
              Sau <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
```

- [ ] **Step 2: Lint + typecheck**

Run: `npm run lint`
Expected: 0 errors mới.
Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/claims/compensation/ShopClaimsDetailModal.tsx
git commit -m "feat: add per-shop compensation detail modal with pagination"
```

---

### Task 8: Viết lại `ClaimsCompensationTab`

**Files:**
- Rewrite: `src/components/claims/ClaimsCompensationTab.tsx`

- [ ] **Step 1: Implementation**

Thay TOÀN BỘ nội dung `src/components/claims/ClaimsCompensationTab.tsx`:

```tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle, CheckCircle2, ChevronRight, Clock, DollarSign, Download,
  FileWarning, Loader2, Scale, Search, XCircle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { CLAIMS_MOBILE_BREAKPOINT } from "@/components/claims/claims-table/claimsResponsive";
import {
  CompensationFilterBar,
  createDefaultCompensationFilters,
  type CompensationFilters,
} from "@/components/claims/compensation/CompensationFilterBar";

const ShopClaimsDetailModal = dynamic(
  () => import("@/components/claims/compensation/ShopClaimsDetailModal").then((module) => ({
    default: module.ShopClaimsDetailModal,
  })),
  { loading: () => null },
);

type CompensationSummary = {
  totalClaims: number;
  processingCount: number;
  customerCompensatedCount: number;
  customerRejectedCount: number;
  pendingCount: number;
  carrierTotal: number;
  customerTotal: number;
  difference: number;
};

type CompensationShopRow = {
  shopName: string;
  totalClaims: number;
  processing: number;
  compensated: number;
  rejected: number;
  pending: number;
  totalPaid: number;
};

type CompensationResponse = {
  summary: CompensationSummary;
  shops: CompensationShopRow[];
  monthlyData: Array<{ month: string; carrier: number; customer: number }>;
  issueDistribution: Array<{ type: string; label: string; count: number; color: string }>;
};

const cardStyle: React.CSSProperties = {
  background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "12px",
  padding: "16px 20px",
};

const formatVND = (n: number) => n.toLocaleString("vi-VN") + "đ";

const SHOP_TABLE_HEADERS = ["Cửa Hàng", "Tổng VĐ", "Đang XL", "Đã ĐB KH", "Từ Chối ĐB", "Chờ ĐB", "Tiền ĐB KH", "Chi Tiết"];

export default function ClaimsCompensationTab() {
  const [filters, setFilters] = useState<CompensationFilters>(() => createDefaultCompensationFilters());
  const [shopSearch, setShopSearch] = useState("");
  const [detailShop, setDetailShop] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<CompensationResponse>({
    queryKey: ["claims-compensation", filters.dateFrom, filters.dateTo, filters.shopName],
    queryFn: async () => {
      const params = new URLSearchParams({ dateFrom: filters.dateFrom, dateTo: filters.dateTo });
      if (filters.shopName) params.set("shopName", filters.shopName);
      const res = await fetch(`/api/claims/compensation?${params.toString()}`);
      if (!res.ok) throw new Error("Không thể tải tổng hợp đền bù");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: filterOptions } = useQuery<{ shops: string[] }>({
    queryKey: ["claims-filter-options"],
    queryFn: async () => {
      const res = await fetch("/api/claims/filter-options");
      if (!res.ok) return { shops: [] };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const summary = data?.summary;
  const shops = data?.shops ?? [];
  const filteredShops = shops.filter((shop) =>
    !shopSearch || shop.shopName.toLowerCase().includes(shopSearch.toLowerCase()),
  );

  const totals = filteredShops.reduce(
    (acc, shop) => ({
      totalClaims: acc.totalClaims + shop.totalClaims,
      processing: acc.processing + shop.processing,
      compensated: acc.compensated + shop.compensated,
      rejected: acc.rejected + shop.rejected,
      pending: acc.pending + shop.pending,
      totalPaid: acc.totalPaid + shop.totalPaid,
    }),
    { totalClaims: 0, processing: 0, compensated: 0, rejected: 0, pending: 0, totalPaid: 0 },
  );

  const difference = summary?.difference || 0;

  const summaryCards = [
    {
      label: "Tổng số đơn có vấn đề",
      value: String(summary?.totalClaims || 0),
      subtitle: "Trong kỳ đã lọc",
      color: "#334155", bgColor: "#f8fafc", borderColor: "#64748b",
      icon: <FileWarning size={20} />,
    },
    {
      label: "Đơn đang xử lý",
      value: String(summary?.processingCount || 0),
      subtitle: "Chưa có kết quả cuối",
      color: "#2563eb", bgColor: "#eff6ff", borderColor: "#2563eb",
      icon: <Clock size={20} />,
    },
    {
      label: "Đơn đã đền bù KH",
      value: String(summary?.customerCompensatedCount || 0),
      subtitle: "Trạng thái Đã đền bù KH",
      color: "#16a34a", bgColor: "#f0fdf4", borderColor: "#16a34a",
      icon: <CheckCircle2 size={20} />,
    },
    {
      label: "Đơn từ chối ĐB",
      value: String(summary?.customerRejectedCount || 0),
      subtitle: "Trạng thái Từ chối ĐB KH",
      color: "#ea580c", bgColor: "#fff7ed", borderColor: "#ea580c",
      icon: <XCircle size={20} />,
    },
    {
      label: "Tổng tiền đền bù",
      value: formatVND(summary?.customerTotal || 0),
      subtitle: `${summary?.customerCompensatedCount || 0} đơn đã đền bù KH`,
      color: "#dc2626", bgColor: "#fef2f2", borderColor: "#dc2626",
      icon: <DollarSign size={20} />,
    },
    {
      label: "Chênh lệch (Lời/Lỗ)",
      value: `${difference >= 0 ? "" : "-"}${formatVND(Math.abs(difference))}`,
      subtitle: `NVC ĐB ${formatVND(summary?.carrierTotal || 0)} − ĐB KH ${formatVND(summary?.customerTotal || 0)}`,
      color: difference >= 0 ? "#2563eb" : "#dc2626",
      bgColor: difference >= 0 ? "#eff6ff" : "#fef2f2",
      borderColor: difference >= 0 ? "#2563eb" : "#dc2626",
      icon: <Scale size={20} />,
    },
    {
      label: "Đơn chờ đền bù",
      value: String(summary?.pendingCount || 0),
      subtitle: "NVC đã chốt, chờ quyết với KH",
      color: "#d97706", bgColor: "#fffbeb", borderColor: "#d97706",
      icon: <AlertCircle size={20} />,
    },
  ];

  const handleExportExcel = () => {
    if (filteredShops.length === 0) return;
    import("xlsx").then((XLSX) => {
      const headers = ["STT", "Cửa Hàng", "Tổng Đơn VĐ", "Đang Xử Lý", "Đã ĐB KH", "Từ Chối ĐB", "Chờ ĐB", "Tiền ĐB KH"];
      const rows = filteredShops.map((shop, index) => [
        index + 1, shop.shopName, shop.totalClaims, shop.processing,
        shop.compensated, shop.rejected, shop.pending, shop.totalPaid,
      ]);
      const aoa = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "DenBuTheoCuaHang");
      XLSX.writeFile(wb, `den-bu-theo-cua-hang-${new Date().toISOString().slice(0, 10)}.xlsx`);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <style>{`
        @media (max-width: ${CLAIMS_MOBILE_BREAKPOINT - 1}px) {
          .claims-compensation-shop-table { display: none !important; }
          .claims-compensation-shop-cards { display: flex !important; }
        }

        @media (min-width: ${CLAIMS_MOBILE_BREAKPOINT}px) {
          .claims-compensation-shop-cards { display: none !important; }
        }
      `}</style>

      <CompensationFilterBar
        filters={filters}
        shopOptions={filterOptions?.shops ?? []}
        onChange={setFilters}
      />

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "80px", color: "#6b7280" }}>
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : isError || !data ? (
        <div
          style={{
            border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c",
            borderRadius: "10px", padding: "10px 12px", fontSize: "13px", lineHeight: "1.5",
          }}
        >
          Không thể tải tổng hợp đền bù. Vui lòng thử lại.
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {summaryCards.map((card, index) => (
              <div
                key={index}
                style={{
                  background: card.bgColor, border: `0.5px solid ${card.borderColor}30`,
                  borderRadius: "12px", padding: "18px 20px",
                  borderLeft: `4px solid ${card.borderColor}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      {card.label}
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: 800, color: card.color, marginTop: "6px" }}>
                      {card.value}
                    </div>
                    <div style={{ fontSize: "11px", color: card.color, fontWeight: 500, marginTop: "2px" }}>
                      {card.subtitle}
                    </div>
                  </div>
                  <div style={{ color: card.color, opacity: 0.4 }}>{card.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Shop compensation detail table */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", gap: "10px", flexWrap: "wrap" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>📊 Chi tiết đền bù theo Cửa hàng</div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: "10px", top: "8px", color: "#9ca3af" }} />
                  <input
                    style={{ padding: "6px 10px 6px 30px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "12px", width: "100%", maxWidth: "180px", outline: "none" }}
                    placeholder="Tìm cửa hàng..."
                    value={shopSearch}
                    onChange={(e) => setShopSearch(e.target.value)}
                    aria-label="Tìm cửa hàng đền bù"
                  />
                </div>
                <button
                  onClick={handleExportExcel}
                  style={{
                    display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px",
                    borderRadius: "8px", border: "1px solid #BFDBFE", background: "#EFF6FF",
                    fontSize: "12px", fontWeight: 600, color: "#2563EB", cursor: "pointer",
                  }}
                  aria-label="Xuất Excel chi tiết đền bù theo cửa hàng"
                >
                  <Download size={13} /> Xuất Excel
                </button>
              </div>
            </div>

            <div className="claims-compensation-shop-table" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e5e7eb" }}>
                    {SHOP_TABLE_HEADERS.map((header) => (
                      <th key={header} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredShops.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "#9ca3af" }}>Không có dữ liệu</td>
                    </tr>
                  ) : filteredShops.map((shop, index) => (
                    <tr
                      key={shop.shopName}
                      style={{ borderBottom: "1px solid #f1f5f9", background: index % 2 === 0 ? "#fff" : "#f9fafb" }}
                    >
                      <td style={{ padding: "8px 10px", fontWeight: 600, color: "#1e293b", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={shop.shopName}>
                        {shop.shopName}
                      </td>
                      <td style={{ padding: "8px 10px", fontWeight: 600 }}>{shop.totalClaims}</td>
                      <td style={{ padding: "8px 10px", color: "#2563eb", fontWeight: 600 }}>{shop.processing}</td>
                      <td style={{ padding: "8px 10px", color: "#16a34a", fontWeight: 600 }}>{shop.compensated}</td>
                      <td style={{ padding: "8px 10px", color: "#ea580c", fontWeight: 600 }}>{shop.rejected}</td>
                      <td style={{ padding: "8px 10px", color: "#d97706", fontWeight: 600 }}>{shop.pending}</td>
                      <td style={{ padding: "8px 10px", color: "#dc2626", fontWeight: 600 }}>{formatVND(shop.totalPaid)}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <button
                          onClick={() => setDetailShop(shop.shopName)}
                          style={{
                            display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px",
                            borderRadius: "6px", border: "1px solid #d1d5db", background: "#fff",
                            fontSize: "11px", fontWeight: 600, color: "#2563EB", cursor: "pointer",
                          }}
                          aria-label={`Xem chi tiết đền bù cửa hàng ${shop.shopName}`}
                        >
                          <ChevronRight size={12} /> Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {filteredShops.length > 0 && (
                  <tfoot>
                    <tr style={{ background: "#f1f5f9", borderTop: "1.5px solid #e5e7eb" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "#1e293b" }}>Tổng cộng</td>
                      <td style={{ padding: "8px 10px", fontWeight: 700 }}>{totals.totalClaims}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "#2563eb" }}>{totals.processing}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "#16a34a" }}>{totals.compensated}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "#ea580c" }}>{totals.rejected}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "#d97706" }}>{totals.pending}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "#dc2626" }}>{formatVND(totals.totalPaid)}</td>
                      <td style={{ padding: "8px 10px" }} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <div
              className="claims-compensation-shop-cards"
              data-testid="claims-compensation-shop-cards"
              style={{ display: "none", flexDirection: "column", gap: "10px" }}
            >
              {filteredShops.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px", color: "#9ca3af" }}>Không có dữ liệu</div>
              ) : filteredShops.map((shop) => (
                <article
                  key={`${shop.shopName}-card`}
                  style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px", background: "#fff" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {shop.shopName}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{shop.totalClaims} đơn vấn đề</div>
                    </div>
                    <button
                      onClick={() => setDetailShop(shop.shopName)}
                      style={{
                        display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px",
                        borderRadius: "6px", border: "1px solid #d1d5db", background: "#fff",
                        fontSize: "11px", fontWeight: 600, color: "#2563EB", cursor: "pointer", flexShrink: 0,
                      }}
                      aria-label={`Xem chi tiết đền bù cửa hàng ${shop.shopName}`}
                    >
                      <ChevronRight size={12} /> Xem chi tiết
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "10px" }}>
                    <div style={{ fontSize: "12px", color: "#2563eb" }}>Đang XL: <strong>{shop.processing}</strong></div>
                    <div style={{ fontSize: "12px", color: "#16a34a" }}>Đã ĐB KH: <strong>{shop.compensated}</strong></div>
                    <div style={{ fontSize: "12px", color: "#ea580c" }}>Từ chối ĐB: <strong>{shop.rejected}</strong></div>
                    <div style={{ fontSize: "12px", color: "#d97706" }}>Chờ ĐB: <strong>{shop.pending}</strong></div>
                    <div style={{ fontSize: "12px", color: "#dc2626", gridColumn: "1 / -1" }}>
                      Tiền ĐB KH: <strong>{formatVND(shop.totalPaid)}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* Charts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }} className="resp-grid-1-2">
            {/* Bar Chart: Monthly compensation */}
            <div style={cardStyle}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginBottom: "16px" }}>Tiền đền bù theo tháng</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.monthlyData || []} barGap={4}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: any) => `${(Number(v) / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: any, name: any) => [formatVND(Number(value)), name === "carrier" ? "NVC đền bù" : "Đền bù KH"]}
                    labelFormatter={(l: any) => `Tháng ${l}`}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                  />
                  <Legend
                    formatter={(v) => v === "carrier" ? "NVC đền bù" : "Đền bù KH"}
                    wrapperStyle={{ fontSize: "12px" }}
                  />
                  <Bar dataKey="carrier" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="customer" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart: Issue type distribution */}
            <div style={cardStyle}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginBottom: "16px" }}>Đơn KN theo loại vấn đề</div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={(data.issueDistribution || []).filter((entry) => entry.count > 0)}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={45}
                    dataKey="count"
                    nameKey="label"
                    label={({ label, percent }: any) => `${label} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ strokeWidth: 1 }}
                    style={{ fontSize: "11px" }}
                  >
                    {(data.issueDistribution || []).filter((entry) => entry.count > 0).map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [value + " đơn", name]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {detailShop && (
        <ShopClaimsDetailModal
          shopName={detailShop}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onClose={() => setDetailShop(null)}
        />
      )}
    </div>
  );
}
```

Ghi chú:
- Giữ nguyên tên class `claims-compensation-shop-table` / `claims-compensation-shop-cards` và `data-testid="claims-compensation-shop-cards"` để test responsive hiện có không đổi.
- Hàng "Tổng cộng" tính trên `filteredShops` (sau ô tìm kiếm) — khi không tìm kiếm thì khớp đúng các thẻ phía trên.

- [ ] **Step 2: Lint + typecheck + chạy toàn bộ test claims**

Run: `npm run lint`
Expected: 0 errors mới.
Run: `npx tsc --noEmit`
Expected: 0 errors.
Run: `npx vitest run src/__tests__/components/claimsCompensationResponsive.test.tsx src/__tests__/lib/claims-text-encoding.test.ts`
Expected: PASS — helper responsive và text-encoding không bị ảnh hưởng.

- [ ] **Step 3: Commit**

```bash
git add src/components/claims/ClaimsCompensationTab.tsx
git commit -m "feat: rebuild compensation tab with filters, status cards, shop detail table"
```

---

### Task 9: Kiểm tra tổng thể

**Files:** không sửa file (chỉ verify; nếu phát hiện lỗi thì sửa và commit theo từng lỗi).

- [ ] **Step 1: Chạy toàn bộ test suite**

Run: `npm run test:run`
Expected: PASS toàn bộ. Nếu có test fail không liên quan đến thay đổi này (pre-existing), ghi nhận lại nhưng không sửa trong nhánh này.

- [ ] **Step 2: Lint + typecheck toàn dự án**

Run: `npm run lint`
Expected: 0 errors.
Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Smoke test thủ công với dev server**

Run: `npm run dev` rồi mở `http://localhost:3000/claims?claimTab=compensation`, kiểm tra:

1. Mặc định preset "Năm nay" active; các thẻ hiển thị số liệu từ 1/1 đến nay.
2. Đổi preset "Tháng này" → số liệu, bảng, 2 biểu đồ cùng thay đổi.
3. Chọn preset "Tùy chọn" → hiện 2 ô từ/đến ngày, đổi ngày → dữ liệu refetch.
4. Chọn 1 cửa hàng trong dropdown → toàn trang chỉ còn số liệu cửa hàng đó.
5. Bấm "Xem chi tiết" 1 dòng → modal mở, có phân trang nếu >20 đơn, hiển thị 2 cột tiền.
6. Bấm "Xuất Excel" → file `.xlsx` tải về đúng cột, tiếng Việt không lỗi font.
7. Thu nhỏ cửa sổ < 768px → bảng shop chuyển thẻ card, modal chuyển dạng card.
8. Tab 1 "Đơn có vấn đề" và tab 2 "Công cụ" vẫn hoạt động bình thường.
9. Đăng nhập bằng user chỉ có `canViewFinancePage` (không có `canViewClaims`) nếu có sẵn tài khoản test → tab đền bù vẫn tải được dropdown cửa hàng và modal chi tiết.

- [ ] **Step 4: Commit cuối (nếu có sửa trong lúc verify)**

```bash
git status
# chỉ commit các file đã sửa trong bước verify, message dạng "fix: ..."
```

---

## Spec Coverage Checklist (tự kiểm khi hoàn tất)

| Yêu cầu spec | Task |
|---|---|
| Bộ lọc preset + custom + shop, mặc định year-to-date | Task 6, 8 |
| 7 thẻ số liệu theo `claimStatus`, bỏ `isCompleted` | Task 1, 8 |
| Bảng "Chi tiết đền bù theo cửa hàng" + hàng Tổng cộng + tìm kiếm + responsive | Task 8 |
| Export XLSX thay CSV | Task 8 |
| Modal drill-down phân trang, 2 chiều tiền | Task 4, 7 |
| 2 biểu đồ chạy theo bộ lọc (bỏ cửa sổ 6 tháng cố định) | Task 1, 3, 8 |
| API 1 findMany, nhận `dateFrom/dateTo/shopName`, bỏ `period` | Task 3 |
| Endpoint details đúng bộ quyền compensation/finance | Task 4 |
| Filter-options mở cho user compensation/finance | Task 5 |
| Test route + helper + giữ test responsive/text-encoding pass | Task 1–6, 9 |
