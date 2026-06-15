# Finance Redesign — Phase 0 & 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng nền tảng cho cụm trang Tài chính (sidebar nhóm, shared components, route khung) và tách `/finance` 3-tab hiện tại thành 5 trang riêng đạt parity (không đổi nghiệp vụ), bỏ tab-trong-tab, redirect URL cũ.

**Architecture:** Mỗi trang là 1 `page.tsx` server component (auth + `hasPermission("canViewFinancePage")` + prefetch) bọc một client component. Các thành phần dùng chung (PeriodFilter, MoneyText, FinancePanel, SegmentedNav) là **presentational/controlled** — không tự gắn URL — để drop-in thay cho UI rời rạc hiện tại với rủi ro thấp. Logic thuần (format tiền, parse/serialize period, resolve segment) tách ra lib để unit-test không cần mock Prisma. Phase 1 **tái dùng nguyên** các component nghiệp vụ đã có (`PnLSection`, `ExpenseSection`, `BudgetSection`, `CashbookTab`, các bảng/chart trong `AnalysisTab`) — chỉ di chuyển vị trí và bọc lại, không viết lại công thức.

**Tech Stack:** Next.js App Router, React, TanStack React Query, Recharts, Prisma, Vitest, Tailwind. (Không thêm thư viện mới ở 2 phase này.)

**Branch:** đang ở `feature/finance-redesign` (đã có commit spec). Tiếp tục trên nhánh này.

**Quy ước codebase quan trọng:**
- Mọi chuỗi hiển thị là tiếng Việt có dấu; file lưu UTF-8 (repo có test chống mojibake).
- Test: `npx vitest run <file>` (PowerShell). Lint: `npm run lint`. Typecheck: `npx tsc --noEmit`.
- Commit message tiếng Anh, prefix `feat:`/`refactor:`/`test:`/`chore:` như lịch sử repo. Mỗi task kết thúc bằng 1 commit.
- Server page pattern (theo `src/app/(dashboard)/finance/page.tsx` hiện tại):
  ```tsx
  const session = await getCachedSession();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user, "canViewFinancePage")) redirect("/no-access");
  const isAdmin = session.user.role === "ADMIN";
  ```
- Định dạng tiền hiện tại lặp khắp nơi: `new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ"`.

---

## File Structure

### Phase 0 — Nền tảng (tạo mới, chưa đổi hành vi trang)

| File | Vai trò |
|---|---|
| Create: `src/lib/finance/format.ts` | `formatVnd(n)` dùng chung |
| Test: `src/__tests__/lib/finance-format.test.ts` | Unit test `formatVnd` |
| Create: `src/lib/finance/period-url.ts` | `readPeriodFromParams`, `buildPeriodSearch` (logic thuần, không React) |
| Test: `src/__tests__/lib/finance-period-url.test.ts` | Unit test 2 hàm trên |
| Create: `src/lib/finance/segment.ts` | `resolveActiveSegment(param, ids, fallback)` |
| Test: `src/__tests__/lib/finance-segment.test.ts` | Unit test resolve segment |
| Create: `src/components/finance/shared/MoneyText.tsx` | Hiển thị tiền VND, tùy chọn tô màu âm/dương |
| Create: `src/components/finance/shared/FinancePanel.tsx` | Khung panel trắng bo góc + tiêu đề/actions |
| Create: `src/components/finance/shared/PeriodFilter.tsx` | Hàng nút kỳ + custom range (controlled) |
| Create: `src/components/finance/shared/SegmentedNav.tsx` | Thanh phân đoạn (controlled) |
| Create: `src/lib/finance/use-finance-period.ts` | Hook đọc/ghi period vào URL (cho trang mới) |
| Modify: `src/components/layout/Sidebar.tsx` | "Tài Chính" → nhóm có 5 menu con + flyout khi thu gọn |

### Phase 1 — Tách trang đạt parity

| File | Vai trò |
|---|---|
| Create: `src/app/(dashboard)/finance/pnl/page.tsx` | Route P&L (server) |
| Create: `src/components/finance/pnl/PnlPageClient.tsx` | Client: fetch P&L + render `PnLSection` |
| Create: `src/app/(dashboard)/finance/expenses/page.tsx` | Route Chi phí & Ngân sách (server) |
| Create: `src/components/finance/expenses/ExpensesPageClient.tsx` | Client: Expense + Budget + dialogs |
| Create: `src/app/(dashboard)/finance/cashbook/page.tsx` | Route Sổ quỹ (server) |
| Create: `src/components/finance/cashbook/CashbookPageClient.tsx` | Client mỏng bọc `CashbookTab` |
| Create: `src/app/(dashboard)/finance/analysis/page.tsx` | Route Phân tích (server) |
| Modify: `src/components/finance/AnalysisTab.tsx` | Thay hàng nút VIEWS bằng `SegmentedNav` |
| Rewrite: `src/app/(dashboard)/finance/page.tsx` | Thành Bảng điều khiển cơ bản + redirect `?tab=` cũ |
| Create: `src/components/finance/dashboard/DashboardPageClient.tsx` | Client hub cơ bản (KPI cards + charts + P&L tóm tắt + link nhanh) |
| Delete: `src/components/finance/FinancePageClient.tsx` | Bỏ orchestration tab (sau khi route mới chạy) |
| Modify: `src/components/finance/OverviewTab.tsx` | Còn lại không dùng → xóa ở task dọn dẹp |

Không đổi: schema DB, các API route finance hiện có, các dialog (`ExpenseDialog`/`CategoryDialog`/`BudgetDialog`), `financeResponsive.ts`, công thức trong `src/lib/finance/landing.ts`.

---

## PHASE 0 — NỀN TẢNG

### Task 0.1: Util `formatVnd` + `<MoneyText>`

**Files:**
- Create: `src/lib/finance/format.ts`
- Test: `src/__tests__/lib/finance-format.test.ts`
- Create: `src/components/finance/shared/MoneyText.tsx`

- [ ] **Step 1: Viết test thất bại**

```ts
// src/__tests__/lib/finance-format.test.ts
import { describe, expect, it } from "vitest";
import { formatVnd } from "@/lib/finance/format";

describe("formatVnd", () => {
  it("định dạng số nguyên kèm hậu tố đ", () => {
    expect(formatVnd(1234567)).toBe("1.234.567đ");
  });
  it("làm tròn số thập phân", () => {
    expect(formatVnd(1000.6)).toBe("1.001đ");
  });
  it("xử lý số âm", () => {
    expect(formatVnd(-2000)).toBe("-2.000đ");
  });
  it("0 trả về 0đ", () => {
    expect(formatVnd(0)).toBe("0đ");
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npx vitest run src/__tests__/lib/finance-format.test.ts`
Expected: FAIL — không import được `formatVnd`.

- [ ] **Step 3: Viết implementation**

```ts
// src/lib/finance/format.ts
export function formatVnd(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(value)) + "đ";
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npx vitest run src/__tests__/lib/finance-format.test.ts`
Expected: PASS (4 test).

- [ ] **Step 5: Tạo `<MoneyText>`**

```tsx
// src/components/finance/shared/MoneyText.tsx
import { formatVnd } from "@/lib/finance/format";

interface MoneyTextProps {
  value: number;
  /** Tô xanh khi ≥ 0, đỏ khi < 0 */
  colored?: boolean;
  /** Thêm dấu + cho số dương */
  showPlus?: boolean;
  className?: string;
}

export function MoneyText({ value, colored, showPlus, className }: MoneyTextProps) {
  const sign = showPlus && value > 0 ? "+" : "";
  const colorClass = colored ? (value >= 0 ? "text-emerald-600" : "text-red-600") : "";
  return <span className={`${colorClass} ${className ?? ""}`.trim()}>{sign}{formatVnd(value)}</span>;
}
```

- [ ] **Step 6: Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: không lỗi.

```bash
git add src/lib/finance/format.ts src/__tests__/lib/finance-format.test.ts src/components/finance/shared/MoneyText.tsx
git commit -m "feat: add shared formatVnd util and MoneyText component"
```

---

### Task 0.2: `<FinancePanel>`

**Files:**
- Create: `src/components/finance/shared/FinancePanel.tsx`

- [ ] **Step 1: Viết component**

```tsx
// src/components/finance/shared/FinancePanel.tsx
import type { ReactNode } from "react";

interface FinancePanelProps {
  title?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function FinancePanel({ title, actions, className, children }: FinancePanelProps) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className ?? ""}`.trim()}>
      {(title || actions) && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {title && <h3 className="text-base font-bold text-slate-800">{title}</h3>}
          {actions && <div className="flex flex-col gap-2 sm:flex-row">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: không lỗi.

```bash
git add src/components/finance/shared/FinancePanel.tsx
git commit -m "feat: add shared FinancePanel wrapper"
```

---

### Task 0.3: Logic period + `<PeriodFilter>` + hook URL

**Files:**
- Create: `src/lib/finance/period-url.ts`
- Test: `src/__tests__/lib/finance-period-url.test.ts`
- Create: `src/components/finance/shared/PeriodFilter.tsx`
- Create: `src/lib/finance/use-finance-period.ts`

- [ ] **Step 1: Viết test thất bại cho logic thuần**

```ts
// src/__tests__/lib/finance-period-url.test.ts
import { describe, expect, it } from "vitest";
import { buildPeriodSearch, readPeriodFromParams } from "@/lib/finance/period-url";

describe("readPeriodFromParams", () => {
  it("mặc định month khi thiếu tham số", () => {
    expect(readPeriodFromParams(new URLSearchParams())).toEqual({ period: "month", from: "", to: "" });
  });
  it("đọc custom range", () => {
    const p = new URLSearchParams("period=custom&from=2026-01-01&to=2026-01-31");
    expect(readPeriodFromParams(p)).toEqual({ period: "custom", from: "2026-01-01", to: "2026-01-31" });
  });
});

describe("buildPeriodSearch", () => {
  it("preset chỉ có period", () => {
    expect(buildPeriodSearch("quarter", "", "")).toBe("period=quarter");
  });
  it("custom kèm from/to", () => {
    expect(buildPeriodSearch("custom", "2026-01-01", "2026-01-31"))
      .toBe("period=custom&from=2026-01-01&to=2026-01-31");
  });
  it("custom thiếu ngày thì bỏ qua from/to", () => {
    expect(buildPeriodSearch("custom", "", "")).toBe("period=custom");
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npx vitest run src/__tests__/lib/finance-period-url.test.ts`
Expected: FAIL — chưa có module.

- [ ] **Step 3: Viết implementation logic thuần**

```ts
// src/lib/finance/period-url.ts
export interface PeriodSelection {
  period: string;
  from: string;
  to: string;
}

export function readPeriodFromParams(params: URLSearchParams): PeriodSelection {
  return {
    period: params.get("period") || "month",
    from: params.get("from") || "",
    to: params.get("to") || "",
  };
}

export function buildPeriodSearch(period: string, from: string, to: string): string {
  const params = new URLSearchParams({ period });
  if (period === "custom" && from && to) {
    params.set("from", from);
    params.set("to", to);
  }
  return params.toString();
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npx vitest run src/__tests__/lib/finance-period-url.test.ts`
Expected: PASS (5 test).

- [ ] **Step 5: Viết `<PeriodFilter>` (controlled, không tự gắn URL)**

```tsx
// src/components/finance/shared/PeriodFilter.tsx
"use client";

import { memo } from "react";

export const FINANCE_PERIODS = [
  { value: "month", label: "Tháng này" },
  { value: "last_month", label: "Tháng trước" },
  { value: "quarter", label: "Quý này" },
  { value: "year", label: "Năm nay" },
  { value: "custom", label: "Tùy chọn" },
] as const;

interface PeriodFilterProps {
  period: string;
  customFrom: string;
  customTo: string;
  onPeriodChange: (period: string) => void;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
}

function pillClass(active: boolean) {
  return `whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
    active
      ? "border-blue-200 bg-blue-600 text-white"
      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800"
  }`;
}

function PeriodFilterInner({
  period,
  customFrom,
  customTo,
  onPeriodChange,
  onCustomFromChange,
  onCustomToChange,
}: PeriodFilterProps) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {FINANCE_PERIODS.map((p) => (
            <button key={p.value} onClick={() => onPeriodChange(p.value)} className={pillClass(period === p.value)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {period === "custom" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[auto,1fr,auto,1fr] lg:items-center">
          <label className="text-sm font-semibold text-slate-600">Từ</label>
          <input type="date" value={customFrom} onChange={(e) => onCustomFromChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <label className="text-sm font-semibold text-slate-600">Đến</label>
          <input type="date" value={customTo} onChange={(e) => onCustomToChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
      )}
    </div>
  );
}

export const PeriodFilter = memo(PeriodFilterInner);
```

- [ ] **Step 6: Viết hook URL cho trang mới**

```ts
// src/lib/finance/use-finance-period.ts
"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildPeriodSearch, readPeriodFromParams } from "@/lib/finance/period-url";

export function useFinancePeriod() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selection = readPeriodFromParams(new URLSearchParams(searchParams.toString()));

  const push = useCallback(
    (period: string, from: string, to: string) => {
      const search = buildPeriodSearch(period, from, to);
      router.push(`${pathname}?${search}`, { scroll: false });
    },
    [router, pathname],
  );

  return {
    ...selection,
    setPeriod: (period: string) => push(period, selection.from, selection.to),
    setCustomFrom: (from: string) => push(selection.period, from, selection.to),
    setCustomTo: (to: string) => push(selection.period, selection.from, to),
  };
}
```

- [ ] **Step 7: Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: không lỗi.

```bash
git add src/lib/finance/period-url.ts src/__tests__/lib/finance-period-url.test.ts src/components/finance/shared/PeriodFilter.tsx src/lib/finance/use-finance-period.ts
git commit -m "feat: add finance period-url helpers, PeriodFilter, useFinancePeriod hook"
```

---

### Task 0.4: `<SegmentedNav>` + resolve helper

**Files:**
- Create: `src/lib/finance/segment.ts`
- Test: `src/__tests__/lib/finance-segment.test.ts`
- Create: `src/components/finance/shared/SegmentedNav.tsx`

- [ ] **Step 1: Viết test thất bại**

```ts
// src/__tests__/lib/finance-segment.test.ts
import { describe, expect, it } from "vitest";
import { resolveActiveSegment } from "@/lib/finance/segment";

describe("resolveActiveSegment", () => {
  const ids = ["carrier", "shop", "negative"];
  it("trả về param khi hợp lệ", () => {
    expect(resolveActiveSegment("shop", ids, "carrier")).toBe("shop");
  });
  it("trả về fallback khi param null", () => {
    expect(resolveActiveSegment(null, ids, "carrier")).toBe("carrier");
  });
  it("trả về fallback khi param không thuộc danh sách", () => {
    expect(resolveActiveSegment("xxx", ids, "carrier")).toBe("carrier");
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npx vitest run src/__tests__/lib/finance-segment.test.ts`
Expected: FAIL — chưa có module.

- [ ] **Step 3: Viết implementation**

```ts
// src/lib/finance/segment.ts
export function resolveActiveSegment(param: string | null, ids: string[], fallback: string): string {
  return param && ids.includes(param) ? param : fallback;
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npx vitest run src/__tests__/lib/finance-segment.test.ts`
Expected: PASS (3 test).

- [ ] **Step 5: Viết `<SegmentedNav>`**

```tsx
// src/components/finance/shared/SegmentedNav.tsx
"use client";

interface SegmentItem {
  id: string;
  label: string;
}

interface SegmentedNavProps {
  items: SegmentItem[];
  active: string;
  onChange: (id: string) => void;
}

export function SegmentedNav({ items, active, onChange }: SegmentedNavProps) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            active === item.id ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: không lỗi.

```bash
git add src/lib/finance/segment.ts src/__tests__/lib/finance-segment.test.ts src/components/finance/shared/SegmentedNav.tsx
git commit -m "feat: add SegmentedNav component and resolveActiveSegment helper"
```

---

### Task 0.5: Sidebar — nhóm "Tài chính" có menu con

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

Mục tiêu: thay 1 link `/finance` bằng nhóm bung được. Khi sidebar mở rộng (`isExpanded`): hiện tiêu đề nhóm + 5 link con thụt lề. Khi thu gọn: icon nhóm, hover hiện flyout chứa 5 link con.

- [ ] **Step 1: Định nghĩa danh sách trang con (sau `NAV_ITEMS`)**

```tsx
// src/components/layout/Sidebar.tsx — thêm dưới khai báo NAV_ITEMS
const FINANCE_CHILDREN: { href: string; label: string }[] = [
  { href: "/finance", label: "Bảng điều khiển" },
  { href: "/finance/pnl", label: "Báo cáo P&L" },
  { href: "/finance/cashbook", label: "Sổ quỹ" },
  { href: "/finance/expenses", label: "Chi phí & Ngân sách" },
  { href: "/finance/analysis", label: "Phân tích" },
];
```

- [ ] **Step 2: Bỏ mục `/finance` đơn khỏi `NAV_ITEMS`**

Trong mảng `NAV_ITEMS`, **xóa** dòng:
```tsx
{ href: "/finance", label: "Tài Chính", icon: BarChart2, requiredPermission: "canViewFinancePage" },
```
(Nhóm Tài chính sẽ được render riêng ngay sau danh sách `visibleItems`.)

- [ ] **Step 3: Thêm hàm xác định active của nhóm + state mở**

Trong component `Sidebar`, thêm cạnh các state khác:
```tsx
const financeVisible = userRole === "ADMIN" || !!permissions?.canViewFinancePage;
const financeActive = pathname.startsWith("/finance");
const [financeOpen, setFinanceOpen] = useState(financeActive);
```

- [ ] **Step 4: Render nhóm trong `<nav>`**

Trong `sidebarContent`, ngay **sau** khối `{visibleItems.map(...)}` bên trong `<nav>`, thêm:

```tsx
{financeVisible && (
  <div className="group/finance relative">
    <button
      onClick={() => (isMobile || isExpanded) && setFinanceOpen((v) => !v)}
      title={!isMobile && !isExpanded ? "Tài Chính" : undefined}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
        financeActive ? "text-white" : "text-slate-400 hover:text-white hover:bg-slate-800",
      )}
    >
      <BarChart2 className="w-4 h-4 shrink-0" />
      {(isMobile || isExpanded) && (
        <>
          <span className="truncate whitespace-nowrap flex-1 text-left">Tài Chính</span>
          <ChevronRight className={cn("w-4 h-4 transition-transform", financeOpen && "rotate-90")} />
        </>
      )}
    </button>

    {/* Mở rộng/mobile: danh sách con thụt lề */}
    {(isMobile || isExpanded) && financeOpen && (
      <div className="mt-1 space-y-1 pl-9">
        {FINANCE_CHILDREN.map((child) => {
          const active = child.href === "/finance"
            ? pathname === "/finance"
            : pathname.startsWith(child.href);
          return (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-blue-600 text-white font-semibold" : "text-slate-400 hover:text-white hover:bg-slate-800",
              )}
            >
              {child.label}
            </Link>
          );
        })}
      </div>
    )}

    {/* Thu gọn (desktop): flyout khi hover */}
    {!isMobile && !isExpanded && (
      <div className="absolute left-full top-0 ml-2 hidden min-w-[200px] rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl group-hover/finance:block z-50">
        <div className="px-2 pb-1 text-xs font-bold uppercase tracking-wide text-blue-300">Tài Chính</div>
        {FINANCE_CHILDREN.map((child) => {
          const active = child.href === "/finance"
            ? pathname === "/finance"
            : pathname.startsWith(child.href);
          return (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm transition-colors whitespace-nowrap",
                active ? "bg-blue-600 text-white font-semibold" : "text-slate-300 hover:text-white hover:bg-slate-800",
              )}
            >
              {child.label}
            </Link>
          );
        })}
      </div>
    )}
  </div>
)}
```

- [ ] **Step 5: Kiểm tra thủ công + typecheck**

Run: `npx tsc --noEmit`
Expected: không lỗi.
Khởi động app (`npm run dev`), kiểm tra: nhóm Tài chính hiện 5 mục con khi mở rộng; hover khi thu gọn hiện flyout; active đúng theo route.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: turn Tài chính nav into expandable group with submenu and flyout"
```

---

## PHASE 1 — TÁCH TRANG ĐẠT PARITY

> Thứ tự: tạo các trang con trước (pnl, cashbook, expenses, analysis), rồi mới sửa `/finance` thành dashboard + redirect, cuối cùng dọn dẹp. Làm vậy để mọi link con đã tồn tại trước khi redirect trỏ tới.

### Task 1.1: Trang Báo cáo P&L

**Files:**
- Create: `src/app/(dashboard)/finance/pnl/page.tsx`
- Create: `src/components/finance/pnl/PnlPageClient.tsx`

Parity: tái dùng nguyên `PnLSection` (đã có period selector nội bộ + bảng). Client fetch `/api/finance/pnl` theo state period nội bộ, y như `OverviewTab` đang làm.

- [ ] **Step 1: Viết client component**

```tsx
// src/components/finance/pnl/PnlPageClient.tsx
"use client";

import { useReducer, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { PnLSection } from "@/components/finance/PnLSection";
import type { FinancePnlData } from "@/lib/finance/landing";

const INITIAL_AT = Date.now();

type PnlFilterState = { period: string; customFromInput: string; customToInput: string; customFrom: string; customTo: string };
type PnlFilterAction =
  | { type: "SET_PERIOD"; period: string }
  | { type: "SET_CUSTOM_FROM_INPUT"; value: string }
  | { type: "SET_CUSTOM_TO_INPUT"; value: string }
  | { type: "APPLY_CUSTOM" };

function reducer(state: PnlFilterState, action: PnlFilterAction): PnlFilterState {
  switch (action.type) {
    case "SET_PERIOD": return { ...state, period: action.period };
    case "SET_CUSTOM_FROM_INPUT": return { ...state, customFromInput: action.value };
    case "SET_CUSTOM_TO_INPUT": return { ...state, customToInput: action.value };
    case "APPLY_CUSTOM": return { ...state, customFrom: state.customFromInput, customTo: state.customToInput };
    default: return state;
  }
}

function buildPnlDateRange(period: string, from: string, to: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (period === "quarter") {
    const qs = Math.floor(month / 3) * 3;
    return { from: new Date(year, qs, 1), to: new Date(year, qs + 3, 0) };
  }
  if (period === "year") return { from: new Date(year, 0, 1), to: new Date(year, 11, 31) };
  if (period === "custom" && from && to) return { from: new Date(from), to: new Date(to) };
  return { from: new Date(year, month, 1), to: new Date(year, month + 1, 0) };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Lỗi hệ thống");
  return data as T;
}

export default function PnlPageClient({ initialPnl }: { initialPnl?: FinancePnlData | null }) {
  const [filter, dispatch] = useReducer(reducer, {
    period: "month", customFromInput: "", customToInput: "", customFrom: "", customTo: "",
  });
  const dates = useMemo(() => buildPnlDateRange(filter.period, filter.customFrom, filter.customTo), [filter.period, filter.customFrom, filter.customTo]);
  const fromStr = format(dates.from, "yyyy-MM-dd");
  const toStr = format(dates.to, "yyyy-MM-dd");

  const pnlQuery = useQuery({
    queryKey: ["finance-pnl", fromStr, toStr],
    queryFn: () => fetchJson<FinancePnlData>(`/api/finance/pnl?from=${fromStr}&to=${toStr}`),
    initialData: initialPnl && filter.period === "month" && !filter.customFrom ? initialPnl : undefined,
    initialDataUpdatedAt: initialPnl ? INITIAL_AT : undefined,
    placeholderData: (prev) => prev,
  });

  const pnl = pnlQuery.data ?? initialPnl ?? null;

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">📄 Báo cáo P&amp;L</h1>
        <p className="mt-1 text-sm text-slate-500">Kết quả kinh doanh theo kỳ.</p>
      </div>
      {pnl && (
        <PnLSection
          pnl={pnl}
          pnlPeriod={filter.period}
          pnlCustomFromInput={filter.customFromInput}
          pnlCustomToInput={filter.customToInput}
          onPnlPeriodChange={(p) => dispatch({ type: "SET_PERIOD", period: p })}
          onPnlCustomFromInputChange={(v) => dispatch({ type: "SET_CUSTOM_FROM_INPUT", value: v })}
          onPnlCustomToInputChange={(v) => dispatch({ type: "SET_CUSTOM_TO_INPUT", value: v })}
          onApplyPnlCustomRange={() => dispatch({ type: "APPLY_CUSTOM" })}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Viết server page**

```tsx
// src/app/(dashboard)/finance/pnl/page.tsx
import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/cached-session";
import { hasPermission } from "@/lib/route-permissions";
import { getFinancePnlData, getCurrentMonthRange } from "@/lib/finance/landing";
import PnlPageClient from "@/components/finance/pnl/PnlPageClient";

export default async function FinancePnlPage() {
  const session = await getCachedSession();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user, "canViewFinancePage")) redirect("/no-access");

  const initialPnl = await getFinancePnlData(getCurrentMonthRange());
  return <PnlPageClient initialPnl={initialPnl} />;
}
```

- [ ] **Step 3: Typecheck + chạy thử**

Run: `npx tsc --noEmit`
Expected: không lỗi. Mở `/finance/pnl`: bảng P&L hiển thị, đổi kỳ hoạt động như tab cũ.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/finance/pnl/page.tsx src/components/finance/pnl/PnlPageClient.tsx
git commit -m "feat: add standalone /finance/pnl page reusing PnLSection"
```

---

### Task 1.2: Trang Chi phí & Ngân sách

**Files:**
- Create: `src/app/(dashboard)/finance/expenses/page.tsx`
- Create: `src/components/finance/expenses/ExpensesPageClient.tsx`

Parity: tái dùng `ExpenseSection`, `BudgetSection`, các dialog. Đây là phần đã có sẵn trong `OverviewTab`; ta tách phần CRUD chi phí + ngân sách ra client riêng. **Thêm mới (đúng spec): bộ lọc danh mục cho khoản chi.**

- [ ] **Step 1: Viết client component**

```tsx
// src/components/finance/expenses/ExpensesPageClient.tsx
"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { ExpenseSection } from "@/components/finance/ExpenseSection";
import { BudgetSection } from "@/components/finance/BudgetSection";
import type { FinanceBudgetSummary, FinanceCategoryOption } from "@/lib/finance/landing";

const ExpenseDialog = dynamic(() => import("@/components/finance/ExpenseDialog"), { ssr: false });
const CategoryDialog = dynamic(() => import("@/components/finance/CategoryDialog"), { ssr: false });
const BudgetDialog = dynamic(() => import("@/components/finance/BudgetDialog"), { ssr: false });

type ExpenseItem = { id: string; categoryId: string; title: string; amount: number; date: string; note?: string | null; category?: { name?: string | null } | null };
const EMPTY_FORM = { categoryId: "", title: "", amount: "", date: "", note: "" };

type DialogState = { expense: boolean; category: boolean; budget: boolean };
function dialogReducer(s: DialogState, a: { type: "OPEN" | "CLOSE"; dialog: keyof DialogState }): DialogState {
  return { ...s, [a.dialog]: a.type === "OPEN" };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Lỗi hệ thống");
  return data as T;
}

interface Props {
  isAdmin: boolean;
  initialCategories: FinanceCategoryOption[];
  initialBudgets: FinanceBudgetSummary;
}

export default function ExpensesPageClient({ isAdmin, initialCategories, initialBudgets }: Props) {
  const queryClient = useQueryClient();
  const { confirm, element: confirmDialog } = useConfirmDialog();

  const monthDate = useMemo(() => new Date(), []);
  const monthStr = format(monthDate, "yyyy-MM");
  const fromStr = format(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1), "yyyy-MM-dd");
  const toStr = format(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0), "yyyy-MM-dd");

  const [dialogs, dispatchDialogs] = useReducer(dialogReducer, { expense: false, category: false, budget: false });
  const [categories, setCategories] = useState<FinanceCategoryOption[]>(initialCategories);
  const [editing, setEditing] = useState<ExpenseItem | null>(null);
  const [expForm, setExpForm] = useState(EMPTY_FORM);
  const [newCat, setNewCat] = useState("");
  const [budgetForm, setBudgetForm] = useState<Record<string, string>>({});
  const [categoryFilter, setCategoryFilter] = useState("");
  const [fetchEnabled, setFetchEnabled] = useState(false);
  useEffect(() => { const f = requestAnimationFrame(() => setFetchEnabled(true)); return () => cancelAnimationFrame(f); }, []);

  const expensesQuery = useQuery({
    queryKey: ["finance-expenses", fromStr, toStr],
    queryFn: () => fetchJson<{ expenses: ExpenseItem[] }>(`/api/finance/expenses?from=${fromStr}&to=${toStr}`),
    enabled: fetchEnabled,
    placeholderData: (prev) => prev,
  });
  const budgetsQuery = useQuery({
    queryKey: ["finance-budgets", monthStr],
    queryFn: () => fetchJson<FinanceBudgetSummary>(`/api/finance/budgets?month=${monthStr}`),
    initialData: initialBudgets,
  });

  const allExpenses = expensesQuery.data?.expenses ?? [];
  const expenses = categoryFilter ? allExpenses.filter((e) => e.categoryId === categoryFilter) : allExpenses;
  const budgets = budgetsQuery.data ?? initialBudgets;

  const refreshAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["finance-expenses"] }),
      queryClient.invalidateQueries({ queryKey: ["finance-budgets"] }),
    ]);
  }, [queryClient]);

  const refreshCategories = useCallback(async () => {
    const data = await fetchJson<{ categories: FinanceCategoryOption[] }>("/api/finance/categories");
    setCategories(data.categories || []);
    await refreshAll();
  }, [refreshAll]);

  const saveExpense = useCallback(async () => {
    const url = editing ? `/api/finance/expenses/${editing.id}` : "/api/finance/expenses";
    await fetchJson(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(expForm) });
    dispatchDialogs({ type: "CLOSE", dialog: "expense" });
    setEditing(null); setExpForm(EMPTY_FORM);
    await refreshAll();
  }, [editing, expForm, refreshAll]);

  const deleteExpense = useCallback(async (id: string) => {
    const ok = await confirm({ title: "Xóa khoản chi?", description: "Khoản chi sẽ bị xóa vĩnh viễn.", confirmLabel: "Xóa", cancelLabel: "Hủy", tone: "danger", icon: <Trash2 size={26} /> });
    if (!ok) return;
    await fetchJson(`/api/finance/expenses/${id}`, { method: "DELETE" });
    await refreshAll();
  }, [confirm, refreshAll]);

  const addCategory = useCallback(async () => {
    if (!newCat.trim()) return;
    await fetchJson("/api/finance/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCat }) });
    setNewCat(""); await refreshCategories();
  }, [newCat, refreshCategories]);

  const deleteCategory = useCallback(async (id: string) => {
    const ok = await confirm({ title: "Xóa danh mục?", description: "Không thể xóa danh mục đang có khoản chi.", confirmLabel: "Xóa", cancelLabel: "Hủy", tone: "danger", icon: <Trash2 size={26} /> });
    if (!ok) return;
    try { await fetchJson(`/api/finance/categories/${id}`, { method: "DELETE" }); await refreshCategories(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi hệ thống"); }
  }, [confirm, refreshCategories]);

  const saveBudgets = useCallback(async () => {
    const arr = Object.entries(budgetForm).map(([categoryId, amount]) => ({ categoryId, amount: parseFloat(amount) || 0 }));
    await fetchJson("/api/finance/budgets", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month: monthStr, budgets: arr }) });
    dispatchDialogs({ type: "CLOSE", dialog: "budget" });
    await refreshAll();
  }, [budgetForm, monthStr, refreshAll]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-3 py-4 sm:px-4 sm:py-5 sm:space-y-6 md:px-6 md:py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">💸 Chi phí &amp; Ngân sách</h1>
        <p className="mt-1 text-sm text-slate-500">Quản lý khoản chi và ngân sách hằng tháng.</p>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-semibold text-slate-600">Lọc danh mục:</label>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Tất cả</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      <ExpenseSection
        isAdmin={isAdmin}
        expenses={expenses}
        shouldFetchExpenses={fetchEnabled}
        onOpenCatDialog={() => dispatchDialogs({ type: "OPEN", dialog: "category" })}
        onAddExpense={() => { setEditing(null); setExpForm(EMPTY_FORM); dispatchDialogs({ type: "OPEN", dialog: "expense" }); }}
        onEditExpense={(e) => { setEditing(e); setExpForm({ categoryId: e.categoryId, title: e.title, amount: String(e.amount), date: e.date?.slice(0, 10), note: e.note || "" }); dispatchDialogs({ type: "OPEN", dialog: "expense" }); }}
        onDeleteExpense={deleteExpense}
      />

      <BudgetSection
        isAdmin={isAdmin}
        budgets={budgets}
        onOpenBudgetDialog={() => { const f: Record<string, string> = {}; budgets.budgets?.forEach((b) => { f[b.categoryId] = String(b.budgetAmount || 0); }); setBudgetForm(f); dispatchDialogs({ type: "OPEN", dialog: "budget" }); }}
      />

      {dialogs.expense && <ExpenseDialog isEditing={!!editing} expForm={expForm} categories={categories} onFormChange={setExpForm} onSave={saveExpense} onClose={() => dispatchDialogs({ type: "CLOSE", dialog: "expense" })} />}
      {dialogs.category && <CategoryDialog categories={categories} newCat={newCat} onNewCatChange={setNewCat} onAddCategory={addCategory} onDeleteCategory={deleteCategory} onClose={() => dispatchDialogs({ type: "CLOSE", dialog: "category" })} />}
      {dialogs.budget && <BudgetDialog month={budgets.month} categories={categories} budgetForm={budgetForm} onBudgetFormChange={setBudgetForm} onSave={saveBudgets} onClose={() => dispatchDialogs({ type: "CLOSE", dialog: "budget" })} />}
      {confirmDialog}
    </div>
  );
}
```

- [ ] **Step 2: Viết server page**

```tsx
// src/app/(dashboard)/finance/expenses/page.tsx
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { getCachedSession } from "@/lib/cached-session";
import { hasPermission } from "@/lib/route-permissions";
import { getFinanceLandingCategories, getFinanceBudgetSummary } from "@/lib/finance/landing";
import ExpensesPageClient from "@/components/finance/expenses/ExpensesPageClient";

export default async function FinanceExpensesPage() {
  const session = await getCachedSession();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user, "canViewFinancePage")) redirect("/no-access");

  const isAdmin = session.user.role === "ADMIN";
  const categories = await getFinanceLandingCategories();
  const budgets = await getFinanceBudgetSummary(format(new Date(), "yyyy-MM"), categories);

  return <ExpensesPageClient isAdmin={isAdmin} initialCategories={categories} initialBudgets={budgets} />;
}
```

- [ ] **Step 3: Typecheck + chạy thử**

Run: `npx tsc --noEmit`
Expected: không lỗi. Mở `/finance/expenses`: CRUD khoản chi, danh mục, ngân sách hoạt động; bộ lọc danh mục lọc đúng.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/finance/expenses/page.tsx src/components/finance/expenses/ExpensesPageClient.tsx
git commit -m "feat: add /finance/expenses page (expenses + budgets + category filter)"
```

---

### Task 1.3: Trang Sổ quỹ

**Files:**
- Create: `src/app/(dashboard)/finance/cashbook/page.tsx`
- Create: `src/components/finance/cashbook/CashbookPageClient.tsx`

Parity: tái dùng nguyên `CashbookTab` (đã tự fetch dữ liệu). Client chỉ bọc tiêu đề + `CashbookTab`.

- [ ] **Step 1: Viết client wrapper**

```tsx
// src/components/finance/cashbook/CashbookPageClient.tsx
"use client";

import dynamic from "next/dynamic";

const CashbookTab = dynamic(() => import("@/components/finance/CashbookTab"), {
  loading: () => <div className="flex h-96 items-center justify-center text-slate-400">Đang tải...</div>,
});

export default function CashbookPageClient({ initialData }: { initialData?: unknown }) {
  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">🏦 Sổ quỹ</h1>
        <p className="mt-1 text-sm text-slate-500">Đối soát dòng tiền COD, trả shop và số dư quỹ.</p>
      </div>
      <CashbookTab initialData={initialData} />
    </div>
  );
}
```

- [ ] **Step 2: Viết server page**

```tsx
// src/app/(dashboard)/finance/cashbook/page.tsx
import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/cached-session";
import { hasPermission } from "@/lib/route-permissions";
import { getFinanceCashbookInitialData } from "@/lib/finance/page-data";
import CashbookPageClient from "@/components/finance/cashbook/CashbookPageClient";

interface Props { searchParams: Promise<Record<string, string | string[] | undefined>>; }

export default async function FinanceCashbookPage({ searchParams }: Props) {
  const session = await getCachedSession();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user, "canViewFinancePage")) redirect("/no-access");

  const resolved = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(resolved)) if (typeof v === "string") params.set(k, v);

  const initialData = await getFinanceCashbookInitialData(params);
  return <CashbookPageClient initialData={initialData} />;
}
```

- [ ] **Step 3: Typecheck + chạy thử**

Run: `npx tsc --noEmit`
Expected: không lỗi. Mở `/finance/cashbook`: upload, bảng giao dịch, biểu đồ, tổng hợp trả shop hoạt động như tab cũ.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/finance/cashbook/page.tsx src/components/finance/cashbook/CashbookPageClient.tsx
git commit -m "feat: add /finance/cashbook page wrapping CashbookTab"
```

---

### Task 1.4: Trang Phân tích (bỏ tab-trong-tab)

**Files:**
- Create: `src/app/(dashboard)/finance/analysis/page.tsx`
- Modify: `src/components/finance/AnalysisTab.tsx`

`AnalysisTab` hiện đã tự fetch + dùng `?view=`. Thay **hàng nút VIEWS** (carrier/shop/negative) bằng `SegmentedNav` dùng chung; giữ nguyên mọi logic còn lại. Router push của `AnalysisTab` đang trỏ `/finance?tab=analysis&...` → đổi sang `/finance/analysis?...`.

- [ ] **Step 1: Sửa `switchView` trong `AnalysisTab.tsx`**

Thay thân hàm `switchView`:
```tsx
const switchView = (v: string) => {
  const p = new URLSearchParams(searchParams.toString());
  p.set("view", v);
  if (v !== "shop") p.delete("shop");
  router.push(`/finance/analysis?${p.toString()}`, { scroll: false });
};
```
Và trong `applyShopSearch`, đổi `router.push(\`/finance?tab=analysis&${p.toString()}\`...)` thành `router.push(\`/finance/analysis?${p.toString()}\`...)`.

- [ ] **Step 2: Thay hàng nút VIEWS bằng `SegmentedNav`**

Thêm import đầu file:
```tsx
import { SegmentedNav } from "@/components/finance/shared/SegmentedNav";
```
Trong JSX, thay khối render `{VIEWS.map(v => (<button .../>))}` (hàng nút phân đoạn thứ hai) bằng:
```tsx
<SegmentedNav
  items={VIEWS.map((v) => ({ id: v.id, label: v.label }))}
  active={view}
  onChange={switchView}
/>
```
(Giữ nguyên hàng PERIODS phía trên và phần còn lại của component.)

- [ ] **Step 3: Viết server page**

```tsx
// src/app/(dashboard)/finance/analysis/page.tsx
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { getCachedSession } from "@/lib/cached-session";
import { hasPermission } from "@/lib/route-permissions";
import { getFinanceAnalysisInitialData } from "@/lib/finance/page-data";

const AnalysisTab = dynamic(() => import("@/components/finance/AnalysisTab"));

interface Props { searchParams: Promise<Record<string, string | string[] | undefined>>; }

export default async function FinanceAnalysisPage({ searchParams }: Props) {
  const session = await getCachedSession();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user, "canViewFinancePage")) redirect("/no-access");

  const resolved = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(resolved)) if (typeof v === "string") params.set(k, v);

  const initialData = await getFinanceAnalysisInitialData(params);
  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">📈 Phân tích</h1>
        <p className="mt-1 text-sm text-slate-500">So sánh đối tác, xếp hạng cửa hàng, đơn doanh thu âm.</p>
      </div>
      <AnalysisTab initialData={initialData} />
    </div>
  );
}
```

- [ ] **Step 4: Typecheck + chạy thử**

Run: `npx tsc --noEmit`
Expected: không lỗi. Mở `/finance/analysis`: 3 phân đoạn chuyển đúng (carrier/shop/negative), tìm kiếm shop, biểu đồ, click đơn mở dialog đều hoạt động.

- [ ] **Step 5: Cập nhật test responsive nếu có tham chiếu route cũ**

Run: `npx vitest run src/__tests__/components`
Expected: PASS. Nếu có test khẳng định URL `/finance?tab=analysis`, cập nhật theo route mới.

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/finance/analysis/page.tsx src/components/finance/AnalysisTab.tsx
git commit -m "feat: add /finance/analysis page and replace nested view tabs with SegmentedNav"
```

---

### Task 1.5: `/finance` thành Bảng điều khiển cơ bản + redirect URL cũ

**Files:**
- Rewrite: `src/app/(dashboard)/finance/page.tsx`
- Create: `src/components/finance/dashboard/DashboardPageClient.tsx`

Parity dashboard cơ bản: hiển thị `OverviewSummaryCards` + `OverviewCharts` (tái dùng) + P&L tóm tắt (5 dòng) + 3 thẻ link nhanh. KPI so sánh kỳ/mục tiêu/trung tâm cảnh báo là Phase 2.

- [ ] **Step 1: Viết client dashboard cơ bản**

```tsx
// src/components/finance/dashboard/DashboardPageClient.tsx
"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { OverviewSummaryCards } from "@/components/finance/OverviewSummaryCards";
import { OverviewCharts } from "@/components/finance/OverviewCharts";
import { FinancePanel } from "@/components/finance/shared/FinancePanel";
import { MoneyText } from "@/components/finance/shared/MoneyText";
import { formatVnd } from "@/lib/finance/format";
import type { FinanceLandingData } from "@/lib/finance/landing";

const INITIAL_AT = Date.now();

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Lỗi hệ thống");
  return data as T;
}

export default function DashboardPageClient({ initialData }: { initialData: FinanceLandingData }) {
  const query = useQuery({
    queryKey: ["finance-landing", "period=month"],
    queryFn: () => fetchJson<FinanceLandingData>(`/api/finance/landing?period=month`),
    initialData,
    initialDataUpdatedAt: INITIAL_AT,
    placeholderData: (prev) => prev,
  });

  const data = query.data ?? initialData;
  const { summary, trendData, carrierDistribution, shopDistribution, pnl } = data;
  const shopBarHeight = Math.max(220, shopDistribution.length * 28);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-3 py-4 sm:px-4 sm:py-5 sm:space-y-6 md:px-6 md:py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">📊 Bảng điều khiển Tài chính</h1>
        <p className="mt-1 text-sm text-slate-500">Tổng quan sức khỏe tài chính tháng này.</p>
      </div>

      <OverviewSummaryCards summary={summary} pnl={pnl} formatCurrency={formatVnd} />
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

- [ ] **Step 2: Rewrite server page `/finance` + redirect `?tab=` cũ**

```tsx
// src/app/(dashboard)/finance/page.tsx
import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/cached-session";
import { hasPermission } from "@/lib/route-permissions";
import { getFinanceLandingData, resolvePnlRange, getCurrentMonthRange } from "@/lib/finance/landing";
import DashboardPageClient from "@/components/finance/dashboard/DashboardPageClient";

interface Props { searchParams: Promise<Record<string, string | string[] | undefined>>; }

export default async function FinancePage({ searchParams }: Props) {
  const session = await getCachedSession();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user, "canViewFinancePage")) redirect("/no-access");

  const resolved = await searchParams;

  // Tương thích ngược: link cũ /finance?tab=...
  const tab = typeof resolved.tab === "string" ? resolved.tab : null;
  if (tab === "analysis") redirect("/finance/analysis");
  if (tab === "cashbook") redirect("/finance/cashbook");
  // tab "overview" (hoặc thiếu) → ở lại dashboard

  const initialData = await getFinanceLandingData({
    overviewRange: getCurrentMonthRange(),
    pnlRange: resolvePnlRange(null, null),
  });

  return <DashboardPageClient initialData={initialData} />;
}
```

- [ ] **Step 3: Typecheck + chạy thử**

Run: `npx tsc --noEmit`
Expected: không lỗi. Mở `/finance`: thẻ KPI + 3 biểu đồ + P&L tóm tắt + link nhanh. `/finance?tab=analysis` redirect sang `/finance/analysis`; `/finance?tab=cashbook` sang `/finance/cashbook`.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/finance/page.tsx src/components/finance/dashboard/DashboardPageClient.tsx
git commit -m "feat: turn /finance into basic dashboard hub + redirect legacy tab URLs"
```

---

### Task 1.6: Dọn dẹp orchestration cũ

**Files:**
- Delete: `src/components/finance/FinancePageClient.tsx`
- Delete: `src/components/finance/OverviewTab.tsx`
- Delete: `src/components/finance/OverviewPeriodSelector.tsx` (nếu không còn ai import)

`OverviewSummaryCards`, `OverviewCharts`, `PnLSection`, `ExpenseSection`, `BudgetSection` vẫn được dùng → GIỮ.

- [ ] **Step 1: Kiểm tra không còn import các file sắp xóa**

Run: `npx vitest run` (toàn bộ) hoặc dùng grep dự án tìm `FinancePageClient`, `OverviewTab`, `OverviewPeriodSelector`.
Expected: chỉ còn chính các file đó tự tham chiếu. Nếu test nào import → cập nhật/loại bỏ.

- [ ] **Step 2: Xóa các file không dùng**

Xóa 3 file trên. Nếu `OverviewPeriodSelector` vẫn còn import ở đâu đó, giữ lại.

- [ ] **Step 3: Typecheck + lint + toàn bộ test**

Run: `npx tsc --noEmit` → không lỗi.
Run: `npm run lint` → không lỗi.
Run: `npx vitest run` → toàn bộ PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove legacy finance tab orchestration (FinancePageClient, OverviewTab)"
```

---

### Task 1.7: Kiểm thử tổng & cập nhật route-permissions test

**Files:**
- Modify: `src/__tests__/lib/route-permissions.test.ts` (nếu liệt kê route finance)

- [ ] **Step 1: Rà soát test route-permissions**

Mở `src/__tests__/lib/route-permissions.test.ts`. Nếu có map các path `/finance` → quyền, thêm các path mới `/finance/pnl`, `/finance/cashbook`, `/finance/expenses`, `/finance/analysis` cùng yêu cầu `canViewFinancePage`.

- [ ] **Step 2: Chạy test liên quan**

Run: `npx vitest run src/__tests__/lib/route-permissions.test.ts`
Expected: PASS.

- [ ] **Step 3: Smoke test thủ công toàn cụm**

Đăng nhập tài khoản ADMIN và tài khoản non-admin có `canViewFinancePage`:
- Sidebar hiện nhóm Tài chính 5 mục; điều hướng đúng; flyout khi thu gọn.
- 5 trang load không lỗi; chức năng cũ còn nguyên.
- Non-admin: không thấy nút ghi (thêm chi/đặt ngân sách/upload) — do `isAdmin` gate sẵn có trong các section.
- Tài khoản thiếu `canViewFinancePage`: mọi `/finance*` redirect `/no-access`.

- [ ] **Step 4: Commit (nếu có sửa test)**

```bash
git add src/__tests__/lib/route-permissions.test.ts
git commit -m "test: cover finance sub-route permissions"
```

---

## Self-Review (đã thực hiện khi viết plan)

- **Spec coverage (Phase 0+1):** sidebar nhóm ✓ (0.5), 5 route ✓ (1.1–1.5), 1 bộ chọn kỳ/trang ✓ (PeriodFilter 0.3 + giữ selector nội bộ cho parity), redirect URL cũ ✓ (1.5), bỏ tab-trong-tab ✓ (1.4), dọn orchestration ✓ (1.6), shared components ✓ (0.1–0.4), gom `fmtVND` (MoneyText/formatVnd) ✓. Các mục Phase 2/3 (KPI so sánh, mục tiêu `FinanceTarget`, cảnh báo, xuất Excel, tách data layer sâu) **không** thuộc plan này — đúng phạm vi đã chốt.
- **Placeholder scan:** không có TODO/“xử lý sau”; mọi step có code/lệnh cụ thể.
- **Type consistency:** `formatVnd` (0.1) dùng ở dashboard (1.5); `PeriodFilter`/`useFinancePeriod` (0.3) sẵn sàng cho Phase 2; `SegmentedNav` (0.4) dùng ở analysis (1.4); props `OverviewSummaryCards`/`OverviewCharts`/`PnLSection`/`ExpenseSection`/`BudgetSection` khớp chữ ký hiện có.
- **Lưu ý parity:** Phase 1 cố ý giữ period selector nội bộ của `PnLSection`/`CashbookTab`/`AnalysisTab` để không đổi hành vi; việc hợp nhất hoàn toàn về `<PeriodFilter>` (URL-synced) gom vào Phase 2 khi dựng lại các trang.

## Ghi chú chuyển sang Phase 2 (ngoài phạm vi plan này)
Phase 2 sẽ: dựng hub đầy đủ (KPI + Δ so kỳ trước + mục tiêu), thêm cột so sánh P&L, model `FinanceTarget` + dialog, `useFinancePeriod` thay selector nội bộ. Phase 3: module `alerts.ts` + `<AlertCenter>`, xuất Excel P&L.
