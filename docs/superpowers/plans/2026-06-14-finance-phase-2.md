# Finance Phase 2 — Hub & P&L nâng cao — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`).
> **IMPORTANT (git):** Always confirm `git branch --show-current` is `feature/finance-redesign` before committing. NEVER `git checkout <sha>` (it detaches HEAD in the shared worktree). Use `git diff`/`git show` for inspection only.

**Goal:** Full dashboard hub (KPI + period comparison + target progress) + P&L comparison column + `FinanceTarget` model & targets dialog.

**Spec:** `docs/superpowers/specs/2026-06-14-finance-phase-2-design.md`

**Architecture:** Pure comparison helpers (`compare.ts`) unit-tested without Prisma. Targets + dashboard aggregation in `src/lib/finance/`. New finance API routes follow the `requireFinanceAccess()` pattern. Hub & P&L clients gain a period/compare selector and new presentational components (`KpiCard`, `PnlComparisonTable`, `TargetDialog`). Core P&L formula (`getFinancePnlData`) is reused unchanged.

**Tech Stack:** Next.js App Router, Prisma 6 (migrations), TanStack React Query, Recharts, Vitest, Tailwind.

**Quy ước:** chuỗi tiếng Việt UTF-8; `npx vitest run <file>`, `npm run lint`, `npx tsc --noEmit`; commit tiếng Anh prefix `feat:`/`test:`; mỗi task 1 commit. Finance API routes dùng `requireFinanceAccess()` (`@/lib/finance-auth`), admin-only ghi qua `session!.user.role !== "ADMIN"`.

---

## File Structure

| File | Vai trò |
|---|---|
| Modify: `prisma/schema.prisma` | Thêm model `FinanceTarget` |
| Create: `prisma/migrations/<ts>_add_finance_target/` | Migration (sinh bởi `prisma migrate dev`) |
| Create: `src/lib/finance/compare.ts` | `getPreviousRange`, `getYoyRange`, `computeDeltaPercent`, `computeTargetPercent` |
| Create: `src/__tests__/lib/finance-compare.test.ts` | Unit test compare helpers |
| Create: `src/lib/finance/targets.ts` | `mapTargetRows`, `getFinanceTargets`, `setFinanceTargets` |
| Create: `src/__tests__/lib/finance-targets.test.ts` | Unit test `mapTargetRows` |
| Create: `src/app/api/finance/targets/route.ts` | GET/PUT mục tiêu |
| Create: `src/lib/finance/dashboard.ts` | `getFinanceDashboardData` |
| Create: `src/app/api/finance/dashboard/route.ts` | GET dashboard KPI/so sánh |
| Create: `src/components/finance/shared/KpiCard.tsx` | Thẻ KPI (giá trị + Δ + tiến độ mục tiêu) |
| Modify: `src/components/finance/dashboard/DashboardPageClient.tsx` | Period filter + dải KpiCard + mục tiêu |
| Modify: `src/app/api/finance/pnl/route.ts` | Hỗ trợ `compareTo=prev|yoy` |
| Create: `src/components/finance/pnl/PnlComparisonTable.tsx` | Bảng P&L 4 cột |
| Create: `src/components/finance/pnl/TargetDialog.tsx` | Dialog đặt mục tiêu (admin) |
| Modify: `src/components/finance/pnl/PnlPageClient.tsx` | compareTo selector + bảng so sánh + mục tiêu |

Không đụng: `getFinancePnlData` công thức, các trang/route khác.

---

### Task 2.1: Model `FinanceTarget` + migration

**Files:** Modify `prisma/schema.prisma`; migration auto-generated.

- [ ] **Step 1** — Thêm vào `prisma/schema.prisma` ngay sau `model MonthlyBudget { ... }`:
```prisma
model FinanceTarget {
  id           String   @id @default(cuid())
  month        DateTime @db.Date
  metric       String   // "NET_REVENUE" | "NET_PROFIT"
  targetAmount Decimal
  createdBy    String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([month, metric])
}
```
- [ ] **Step 2** — Tạo migration + regenerate client:
Run: `npx prisma migrate dev --name add_finance_target`
Expected: tạo thư mục `prisma/migrations/<ts>_add_finance_target/migration.sql`, áp vào DB, regenerate client. (Nếu DB không sẵn, dùng `npx prisma migrate dev --create-only` rồi báo lại — KHÔNG dùng `db push`.)
- [ ] **Step 3** — `npx tsc --noEmit` → `prisma.financeTarget` có kiểu. Commit:
```
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add FinanceTarget model and migration"
```

---

### Task 2.2: Compare helpers (pure, TDD)

**Files:** Create `src/lib/finance/compare.ts`; Test `src/__tests__/lib/finance-compare.test.ts`.

- [ ] **Step 1** — failing test:
```ts
// src/__tests__/lib/finance-compare.test.ts
import { describe, expect, it } from "vitest";
import { computeDeltaPercent, computeTargetPercent, getPreviousRange, getYoyRange } from "@/lib/finance/compare";

describe("getPreviousRange", () => {
  it("trả về kỳ liền trước cùng độ dài", () => {
    const range = { from: new Date("2026-03-01T00:00:00Z"), to: new Date("2026-03-31T23:59:59.999Z") };
    const prev = getPreviousRange(range);
    expect(prev.to.getTime()).toBe(range.from.getTime() - 1);
    expect(range.from.getTime() - prev.from.getTime()).toBe(range.to.getTime() - range.from.getTime());
  });
});

describe("getYoyRange", () => {
  it("lùi đúng 1 năm", () => {
    const range = { from: new Date("2026-03-01T00:00:00Z"), to: new Date("2026-03-31T00:00:00Z") };
    const yoy = getYoyRange(range);
    expect(yoy.from.getUTCFullYear()).toBe(2025);
    expect(yoy.to.getUTCFullYear()).toBe(2025);
  });
});

describe("computeDeltaPercent", () => {
  it("tính % thay đổi", () => { expect(computeDeltaPercent(110, 100)).toBe(10); });
  it("dùng trị tuyệt đối của previous", () => { expect(computeDeltaPercent(-50, -100)).toBe(50); });
  it("previous = 0 → null", () => { expect(computeDeltaPercent(100, 0)).toBeNull(); });
});

describe("computeTargetPercent", () => {
  it("tính tiến độ", () => { expect(computeTargetPercent(180, 200)).toBe(90); });
  it("target null/0 → null", () => {
    expect(computeTargetPercent(180, null)).toBeNull();
    expect(computeTargetPercent(180, 0)).toBeNull();
  });
});
```
- [ ] **Step 2** — run, confirm FAIL: `npx vitest run src/__tests__/lib/finance-compare.test.ts`
- [ ] **Step 3** — implement:
```ts
// src/lib/finance/compare.ts
import type { DateRange } from "@/lib/finance/landing";

export function getPreviousRange(range: DateRange): DateRange {
  const duration = range.to.getTime() - range.from.getTime();
  return {
    from: new Date(range.from.getTime() - duration),
    to: new Date(range.from.getTime() - 1),
  };
}

export function getYoyRange(range: DateRange): DateRange {
  const from = new Date(range.from);
  from.setFullYear(from.getFullYear() - 1);
  const to = new Date(range.to);
  to.setFullYear(to.getFullYear() - 1);
  return { from, to };
}

export function computeDeltaPercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

export function computeTargetPercent(current: number, target: number | null): number | null {
  if (!target || target <= 0) return null;
  return Math.round((current / target) * 100);
}
```
- [ ] **Step 4** — run, confirm PASS. Commit:
```
git add src/lib/finance/compare.ts src/__tests__/lib/finance-compare.test.ts
git commit -m "feat: add finance compare helpers (prev/yoy range, delta/target percent)"
```

---

### Task 2.3: Targets lib + API

**Files:** Create `src/lib/finance/targets.ts`, `src/__tests__/lib/finance-targets.test.ts`, `src/app/api/finance/targets/route.ts`.

- [ ] **Step 1** — failing test for the pure mapper:
```ts
// src/__tests__/lib/finance-targets.test.ts
import { describe, expect, it } from "vitest";
import { mapTargetRows } from "@/lib/finance/targets";

describe("mapTargetRows", () => {
  it("ánh xạ metric về netRevenue/netProfit", () => {
    expect(mapTargetRows([
      { metric: "NET_REVENUE", targetAmount: 600 },
      { metric: "NET_PROFIT", targetAmount: 230 },
    ])).toEqual({ netRevenue: 600, netProfit: 230 });
  });
  it("thiếu metric → null", () => {
    expect(mapTargetRows([{ metric: "NET_PROFIT", targetAmount: 230 }])).toEqual({ netRevenue: null, netProfit: 230 });
  });
  it("rỗng → cả hai null", () => {
    expect(mapTargetRows([])).toEqual({ netRevenue: null, netProfit: null });
  });
});
```
- [ ] **Step 2** — run, confirm FAIL.
- [ ] **Step 3** — implement lib:
```ts
// src/lib/finance/targets.ts
import { prisma } from "@/lib/prisma";

export interface FinanceTargets {
  netRevenue: number | null;
  netProfit: number | null;
}

type TargetRow = { metric: string; targetAmount: unknown };

export function mapTargetRows(rows: TargetRow[]): FinanceTargets {
  const find = (metric: string) => {
    const row = rows.find((r) => r.metric === metric);
    return row ? Number(row.targetAmount) : null;
  };
  return { netRevenue: find("NET_REVENUE"), netProfit: find("NET_PROFIT") };
}

function monthToDate(month: string): Date {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1);
}

export async function getFinanceTargets(month: string): Promise<FinanceTargets> {
  const rows = await prisma.financeTarget.findMany({
    where: { month: monthToDate(month) },
    select: { metric: true, targetAmount: true },
  });
  return mapTargetRows(rows);
}

export async function setFinanceTargets(month: string, targets: FinanceTargets, createdBy: string): Promise<void> {
  const monthDate = monthToDate(month);
  const entries: Array<[string, number | null]> = [
    ["NET_REVENUE", targets.netRevenue],
    ["NET_PROFIT", targets.netProfit],
  ];
  for (const [metric, amount] of entries) {
    if (amount && amount > 0) {
      await prisma.financeTarget.upsert({
        where: { month_metric: { month: monthDate, metric } },
        create: { month: monthDate, metric, targetAmount: amount, createdBy },
        update: { targetAmount: amount },
      });
    } else {
      await prisma.financeTarget.deleteMany({ where: { month: monthDate, metric } });
    }
  }
}
```
- [ ] **Step 4** — run test, confirm PASS.
- [ ] **Step 5** — API route:
```ts
// src/app/api/finance/targets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAccess } from "@/lib/finance-auth";
import { getFinanceTargets, setFinanceTargets } from "@/lib/finance/targets";

export async function GET(req: NextRequest) {
  const { error } = await requireFinanceAccess();
  if (error) return error;
  const month = new URL(req.url).searchParams.get("month") || new Date().toISOString().slice(0, 7);
  return NextResponse.json(await getFinanceTargets(month));
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireFinanceAccess();
  if (error) return error;
  if (session!.user.role !== "ADMIN") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const { month, netRevenue, netProfit } = await req.json();
  const createdBy = session!.user.email ?? session!.user.id ?? "unknown";
  await setFinanceTargets(month, { netRevenue: netRevenue ?? null, netProfit: netProfit ?? null }, createdBy);
  return NextResponse.json({ success: true });
}
```
- [ ] **Step 6** — `npx tsc --noEmit` + `npm run lint`. Commit:
```
git add src/lib/finance/targets.ts src/__tests__/lib/finance-targets.test.ts src/app/api/finance/targets/route.ts
git commit -m "feat: add finance targets lib + /api/finance/targets route"
```

---

### Task 2.4: Dashboard aggregation lib + API

**Files:** Create `src/lib/finance/dashboard.ts`, `src/app/api/finance/dashboard/route.ts`.

- [ ] **Step 1** — lib:
```ts
// src/lib/finance/dashboard.ts
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getFinancePnlData, type DateRange, type FinancePnlData } from "@/lib/finance/landing";
import { getFinanceTargets, type FinanceTargets } from "@/lib/finance/targets";
import { getPreviousRange } from "@/lib/finance/compare";

export interface FinanceKpi {
  netRevenue: number;
  netProfit: number;
  margin: number;
}

export interface FinanceDashboardData {
  current: FinanceKpi;
  previous: FinanceKpi;
  cashBalance: { amount: number; date: string | null };
  targets: FinanceTargets;
}

function toKpi(pnl: FinancePnlData): FinanceKpi {
  const netRevenue = pnl.revenue.netRevenue;
  const totalFee = pnl.revenue.totalFeeFromShop;
  const margin = totalFee > 0 ? Math.round((netRevenue / totalFee) * 1000) / 10 : 0;
  return { netRevenue, netProfit: pnl.netProfit, margin };
}

export async function getFinanceDashboardData(range: DateRange): Promise<FinanceDashboardData> {
  const prev = getPreviousRange(range);
  const [currentPnl, previousPnl, latest, targets] = await Promise.all([
    getFinancePnlData(range),
    getFinancePnlData(prev),
    prisma.cashbookEntry.findFirst({
      where: { transactionTime: { lte: range.to } },
      orderBy: { transactionTime: "desc" },
      select: { balance: true, transactionTime: true },
    }),
    getFinanceTargets(format(range.from, "yyyy-MM")),
  ]);

  return {
    current: toKpi(currentPnl),
    previous: toKpi(previousPnl),
    cashBalance: {
      amount: latest ? Number(latest.balance) : 0,
      date: latest?.transactionTime ? latest.transactionTime.toISOString() : null,
    },
    targets,
  };
}
```
(Confirm `DateRange` and `FinancePnlData` are exported from `landing.ts` — they are.)
- [ ] **Step 2** — API route:
```ts
// src/app/api/finance/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAccess } from "@/lib/finance-auth";
import { getFinanceDashboardData } from "@/lib/finance/dashboard";
import { parsePeriodFromURL } from "@/lib/finance-period";

export async function GET(req: NextRequest) {
  const { error } = await requireFinanceAccess();
  if (error) return error;
  const data = await getFinanceDashboardData(parsePeriodFromURL(new URL(req.url)));
  return NextResponse.json(data);
}
```
- [ ] **Step 3** — `npx tsc --noEmit`. Commit:
```
git add src/lib/finance/dashboard.ts src/app/api/finance/dashboard/route.ts
git commit -m "feat: add finance dashboard aggregation lib + route"
```

---

### Task 2.5: `<KpiCard>`

**Files:** Create `src/components/finance/shared/KpiCard.tsx`.

- [ ] **Step 1** — component:
```tsx
// src/components/finance/shared/KpiCard.tsx
const TONE: Record<string, string> = {
  blue: "border-l-blue-600",
  green: "border-l-emerald-500",
  amber: "border-l-amber-500",
  violet: "border-l-violet-500",
};

interface KpiCardProps {
  label: string;
  value: string;
  tone?: keyof typeof TONE;
  deltaPercent?: number | null;
  deltaSuffix?: string;
  targetPercent?: number | null;
  targetLabel?: string;
}

export function KpiCard({ label, value, tone = "blue", deltaPercent, deltaSuffix, targetPercent, targetLabel }: KpiCardProps) {
  const hasDelta = deltaPercent !== undefined;
  const up = (deltaPercent ?? 0) >= 0;
  return (
    <div className={`rounded-xl border-l-4 bg-white p-[18px_20px] shadow-sm ${TONE[tone]}`} style={{ minWidth: 200 }}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-[22px] font-bold text-slate-800">{value}</div>
      {hasDelta && (
        <div className={`text-[11px] font-semibold ${deltaPercent === null ? "text-slate-400" : up ? "text-emerald-500" : "text-red-500"}`}>
          {deltaPercent === null ? "—" : `${up ? "▲" : "▼"} ${Math.abs(deltaPercent)}%`}{deltaSuffix ? ` ${deltaSuffix}` : ""}
        </div>
      )}
      {targetPercent != null && (
        <>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(targetPercent, 100)}%` }} />
          </div>
          {targetLabel && <div className="mt-1 text-[10px] text-slate-400">{targetLabel}</div>}
        </>
      )}
    </div>
  );
}
```
- [ ] **Step 2** — `npx tsc --noEmit`. Commit:
```
git add src/components/finance/shared/KpiCard.tsx
git commit -m "feat: add KpiCard component"
```

---

### Task 2.6: Hub — period filter + KPI strip + targets

**Files:** Modify `src/components/finance/dashboard/DashboardPageClient.tsx`.

Goal: add `useFinancePeriod` + `<PeriodFilter>`; drive both the existing landing query and a NEW dashboard query by the selected period; replace `<OverviewSummaryCards>` with a 4-card `<KpiCard>` strip using comparison + targets.

- [ ] **Step 1** — Replace the file contents:
```tsx
// src/components/finance/dashboard/DashboardPageClient.tsx
"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { OverviewCharts } from "@/components/finance/OverviewCharts";
import { FinancePanel } from "@/components/finance/shared/FinancePanel";
import { MoneyText } from "@/components/finance/shared/MoneyText";
import { KpiCard } from "@/components/finance/shared/KpiCard";
import { PeriodFilter } from "@/components/finance/shared/PeriodFilter";
import { useFinancePeriod } from "@/lib/finance/use-finance-period";
import { buildPeriodSearch } from "@/lib/finance/period-url";
import { formatVnd } from "@/lib/finance/format";
import { computeDeltaPercent, computeTargetPercent } from "@/lib/finance/compare";
import type { FinanceLandingData } from "@/lib/finance/landing";
import type { FinanceDashboardData } from "@/lib/finance/dashboard";

const INITIAL_AT = Date.now();

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Lỗi hệ thống");
  return data as T;
}

export default function DashboardPageClient({ initialData }: { initialData: FinanceLandingData }) {
  const { period, from, to, setPeriod, setCustomFrom, setCustomTo } = useFinancePeriod();
  const search = buildPeriodSearch(period, from, to);
  const isMonthDefault = period === "month";

  const landingQuery = useQuery({
    queryKey: ["finance-landing", search],
    queryFn: () => fetchJson<FinanceLandingData>(`/api/finance/landing?${search}`),
    initialData: isMonthDefault ? initialData : undefined,
    initialDataUpdatedAt: isMonthDefault ? INITIAL_AT : undefined,
    placeholderData: (prev) => prev,
  });
  const dashboardQuery = useQuery({
    queryKey: ["finance-dashboard", search],
    queryFn: () => fetchJson<FinanceDashboardData>(`/api/finance/dashboard?${search}`),
    placeholderData: (prev) => prev,
  });

  const data = landingQuery.data ?? initialData;
  const { trendData, carrierDistribution, shopDistribution, pnl } = data;
  const shopBarHeight = Math.max(220, shopDistribution.length * 28);
  const dash = dashboardQuery.data;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-3 py-4 sm:px-4 sm:py-5 sm:space-y-6 md:px-6 md:py-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">📊 Bảng điều khiển Tài chính</h1>
          <p className="mt-1 text-sm text-slate-500">Tổng quan sức khỏe tài chính theo kỳ.</p>
        </div>
        <PeriodFilter
          period={period} customFrom={from} customTo={to}
          onPeriodChange={setPeriod} onCustomFromChange={setCustomFrom} onCustomToChange={setCustomTo}
        />
      </div>

      {dash && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Lợi nhuận ròng" tone="green" value={formatVnd(dash.current.netProfit)}
            deltaPercent={computeDeltaPercent(dash.current.netProfit, dash.previous.netProfit)} deltaSuffix="so kỳ trước"
            targetPercent={computeTargetPercent(dash.current.netProfit, dash.targets.netProfit)}
            targetLabel={dash.targets.netProfit ? `mục tiêu ${formatVnd(dash.targets.netProfit)}` : undefined}
          />
          <KpiCard
            label="Doanh thu ròng" tone="blue" value={formatVnd(dash.current.netRevenue)}
            deltaPercent={computeDeltaPercent(dash.current.netRevenue, dash.previous.netRevenue)} deltaSuffix="so kỳ trước"
            targetPercent={computeTargetPercent(dash.current.netRevenue, dash.targets.netRevenue)}
            targetLabel={dash.targets.netRevenue ? `mục tiêu ${formatVnd(dash.targets.netRevenue)}` : undefined}
          />
          <KpiCard
            label="Margin trung bình" tone="amber" value={`${dash.current.margin}%`}
            deltaPercent={computeDeltaPercent(dash.current.margin, dash.previous.margin)} deltaSuffix="điểm so kỳ trước"
          />
          <KpiCard
            label="Số dư quỹ cuối kỳ" tone="violet" value={formatVnd(dash.cashBalance.amount)}
            deltaSuffix={dash.cashBalance.date ? `cập nhật ${new Date(dash.cashBalance.date).toLocaleDateString("vi-VN")}` : "từ sổ quỹ"}
            deltaPercent={undefined}
          />
        </div>
      )}

      <OverviewCharts trendData={trendData} carrierDistribution={carrierDistribution} shopDistribution={shopDistribution} shopBarHeight={shopBarHeight} formatCurrency={formatVnd} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <FinancePanel title="📄 P&L tóm tắt">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Doanh thu ròng</span><MoneyText value={pnl.revenue.netRevenue} className="font-semibold text-blue-600" /></div>
            <div className="flex justify-between"><span className="text-slate-500">Chênh lệch đền bù</span><MoneyText value={pnl.claims.claimDiff} colored showPlus className="font-semibold" /></div>
            <div className="flex justify-between border-t border-slate-100 pt-2"><span className="text-slate-500">Lợi nhuận gộp</span><MoneyText value={pnl.grossProfit} className="font-semibold" /></div>
            <div className="flex justify-between"><span className="text-slate-500">Chi phí vận hành</span><MoneyText value={-pnl.totalOperatingExpenses} className="font-semibold text-red-500" /></div>
            <div className="flex justify-between border-t-2 border-slate-800 pt-2 text-base font-bold"><span>Lợi nhuận ròng</span><MoneyText value={pnl.netProfit} colored /></div>
          </div>
          <Link href="/finance/pnl" className="mt-3 block text-right text-sm font-bold text-blue-600">Xem báo cáo P&L đầy đủ →</Link>
        </FinancePanel>
        <FinancePanel title="🔗 Truy cập nhanh">
          <div className="space-y-2 text-sm">
            <Link href="/finance/analysis?view=shop" className="block rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">🏪 Phân tích cửa hàng →</Link>
            <Link href="/finance/analysis?view=carrier" className="block rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">🚚 So sánh đối tác →</Link>
            <Link href="/finance/cashbook" className="block rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">🏦 Sổ quỹ →</Link>
            <Link href="/finance/expenses" className="block rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">💸 Chi phí & Ngân sách →</Link>
          </div>
        </FinancePanel>
      </div>
    </div>
  );
}
```
- [ ] **Step 2** — `npx tsc --noEmit` + `npm run lint` + manual check `/finance` (KPI strip with deltas; period filter switches data). Commit:
```
git add src/components/finance/dashboard/DashboardPageClient.tsx
git commit -m "feat: hub period filter + KPI comparison strip with targets"
```

Note: `OverviewSummaryCards` is no longer imported by the hub. Leave the file (still independently useful); do not delete in this phase.

---

### Task 2.7: P&L comparison API

**Files:** Modify `src/app/api/finance/pnl/route.ts`.

- [ ] **Step 1** — Replace the route body to support `compareTo` (keep flat shape when absent):
```ts
// src/app/api/finance/pnl/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAccess } from "@/lib/finance-auth";
import { logger } from "@/lib/logger";
import { buildPnlLabel, getFinancePnlData, resolvePnlRange } from "@/lib/finance/landing";
import { getPreviousRange, getYoyRange } from "@/lib/finance/compare";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireFinanceAccess();
    if (error) return error;

    const url = new URL(req.url);
    const range = resolvePnlRange(url.searchParams.get("from"), url.searchParams.get("to"));
    const compareTo = url.searchParams.get("compareTo");

    if (compareTo === "prev" || compareTo === "yoy") {
      const prevRange = compareTo === "yoy" ? getYoyRange(range) : getPreviousRange(range);
      const [current, previous] = await Promise.all([
        getFinancePnlData(range, buildPnlLabel(range.from, range.to)),
        getFinancePnlData(prevRange, buildPnlLabel(prevRange.from, prevRange.to)),
      ]);
      return NextResponse.json({ current, previous, compareMode: compareTo });
    }

    const data = await getFinancePnlData(range, buildPnlLabel(range.from, range.to));
    return NextResponse.json(data);
  } catch (error) {
    logger.error("GET /api/finance/pnl", "Error", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
```
- [ ] **Step 2** — `npx tsc --noEmit`. Commit:
```
git add src/app/api/finance/pnl/route.ts
git commit -m "feat: support compareTo (prev/yoy) on /api/finance/pnl"
```

---

### Task 2.8: P&L comparison table UI

**Files:** Create `src/components/finance/pnl/PnlComparisonTable.tsx`.

Renders the P&L statement with Kỳ này / Kỳ trước / Δ%. Δ on expense rows is colored inverted (increase = red). Uses `computeDeltaPercent` + `formatVnd`.

- [ ] **Step 1** — component:
```tsx
// src/components/finance/pnl/PnlComparisonTable.tsx
import { formatVnd } from "@/lib/finance/format";
import { computeDeltaPercent } from "@/lib/finance/compare";
import type { FinancePnlData } from "@/lib/finance/landing";

function DeltaCell({ current, previous, costRow = false }: { current: number; previous: number; costRow?: boolean }) {
  const d = computeDeltaPercent(current, previous);
  if (d === null) return <td className="px-2 py-1.5 text-right text-slate-400">—</td>;
  // For cost rows an increase is bad (red); for revenue/profit rows increase is good (green).
  const good = costRow ? d <= 0 : d >= 0;
  return <td className={`px-2 py-1.5 text-right font-semibold ${good ? "text-emerald-500" : "text-red-500"}`}>{d >= 0 ? "+" : ""}{d}%</td>;
}

function Row({ label, cur, prev, costRow, indent }: { label: string; cur: number; prev: number; costRow?: boolean; indent?: boolean }) {
  return (
    <tr className="border-b border-slate-50">
      <td className={`py-1.5 ${indent ? "pl-6" : ""}`}>{label}</td>
      <td className="px-2 py-1.5 text-right">{formatVnd(cur)}</td>
      <td className="px-2 py-1.5 text-right text-slate-500">{formatVnd(prev)}</td>
      <DeltaCell current={cur} previous={prev} costRow={costRow} />
    </tr>
  );
}

interface Props {
  current: FinancePnlData;
  previous: FinancePnlData;
}

export function PnlComparisonTable({ current, previous }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-slate-200 text-xs text-slate-500">
            <th className="py-2 text-left">Khoản mục</th>
            <th className="px-2 py-2 text-right">Kỳ này ({current.month})</th>
            <th className="px-2 py-2 text-right">Kỳ trước ({previous.month})</th>
            <th className="px-2 py-2 text-right">Δ</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colSpan={4} className="pt-3 pb-1 font-bold text-blue-600">DOANH THU</td></tr>
          <Row indent label="Tổng phí thu từ shop" cur={current.revenue.totalFeeFromShop} prev={previous.revenue.totalFeeFromShop} />
          <Row indent label="Trừ phí NVC" cur={current.revenue.totalCarrierFee} prev={previous.revenue.totalCarrierFee} costRow />
          <tr className="border-t border-slate-200 font-bold text-blue-600">
            <td className="py-2">DOANH THU RÒNG</td>
            <td className="px-2 py-2 text-right">{formatVnd(current.revenue.netRevenue)}</td>
            <td className="px-2 py-2 text-right text-slate-500">{formatVnd(previous.revenue.netRevenue)}</td>
            <DeltaCell current={current.revenue.netRevenue} previous={previous.revenue.netRevenue} />
          </tr>

          <tr><td colSpan={4} className="pt-3 pb-1 font-bold text-red-500">CHI PHÍ TRỰC TIẾP (Claims)</td></tr>
          <Row indent label="Chênh lệch đền bù" cur={current.claims.claimDiff} prev={previous.claims.claimDiff} />

          <tr className="border-t-2 border-blue-600 bg-slate-50 font-bold text-blue-600">
            <td className="py-2.5">LỢI NHUẬN GỘP</td>
            <td className="px-2 py-2.5 text-right">{formatVnd(current.grossProfit)}</td>
            <td className="px-2 py-2.5 text-right text-slate-500">{formatVnd(previous.grossProfit)}</td>
            <DeltaCell current={current.grossProfit} previous={previous.grossProfit} />
          </tr>

          <tr><td colSpan={4} className="pt-3 pb-1 font-bold text-amber-500">CHI PHÍ VẬN HÀNH</td></tr>
          <Row indent label="Tổng chi phí vận hành" cur={current.totalOperatingExpenses} prev={previous.totalOperatingExpenses} costRow />

          <tr className={`border-t-2 border-slate-800 font-bold ${current.netProfit >= 0 ? "bg-green-50" : "bg-red-50"}`}>
            <td className="py-3 text-[15px]">LỢI NHUẬN RÒNG</td>
            <td className={`px-2 py-3 text-right text-lg ${current.netProfit >= 0 ? "text-emerald-500" : "text-red-500"}`}>{formatVnd(current.netProfit)}</td>
            <td className="px-2 py-3 text-right text-slate-500">{formatVnd(previous.netProfit)}</td>
            <DeltaCell current={current.netProfit} previous={previous.netProfit} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
```
- [ ] **Step 2** — `npx tsc --noEmit`. Commit:
```
git add src/components/finance/pnl/PnlComparisonTable.tsx
git commit -m "feat: add P&L comparison table component"
```

---

### Task 2.9: TargetDialog + wire P&L page (compareTo + targets)

**Files:** Create `src/components/finance/pnl/TargetDialog.tsx`; Modify `src/components/finance/pnl/PnlPageClient.tsx`.

- [ ] **Step 1** — TargetDialog (admin), styled like the other finance dialogs (fixed overlay, centered card):
```tsx
// src/components/finance/pnl/TargetDialog.tsx
"use client";

import { useState } from "react";

interface TargetDialogProps {
  month: string; // "yyyy-MM"
  initialNetRevenue: number | null;
  initialNetProfit: number | null;
  onSaved: () => void;
  onClose: () => void;
}

export default function TargetDialog({ month, initialNetRevenue, initialNetProfit, onSaved, onClose }: TargetDialogProps) {
  const [netRevenue, setNetRevenue] = useState(initialNetRevenue ? String(initialNetRevenue) : "");
  const [netProfit, setNetProfit] = useState(initialNetProfit ? String(initialNetProfit) : "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/finance/targets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month,
        netRevenue: netRevenue ? parseFloat(netRevenue) : null,
        netProfit: netProfit ? parseFloat(netProfit) : null,
      }),
    });
    setSaving(false);
    if (res.ok) { onSaved(); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-base font-bold text-slate-800">🎯 Đặt mục tiêu tháng {month}</h3>
        <label className="mb-1 block text-sm font-semibold text-slate-600">Doanh thu ròng (đ)</label>
        <input type="number" value={netRevenue} onChange={(e) => setNetRevenue(e.target.value)} className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <label className="mb-1 block text-sm font-semibold text-slate-600">Lợi nhuận ròng (đ)</label>
        <input type="number" value={netProfit} onChange={(e) => setNetProfit(e.target.value)} className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Hủy</button>
          <button onClick={save} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Đang lưu..." : "Lưu"}</button>
        </div>
      </div>
    </div>
  );
}
```
- [ ] **Step 2** — Rewrite `PnlPageClient.tsx` to: accept `isAdmin`; add compareTo selector; fetch `/api/finance/pnl?...&compareTo=`; render `PnlComparisonTable`; show targets strip + TargetDialog. Replace the file:
```tsx
// src/components/finance/pnl/PnlPageClient.tsx
"use client";

import { useMemo, useReducer, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { PnlComparisonTable } from "@/components/finance/pnl/PnlComparisonTable";
import { PeriodFilter } from "@/components/finance/shared/PeriodFilter";
import { FinancePanel } from "@/components/finance/shared/FinancePanel";
import { formatVnd } from "@/lib/finance/format";
import { computeTargetPercent } from "@/lib/finance/compare";
import type { FinancePnlData } from "@/lib/finance/landing";
import type { FinanceTargets } from "@/lib/finance/targets";

const TargetDialog = dynamic(() => import("@/components/finance/pnl/TargetDialog"), { ssr: false });

type Filter = { period: string; from: string; to: string };
function reducer(s: Filter, a: Partial<Filter>): Filter { return { ...s, ...a }; }

function rangeFor(period: string, from: string, to: string) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  if (period === "quarter") { const qs = Math.floor(m / 3) * 3; return { from: new Date(y, qs, 1), to: new Date(y, qs + 3, 0) }; }
  if (period === "year") return { from: new Date(y, 0, 1), to: new Date(y, 11, 31) };
  if (period === "custom" && from && to) return { from: new Date(from), to: new Date(to) };
  return { from: new Date(y, m, 1), to: new Date(y, m + 1, 0) };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Lỗi hệ thống");
  return data as T;
}

interface Props {
  isAdmin: boolean;
  initialCompare?: { current: FinancePnlData; previous: FinancePnlData } | null;
  initialTargets?: FinanceTargets;
}

export default function PnlPageClient({ isAdmin, initialCompare, initialTargets }: Props) {
  const [filter, setFilter] = useReducer(reducer, { period: "month", from: "", to: "" });
  const [compareTo, setCompareTo] = useState<"prev" | "yoy">("prev");
  const [dialogOpen, setDialogOpen] = useState(false);

  const dates = useMemo(() => rangeFor(filter.period, filter.from, filter.to), [filter]);
  const fromStr = format(dates.from, "yyyy-MM-dd");
  const toStr = format(dates.to, "yyyy-MM-dd");
  const monthStr = format(dates.from, "yyyy-MM");
  const isDefault = filter.period === "month" && compareTo === "prev";

  const pnlQuery = useQuery({
    queryKey: ["finance-pnl-compare", fromStr, toStr, compareTo],
    queryFn: () => fetchJson<{ current: FinancePnlData; previous: FinancePnlData }>(`/api/finance/pnl?from=${fromStr}&to=${toStr}&compareTo=${compareTo}`),
    initialData: isDefault ? (initialCompare ?? undefined) : undefined,
    placeholderData: (prev) => prev,
  });
  const targetsQuery = useQuery({
    queryKey: ["finance-targets", monthStr],
    queryFn: () => fetchJson<FinanceTargets>(`/api/finance/targets?month=${monthStr}`),
    initialData: filter.period === "month" ? initialTargets : undefined,
    placeholderData: (prev) => prev,
  });

  const data = pnlQuery.data;
  const targets = targetsQuery.data ?? { netRevenue: null, netProfit: null };
  const compareBtn = (v: "prev" | "yoy", label: string) => (
    <button onClick={() => setCompareTo(v)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${compareTo === v ? "border-blue-200 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}>{label}</button>
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">📄 Báo cáo P&L</h1>
          <p className="mt-1 text-sm text-slate-500">Kết quả kinh doanh + so sánh kỳ.</p>
        </div>
        <PeriodFilter
          period={filter.period} customFrom={filter.from} customTo={filter.to}
          onPeriodChange={(p) => setFilter({ period: p })}
          onCustomFromChange={(v) => setFilter({ from: v })}
          onCustomToChange={(v) => setFilter({ to: v })}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-600">So với:</span>
        {compareBtn("prev", "Kỳ trước")}
        {compareBtn("yoy", "Cùng kỳ năm ngoái")}
      </div>

      {data && (
        <FinancePanel>
          <PnlComparisonTable current={data.current} previous={data.previous} />
        </FinancePanel>
      )}

      <FinancePanel>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">
            🎯 <b>Mục tiêu {monthStr}:</b>{" "}
            {targets.netRevenue ? `DT ròng ${formatVnd(targets.netRevenue)}` : "DT ròng —"} ·{" "}
            {targets.netProfit ? `LN ròng ${formatVnd(targets.netProfit)}` : "LN ròng —"}
            {data && targets.netProfit ? ` · đạt ${computeTargetPercent(data.current.netProfit, targets.netProfit)}%` : ""}
          </div>
          {isAdmin && (
            <button onClick={() => setDialogOpen(true)} className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200">⚙ Đặt mục tiêu</button>
          )}
        </div>
      </FinancePanel>

      {dialogOpen && (
        <TargetDialog
          month={monthStr}
          initialNetRevenue={targets.netRevenue}
          initialNetProfit={targets.netProfit}
          onSaved={() => targetsQuery.refetch()}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}
```
- [ ] **Step 3** — Update the P&L server page to pass `isAdmin` + prefetch compare + targets. Replace `src/app/(dashboard)/finance/pnl/page.tsx`:
```tsx
// src/app/(dashboard)/finance/pnl/page.tsx
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { getCachedSession } from "@/lib/cached-session";
import { hasPermission } from "@/lib/route-permissions";
import { getFinancePnlData, getCurrentMonthRange, buildPnlLabel } from "@/lib/finance/landing";
import { getPreviousRange } from "@/lib/finance/compare";
import { getFinanceTargets } from "@/lib/finance/targets";
import PnlPageClient from "@/components/finance/pnl/PnlPageClient";

export default async function FinancePnlPage() {
  const session = await getCachedSession();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user, "canViewFinancePage")) redirect("/no-access");

  const isAdmin = session.user.role === "ADMIN";
  const range = getCurrentMonthRange();
  const prev = getPreviousRange(range);
  const [current, previous, targets] = await Promise.all([
    getFinancePnlData(range, buildPnlLabel(range.from, range.to)),
    getFinancePnlData(prev, buildPnlLabel(prev.from, prev.to)),
    getFinanceTargets(format(range.from, "yyyy-MM")),
  ]);

  return <PnlPageClient isAdmin={isAdmin} initialCompare={{ current, previous }} initialTargets={targets} />;
}
```
- [ ] **Step 4** — `npx tsc --noEmit` + `npm run lint` + manual check `/finance/pnl` (comparison columns; prev/yoy toggle; admin sees target dialog, saves, strip updates). Commit:
```
git add src/components/finance/pnl/TargetDialog.tsx src/components/finance/pnl/PnlPageClient.tsx src/app/(dashboard)/finance/pnl/page.tsx
git commit -m "feat: P&L compare UI + target dialog + prefetch"
```

---

## Self-Review (đã thực hiện)
- **Spec coverage:** FinanceTarget+migration (2.1) ✓; compare helpers (2.2) ✓; targets lib/API (2.3) ✓; dashboard lib/API (2.4) ✓; KpiCard (2.5) ✓; hub period+KPI+targets (2.6) ✓; pnl compareTo API back-compat (2.7) ✓; comparison table (2.8) ✓; target dialog + P&L wiring (2.9) ✓.
- **Placeholder scan:** none — every step has full code/commands.
- **Type consistency:** `FinanceTargets`/`FinanceKpi`/`FinanceDashboardData` defined in 2.3/2.4 and consumed in 2.6/2.9; `computeDeltaPercent`/`computeTargetPercent`/`getPreviousRange`/`getYoyRange` from 2.2 used in 2.4/2.6/2.7/2.8/2.9; `PnlComparisonTable` props match 2.9 usage; pnl route compare shape `{current, previous, compareMode}` matches PnlPageClient.
- **Back-compat:** `/api/finance/pnl` returns flat shape without `compareTo`; Phase-1 callers unaffected (PnlPageClient is updated in same phase to send compareTo).
- **Risk note:** `OverviewSummaryCards` becomes unused by the hub (kept on disk; safe). Migration requires a reachable dev DB; if unavailable use `--create-only` and apply later.
