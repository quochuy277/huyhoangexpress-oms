# Finance Phase 3 — Trung tâm cảnh báo & Xuất Excel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`).
> **IMPORTANT (git):** Confirm `git branch --show-current` is `feature/finance-redesign` before each commit. NEVER `git checkout <sha>` (detaches HEAD in the shared worktree); use `git diff`/`git show` to inspect.
> **Depends on Phase 2** (this plan edits the Phase-2 versions of `DashboardPageClient.tsx` and `PnlPageClient.tsx`). Do Phase 2 first.

**Goal:** Trung tâm cảnh báo trên hub (tổng hợp từ ngân sách, shop giảm đơn, đơn lỗ, margin đối tác giảm) + xuất Excel cho P&L.

**Spec:** `docs/superpowers/specs/2026-06-14-finance-phase-3-design.md`

**Architecture:** `alerts.ts` orchestrates four prisma-backed sources; budget classification is a pure tested helper (`buildBudgetAlerts`). Excel uses the existing `buildXlsxBuffer`; row construction is a pure tested helper (`buildPnlExportRows`). New API routes follow `requireFinanceAccess()`. Two new presentational components (`AlertCenter`, `ExportButton`) plug into the hub and P&L page.

**Tech Stack:** Next.js App Router, Prisma, SheetJS (`xlsx` via `buildXlsxBuffer`), TanStack React Query, Vitest, Tailwind.

**Quy ước:** tiếng Việt UTF-8; `npx vitest run <file>`, `npm run lint`, `npx tsc --noEmit`; commit tiếng Anh; 1 commit/task. Finance API routes dùng `requireFinanceAccess()`.

---

## File Structure

| File | Vai trò |
|---|---|
| Create: `src/lib/finance/alerts.ts` | `getFinanceAlerts` + pure `buildBudgetAlerts` |
| Create: `src/__tests__/lib/finance-alerts.test.ts` | Unit test `buildBudgetAlerts` |
| Create: `src/app/api/finance/alerts/route.ts` | GET cảnh báo |
| Create: `src/components/finance/shared/AlertCenter.tsx` | UI trung tâm cảnh báo |
| Modify: `src/components/finance/dashboard/DashboardPageClient.tsx` | Thêm AlertCenter (Phase-2 version) |
| Create: `src/lib/finance/pnl-export.ts` | `buildPnlExportRows` + `buildPnlWorkbook` |
| Create: `src/__tests__/lib/finance-pnl-export.test.ts` | Unit test `buildPnlExportRows` |
| Create: `src/app/api/finance/pnl/export/route.ts` | GET xlsx |
| Create: `src/components/finance/shared/ExportButton.tsx` | Nút tải file |
| Modify: `src/components/finance/pnl/PnlPageClient.tsx` | Thêm ExportButton (Phase-2 version) |

---

### Task 3.1: Alerts lib (pure budget helper + orchestrator)

**Files:** Create `src/lib/finance/alerts.ts`, `src/__tests__/lib/finance-alerts.test.ts`.

- [ ] **Step 1** — failing test for the pure helper:
```ts
// src/__tests__/lib/finance-alerts.test.ts
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
```
- [ ] **Step 2** — run, confirm FAIL.
- [ ] **Step 3** — implement:
```ts
// src/lib/finance/alerts.ts
import { format, subDays } from "date-fns";
import { DeliveryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatVnd } from "@/lib/finance/format";
import { getPreviousRange } from "@/lib/finance/compare";
import { getFinanceBudgetSummary, type DateRange, type FinanceBudgetSummary } from "@/lib/finance/landing";

export type AlertSeverity = "critical" | "warning";
export type AlertCategory = "budget" | "shop_decline" | "negative_revenue" | "carrier_margin";
export interface FinanceAlert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  detail: string;
  href: string;
}

const REVENUE_STATUSES: DeliveryStatus[] = ["RECONCILED", "RETURNED_FULL", "RETURNED_PARTIAL"] as DeliveryStatus[];

export function buildBudgetAlerts(summary: FinanceBudgetSummary): FinanceAlert[] {
  return summary.budgets
    .filter((b) => b.budgetAmount > 0 && b.ratio > 90)
    .map((b) => ({
      id: `budget:${b.categoryId}`,
      severity: b.ratio > 100 ? "critical" : "warning",
      category: "budget" as const,
      title: `Ngân sách "${b.categoryName}" đã dùng ${b.ratio}%`,
      detail: `Đã chi ${formatVnd(b.spent)} / ${formatVnd(b.budgetAmount)}`,
      href: "/finance/expenses",
    }));
}

async function shopDeclineAlerts(): Promise<FinanceAlert[]> {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const aStart = subDays(today, 14);
  const bStart = subDays(today, 28);
  const bEnd = subDays(today, 15);
  const [recent, previous] = await Promise.all([
    prisma.order.groupBy({ by: ["shopName"], where: { createdTime: { gte: aStart, lte: today } }, _count: true }),
    prisma.order.groupBy({ by: ["shopName"], where: { createdTime: { gte: bStart, lte: bEnd } }, _count: true }),
  ]);
  const recentMap = new Map(recent.map((r) => [r.shopName ?? "Không rõ", r._count]));
  const alerts: FinanceAlert[] = [];
  for (const p of previous) {
    const shop = p.shopName ?? "Không rõ";
    if (p._count < 5) continue;
    const rec = recentMap.get(shop) ?? 0;
    const change = Math.round(((rec - p._count) / p._count) * 100);
    if (change <= -50 || (change <= -30 && change > -50)) {
      alerts.push({
        id: `shop:${shop}`,
        severity: change <= -50 ? "critical" : "warning",
        category: "shop_decline",
        title: `Cửa hàng "${shop}" giảm đơn ${Math.abs(change)}%`,
        detail: `2 tuần trước ${p._count} đơn → 2 tuần gần ${rec} đơn`,
        href: "/finance/analysis?view=shop",
      });
    }
  }
  return alerts;
}

async function negativeRevenueAlert(range: DateRange): Promise<FinanceAlert[]> {
  const agg = await prisma.order.aggregate({
    where: { revenue: { lt: 0 }, createdTime: { gte: range.from, lte: range.to } },
    _sum: { revenue: true },
    _count: true,
  });
  if (agg._count === 0) return [];
  return [{
    id: "negative",
    severity: "warning",
    category: "negative_revenue",
    title: `${agg._count} đơn doanh thu âm trong kỳ`,
    detail: `Tổng lỗ ${formatVnd(Number(agg._sum.revenue ?? 0))}`,
    href: "/finance/analysis?view=negative",
  }];
}

async function carrierMarginAlerts(range: DateRange): Promise<FinanceAlert[]> {
  const prev = getPreviousRange(range);
  const where = (r: DateRange) => ({ deliveryStatus: { in: REVENUE_STATUSES }, createdTime: { gte: r.from, lte: r.to } });
  const [cur, prv] = await Promise.all([
    prisma.order.groupBy({ by: ["carrierName"], where: where(range), _sum: { totalFee: true, carrierFee: true }, _count: true }),
    prisma.order.groupBy({ by: ["carrierName"], where: where(prev), _sum: { totalFee: true, carrierFee: true } }),
  ]);
  const marginOf = (fee: number, carrier: number) => (fee > 0 ? Math.round(((fee - carrier) / fee) * 1000) / 10 : 0);
  const prevMap = new Map(prv.map((c) => [c.carrierName ?? "Khác", marginOf(Number(c._sum.totalFee ?? 0), Number(c._sum.carrierFee ?? 0))]));
  const alerts: FinanceAlert[] = [];
  for (const c of cur) {
    if (c._count < 20) continue;
    const carrier = c.carrierName ?? "Khác";
    const curMargin = marginOf(Number(c._sum.totalFee ?? 0), Number(c._sum.carrierFee ?? 0));
    const prevMargin = prevMap.get(carrier);
    if (prevMargin === undefined) continue;
    if (prevMargin - curMargin >= 5 && curMargin < 25) {
      alerts.push({
        id: `carrier:${carrier}`,
        severity: "warning",
        category: "carrier_margin",
        title: `Margin đối tác "${carrier}" giảm còn ${curMargin}%`,
        detail: `Kỳ trước ${prevMargin}% → kỳ này ${curMargin}%`,
        href: "/finance/analysis?view=carrier",
      });
    }
  }
  return alerts;
}

export async function getFinanceAlerts(range: DateRange): Promise<FinanceAlert[]> {
  const budgetSummary = await getFinanceBudgetSummary(format(range.from, "yyyy-MM"));
  const [shop, negative, carrier] = await Promise.all([
    shopDeclineAlerts(),
    negativeRevenueAlert(range),
    carrierMarginAlerts(range),
  ]);
  const all = [...buildBudgetAlerts(budgetSummary), ...shop, ...negative, ...carrier];
  const order: Record<AlertSeverity, number> = { critical: 0, warning: 1 };
  return all.sort((a, b) => order[a.severity] - order[b.severity]);
}
```
- [ ] **Step 4** — run test, confirm PASS. `npx tsc --noEmit`. Commit:
```
git add src/lib/finance/alerts.ts src/__tests__/lib/finance-alerts.test.ts
git commit -m "feat: add finance alerts aggregation (budget/shop/negative/carrier)"
```

---

### Task 3.2: Alerts API

**Files:** Create `src/app/api/finance/alerts/route.ts`.

- [ ] **Step 1**:
```ts
// src/app/api/finance/alerts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAccess } from "@/lib/finance-auth";
import { getFinanceAlerts } from "@/lib/finance/alerts";
import { parsePeriodFromURL } from "@/lib/finance-period";

export async function GET(req: NextRequest) {
  const { error } = await requireFinanceAccess();
  if (error) return error;
  const alerts = await getFinanceAlerts(parsePeriodFromURL(new URL(req.url)));
  return NextResponse.json({ alerts });
}
```
- [ ] **Step 2** — `npx tsc --noEmit`. Commit:
```
git add src/app/api/finance/alerts/route.ts
git commit -m "feat: add /api/finance/alerts route"
```

---

### Task 3.3: `<AlertCenter>`

**Files:** Create `src/components/finance/shared/AlertCenter.tsx`.

- [ ] **Step 1**:
```tsx
// src/components/finance/shared/AlertCenter.tsx
"use client";

import Link from "next/link";
import type { FinanceAlert } from "@/lib/finance/alerts";

export function AlertCenter({ alerts }: { alerts: FinanceAlert[] }) {
  const count = alerts.length;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="mb-3 text-base font-bold text-slate-800">
        ⚠️ Trung tâm cảnh báo{count > 0 && <span className="text-red-500"> ({count})</span>}
      </h3>
      {count === 0 ? (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">✅ Không có cảnh báo trong kỳ.</div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <Link
              key={a.id}
              href={a.href}
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 transition-colors ${
                a.severity === "critical" ? "border-red-200 bg-red-50 hover:bg-red-100" : "border-amber-200 bg-amber-50 hover:bg-amber-100"
              }`}
            >
              <span>{a.severity === "critical" ? "🔴" : "🟡"}</span>
              <span className="flex-1">
                <span className="block text-[13px] font-semibold text-slate-800">{a.title}</span>
                <span className="block text-xs text-slate-500">{a.detail}</span>
              </span>
              <span className="whitespace-nowrap text-xs font-bold text-blue-600">Xem →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```
- [ ] **Step 2** — `npx tsc --noEmit`. Commit:
```
git add src/components/finance/shared/AlertCenter.tsx
git commit -m "feat: add AlertCenter component"
```

---

### Task 3.4: Wire AlertCenter into the hub

**Files:** Modify `src/components/finance/dashboard/DashboardPageClient.tsx` (the Phase-2 version).

- [ ] **Step 1** — Add imports near the top:
```tsx
import { AlertCenter } from "@/components/finance/shared/AlertCenter";
import type { FinanceAlert } from "@/lib/finance/alerts";
```
- [ ] **Step 2** — Add an alerts query alongside the existing `landingQuery`/`dashboardQuery`:
```tsx
  const alertsQuery = useQuery({
    queryKey: ["finance-alerts", search],
    queryFn: () => fetchJson<{ alerts: FinanceAlert[] }>(`/api/finance/alerts?${search}`),
    placeholderData: (prev) => prev,
  });
  const alerts = alertsQuery.data?.alerts ?? [];
```
- [ ] **Step 3** — Replace the existing two-column block (the `<div className="grid grid-cols-1 gap-5 lg:grid-cols-2">` that holds "P&L tóm tắt" + "Truy cập nhanh") with a three-region layout: AlertCenter (wide) + P&L tóm tắt on one row, then Truy cập nhanh full width below:
```tsx
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr,1fr]">
        <AlertCenter alerts={alerts} />
        <FinancePanel title="📄 P&L tóm tắt">
          {/* ...giữ nguyên nội dung P&L tóm tắt hiện có... */}
        </FinancePanel>
      </div>

      <FinancePanel title="🔗 Truy cập nhanh">
        {/* ...giữ nguyên 4 Link truy cập nhanh hiện có (bỏ khỏi panel cũ)... */}
      </FinancePanel>
```
(Giữ nguyên markup bên trong hai panel — chỉ tách "Truy cập nhanh" ra khỏi grid 2 cột và đặt AlertCenter vào cột rộng.)
- [ ] **Step 4** — `npx tsc --noEmit` + `npm run lint` + manual check `/finance` (AlertCenter shows alerts or the empty state; links navigate; switching period updates alerts). Commit:
```
git add src/components/finance/dashboard/DashboardPageClient.tsx
git commit -m "feat: surface AlertCenter on the finance dashboard"
```

---

### Task 3.5: P&L export lib (pure rows + workbook, TDD)

**Files:** Create `src/lib/finance/pnl-export.ts`, `src/__tests__/lib/finance-pnl-export.test.ts`.

- [ ] **Step 1** — failing test:
```ts
// src/__tests__/lib/finance-pnl-export.test.ts
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
```
- [ ] **Step 2** — run, confirm FAIL.
- [ ] **Step 3** — implement:
```ts
// src/lib/finance/pnl-export.ts
import { buildXlsxBuffer } from "@/lib/xlsx-export";
import { computeDeltaPercent } from "@/lib/finance/compare";
import type { FinancePnlData } from "@/lib/finance/landing";

export function buildPnlExportRows(
  current: FinancePnlData,
  previous?: FinancePnlData | null,
): { headers: string[]; rows: (string | number)[][] } {
  const cmp = !!previous;
  const headers = cmp ? ["Khoản mục", "Kỳ này", "Kỳ trước", "Δ%"] : ["Khoản mục", "Số tiền"];
  const line = (label: string, cur: number, prev: number | undefined): (string | number)[] => {
    if (cmp) {
      const p = prev ?? 0;
      const d = computeDeltaPercent(cur, p);
      return [label, cur, p, d === null ? "" : d];
    }
    return [label, cur];
  };
  const p = previous;
  const rows: (string | number)[][] = [
    line("Tổng phí thu từ shop", current.revenue.totalFeeFromShop, p?.revenue.totalFeeFromShop),
    line("Trừ phí NVC", -current.revenue.totalCarrierFee, p ? -p.revenue.totalCarrierFee : undefined),
    line("DOANH THU RÒNG", current.revenue.netRevenue, p?.revenue.netRevenue),
    line("Chênh lệch đền bù", current.claims.claimDiff, p?.claims.claimDiff),
    line("LỢI NHUẬN GỘP", current.grossProfit, p?.grossProfit),
    line("Tổng chi phí vận hành", -current.totalOperatingExpenses, p ? -p.totalOperatingExpenses : undefined),
    line("LỢI NHUẬN RÒNG", current.netProfit, p?.netProfit),
  ];
  return { headers, rows };
}

export function buildPnlWorkbook(current: FinancePnlData, previous?: FinancePnlData | null): ArrayBuffer {
  const { headers, rows } = buildPnlExportRows(current, previous);
  return buildXlsxBuffer(headers, rows, "P&L");
}
```
- [ ] **Step 4** — run test, confirm PASS. Commit:
```
git add src/lib/finance/pnl-export.ts src/__tests__/lib/finance-pnl-export.test.ts
git commit -m "feat: add P&L Excel export builders"
```

---

### Task 3.6: Export API route

**Files:** Create `src/app/api/finance/pnl/export/route.ts`.

- [ ] **Step 1**:
```ts
// src/app/api/finance/pnl/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAccess } from "@/lib/finance-auth";
import { buildPnlLabel, getFinancePnlData, resolvePnlRange, type FinancePnlData } from "@/lib/finance/landing";
import { getPreviousRange, getYoyRange } from "@/lib/finance/compare";
import { buildPnlWorkbook } from "@/lib/finance/pnl-export";

export async function GET(req: NextRequest) {
  const { error } = await requireFinanceAccess();
  if (error) return error;

  const url = new URL(req.url);
  const range = resolvePnlRange(url.searchParams.get("from"), url.searchParams.get("to"));
  const compareTo = url.searchParams.get("compareTo");
  const current = await getFinancePnlData(range, buildPnlLabel(range.from, range.to));
  let previous: FinancePnlData | null = null;
  if (compareTo === "prev" || compareTo === "yoy") {
    const prevRange = compareTo === "yoy" ? getYoyRange(range) : getPreviousRange(range);
    previous = await getFinancePnlData(prevRange, buildPnlLabel(prevRange.from, prevRange.to));
  }

  const buffer = buildPnlWorkbook(current, previous);
  const fromStr = range.from.toISOString().slice(0, 10);
  const toStr = range.to.toISOString().slice(0, 10);
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bao-cao-pnl-${fromStr}_${toStr}.xlsx"`,
    },
  });
}
```
- [ ] **Step 2** — `npx tsc --noEmit`. Manual: open `/api/finance/pnl/export?compareTo=prev` while logged in → downloads a valid .xlsx. Commit:
```
git add src/app/api/finance/pnl/export/route.ts
git commit -m "feat: add /api/finance/pnl/export (xlsx)"
```

---

### Task 3.7: `<ExportButton>` + wire on P&L page

**Files:** Create `src/components/finance/shared/ExportButton.tsx`; Modify `src/components/finance/pnl/PnlPageClient.tsx` (Phase-2 version).

- [ ] **Step 1** — component:
```tsx
// src/components/finance/shared/ExportButton.tsx
interface ExportButtonProps { href: string; label?: string }

export function ExportButton({ href, label = "Xuất Excel" }: ExportButtonProps) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
    >
      ⬇ {label}
    </a>
  );
}
```
- [ ] **Step 2** — In `PnlPageClient.tsx`, import it and add it to the header. Add import:
```tsx
import { ExportButton } from "@/components/finance/shared/ExportButton";
```
Then in the title row, next to `<PeriodFilter>`, render the export link built from the current `fromStr`/`toStr`/`compareTo`:
```tsx
        <div className="flex flex-col gap-2">
          <PeriodFilter
            period={filter.period} customFrom={filter.from} customTo={filter.to}
            onPeriodChange={(p) => setFilter({ period: p })}
            onCustomFromChange={(v) => setFilter({ from: v })}
            onCustomToChange={(v) => setFilter({ to: v })}
          />
          <ExportButton href={`/api/finance/pnl/export?from=${fromStr}&to=${toStr}&compareTo=${compareTo}`} />
        </div>
```
(Replace the existing bare `<PeriodFilter .../>` in the header with this wrapped block; keep all props identical.)
- [ ] **Step 3** — `npx tsc --noEmit` + `npm run lint` + manual check `/finance/pnl` (Xuất Excel downloads the current view). Commit:
```
git add src/components/finance/shared/ExportButton.tsx src/components/finance/pnl/PnlPageClient.tsx
git commit -m "feat: add Excel export button to P&L page"
```

---

## Self-Review (đã thực hiện)
- **Spec coverage:** alerts lib + budget pure helper (3.1) ✓; alerts API (3.2) ✓; AlertCenter (3.3) ✓; hub wiring (3.4) ✓; export lib + pure rows (3.5) ✓; export API (3.6) ✓; ExportButton + P&L wiring (3.7) ✓.
- **Placeholder scan:** code đầy đủ. Hai chỗ "giữ nguyên nội dung" (3.4) là chỉ dẫn tách-bố-cục cho markup ĐÃ tồn tại từ Phase 2, không phải code mới — an toàn.
- **Type consistency:** `FinanceAlert` (3.1) dùng ở AlertCenter (3.3) + hub (3.4) + alerts route (3.2); `buildPnlExportRows`/`buildPnlWorkbook` (3.5) dùng ở export route (3.6); `computeDeltaPercent`/`getPreviousRange`/`getYoyRange` (Phase 2) tái dùng; `REVENUE_STATUSES` khai báo nội bộ alerts.ts (không phụ thuộc landing nội bộ).
- **Quyền:** alerts + export đều gác `requireFinanceAccess`.
- **Risk:** `shop_decline` dùng cửa sổ 2 tuần cố định (giống logic shop-trends hiện có), độc lập với `range` — đúng chủ ý "đà gần đây". Nếu DB lớn, 4 nguồn cảnh báo chạy song song; cân nhắc cache nhẹ ở Phase sau nếu cần.
