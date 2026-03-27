# Finance Mobile Responsive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tối ưu responsive mobile cho toàn bộ trang Tài chính bằng layout thích ứng, card/accordion cho bảng lớn, và vẫn giữ desktop table/chart cùng hiệu năng hiện tại trên Vercel và Supabase.

**Architecture:** Giữ nguyên data flow và API hiện tại, chỉ thay đổi lớp render và cấu trúc layout. Các component `FinancePageClient`, `OverviewTab`, `AnalysisTab`, `CashbookTab` sẽ dùng helper responsive thuần để chia sẻ style/layout và hiển thị fallback mobile mà không phát sinh request mới.

**Tech Stack:** Next.js App Router, React 19, TypeScript, TanStack Query, Recharts, Vitest

---

### Task 1: Tạo helper responsive và regression tests cho nhánh mobile/desktop

**Files:**
- Create: `src/components/finance/financeResponsive.ts`
- Create: `src/__tests__/components/financeResponsive.test.ts`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Write the failing test**

```ts
import {
  shouldUseMobileCards,
  buildExpenseSummary,
  buildBudgetSummary,
  buildCashbookTransactionSummary,
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
        title: "Quảng cáo",
        amount: 1250000,
        note: "Meta",
        date: "2026-03-20T00:00:00.000Z",
        category: { name: "Marketing" },
      }),
    ).toMatchObject({
      title: "Quảng cáo",
      categoryName: "Marketing",
      amountLabel: "1.250.000đ",
      noteLabel: "Meta",
    });
  });

  test("builds budget summary with ratio and state labels", () => {
    expect(
      buildBudgetSummary({
        categoryId: "cat-1",
        categoryName: "Vận hành",
        budgetAmount: 5000000,
        spent: 4600000,
        remaining: 400000,
        ratio: 92,
      }),
    ).toMatchObject({
      categoryName: "Vận hành",
      ratioLabel: "92%",
      statusTone: "danger",
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/__tests__/components/financeResponsive.test.ts`
Expected: FAIL because `@/components/finance/financeResponsive` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
const fmtVND = (n: number) =>
  `${new Intl.NumberFormat("vi-VN").format(Math.round(n))}đ`;

export function shouldUseMobileCards(width: number) {
  return width < 768;
}

export function buildExpenseSummary(expense: {
  id: string;
  title: string;
  amount: number;
  note?: string | null;
  date: string;
  category?: { name?: string | null } | null;
}) {
  return {
    id: expense.id,
    title: expense.title,
    categoryName: expense.category?.name || "—",
    amountLabel: fmtVND(expense.amount),
    noteLabel: expense.note || "—",
    dateLabel: new Date(expense.date).toLocaleDateString("vi-VN"),
  };
}

export function buildBudgetSummary(item: {
  categoryId: string;
  categoryName: string;
  budgetAmount: number;
  spent: number;
  remaining: number;
  ratio: number;
}) {
  return {
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    budgetLabel: item.budgetAmount > 0 ? fmtVND(item.budgetAmount) : "—",
    spentLabel: fmtVND(item.spent),
    remainingLabel: item.budgetAmount > 0 ? fmtVND(item.remaining) : "—",
    ratioLabel: `${item.ratio}%`,
    statusTone: item.ratio > 90 ? "danger" : item.ratio > 70 ? "warning" : "ok",
  };
}

const CASHBOOK_GROUP_LABELS: Record<string, string> = {
  COD: "COD",
  SHOP_PAYOUT: "Trả shop",
  RECONCILIATION_FEE: "Phí ĐS",
  TOP_UP: "Nạp tiền",
  COMPENSATION: "Đền bù",
  COOPERATION_FEE: "Phí HT",
  OTHER: "Khác",
};

export function buildCashbookTransactionSummary(item: {
  id: string;
  transactionTime: string;
  receiptCode: string;
  content: string;
  amount: number;
  balance: number;
  groupType: string;
}) {
  return {
    id: item.id,
    receiptCode: item.receiptCode,
    content: item.content,
    timeLabel: new Date(item.transactionTime).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    amountLabel: `${item.amount >= 0 ? "+" : ""}${fmtVND(item.amount)}`,
    balanceLabel: fmtVND(item.balance),
    groupLabel: CASHBOOK_GROUP_LABELS[item.groupType] || CASHBOOK_GROUP_LABELS.OTHER,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/__tests__/components/financeResponsive.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts src/components/finance/financeResponsive.ts src/__tests__/components/financeResponsive.test.ts
git commit -m "test: add finance responsive helpers"
```

### Task 2: Refactor shell trang Tài chính cho mobile-first navigation

**Files:**
- Modify: `src/components/finance/FinancePageClient.tsx`
- Test: `src/__tests__/components/financeResponsive.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { buildTabListLayout } from "@/components/finance/financeResponsive";

test("returns horizontal scroll tab layout for narrow screens", () => {
  expect(buildTabListLayout(390)).toMatchObject({
    overflowX: "auto",
    wrap: false,
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/__tests__/components/financeResponsive.test.ts`
Expected: FAIL because `buildTabListLayout` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export function buildTabListLayout(width: number) {
  return width < 768
    ? { overflowX: "auto", wrap: false, gap: 8, paddingInline: 2 }
    : { overflowX: "visible", wrap: true, gap: 4, paddingInline: 0 };
}
```

Then apply helper intent in `FinancePageClient.tsx`:

```tsx
<div
  style={{
    padding: "16px 12px 28px",
    maxWidth: 1400,
    margin: "0 auto",
  }}
>
  <div style={{ marginBottom: 18 }}>
    <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>
      Tài Chính
    </h1>
  </div>
  <div
    style={{
      display: "flex",
      gap: 8,
      overflowX: "auto",
      paddingBottom: 6,
      marginBottom: 20,
      scrollbarWidth: "thin",
    }}
  >
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/__tests__/components/financeResponsive.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/finance/FinancePageClient.tsx src/components/finance/financeResponsive.ts src/__tests__/components/financeResponsive.test.ts
git commit -m "feat: make finance tabs mobile friendly"
```

### Task 3: Triển khai responsive cho OverviewTab với mobile cards và accordion

**Files:**
- Modify: `src/components/finance/OverviewTab.tsx`
- Modify: `src/components/finance/financeResponsive.ts`
- Test: `src/__tests__/components/financeResponsive.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import {
  buildExpenseSummary,
  buildBudgetSummary,
  buildPnlSections,
} from "@/components/finance/financeResponsive";

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
      operatingExpenses: [{ name: "Lương", total: 150000 }],
      totalOperatingExpenses: 150000,
      netProfit: 450000,
    }),
  ).toMatchObject([
    { key: "revenue", title: "Doanh thu" },
    { key: "netProfit", title: "Lợi nhuận" },
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/__tests__/components/financeResponsive.test.ts`
Expected: FAIL because `buildPnlSections` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export function buildPnlSections(pnl: {
  revenue: {
    totalFeeFromShop: number;
    totalCarrierFee: number;
    netRevenue: number;
  };
  claims: {
    customerComp: number;
    carrierComp: number;
    claimDiff: number;
  };
  grossProfit: number;
  operatingExpenses: Array<{ name: string; total: number }>;
  totalOperatingExpenses: number;
  netProfit: number;
}) {
  return [
    {
      key: "revenue",
      title: "Doanh thu",
      summary: `${fmtVND(pnl.revenue.netRevenue)}`,
    },
    {
      key: "claims",
      title: "Chi phí trực tiếp",
      summary: `${fmtVND(pnl.claims.claimDiff)}`,
    },
    {
      key: "opex",
      title: "Chi phí vận hành",
      summary: `${fmtVND(pnl.totalOperatingExpenses)}`,
    },
    {
      key: "netProfit",
      title: "Lợi nhuận",
      summary: `${fmtVND(pnl.netProfit)}`,
    },
  ];
}
```

Then update `OverviewTab.tsx`:
- period filter thành block wrap/scroll-friendly
- custom date stack trên mobile
- KPI cards thành responsive grid
- P&L dùng desktop table + mobile accordion
- expense table dùng desktop table + mobile cards
- budget table dùng desktop table + mobile cards
- dialog padding/height tối ưu mobile

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/__tests__/components/financeResponsive.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/finance/OverviewTab.tsx src/components/finance/financeResponsive.ts src/__tests__/components/financeResponsive.test.ts
git commit -m "feat: optimize finance overview for mobile"
```

### Task 4: Triển khai responsive cho AnalysisTab

**Files:**
- Modify: `src/components/finance/AnalysisTab.tsx`
- Modify: `src/components/finance/financeResponsive.ts`
- Test: `src/__tests__/components/financeResponsive.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import {
  buildCarrierSummary,
  buildShopSummary,
  buildNegativeRevenueSummary,
} from "@/components/finance/financeResponsive";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/__tests__/components/financeResponsive.test.ts`
Expected: FAIL because summary builders do not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export function buildCarrierSummary(item: {
  carrier: string;
  orderCount: number;
  revenue: number;
  margin: number;
  negativeCount: number;
  codTotal: number;
}) {
  return {
    title: item.carrier,
    orderCountLabel: item.orderCount.toLocaleString("vi-VN"),
    revenueLabel: fmtVND(item.revenue),
    marginLabel: `${item.margin}%`,
    negativeCountLabel: `${item.negativeCount}`,
    codTotalLabel: fmtVND(item.codTotal),
  };
}
```

Then update `AnalysisTab.tsx`:
- filter stack tốt trên mobile
- view switcher cuộn ngang
- carrier/shop/negative revenue có mobile card view
- chart header wrap tốt, không tăng fetch

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/__tests__/components/financeResponsive.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/finance/AnalysisTab.tsx src/components/finance/financeResponsive.ts src/__tests__/components/financeResponsive.test.ts
git commit -m "feat: optimize finance analysis for mobile"
```

### Task 5: Triển khai responsive cho CashbookTab

**Files:**
- Modify: `src/components/finance/CashbookTab.tsx`
- Modify: `src/components/finance/financeResponsive.ts`
- Test: `src/__tests__/components/financeResponsive.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import {
  buildCashbookTransactionSummary,
  buildShopPayoutSummary,
  buildUploadHistorySummary,
} from "@/components/finance/financeResponsive";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/__tests__/components/financeResponsive.test.ts`
Expected: FAIL because payout/upload builders do not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export function buildShopPayoutSummary(item: {
  shop: string;
  count: number;
  total: number;
  fee: number;
  lastDate?: string | null;
}) {
  return {
    title: item.shop,
    countLabel: `${item.count}`,
    totalLabel: fmtVND(item.total),
    feeLabel: fmtVND(item.fee),
    lastDateLabel: item.lastDate
      ? new Date(item.lastDate).toLocaleDateString("vi-VN")
      : "—",
  };
}
```

Then update `CashbookTab.tsx`:
- upload area dọc, nút full-width mobile
- upload history fallback hợp lý
- transaction table + shop payout summary có mobile cards
- filter chips wrap và pagination stack
- charts giảm chiều cao mobile, không tăng xử lý client

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/__tests__/components/financeResponsive.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/finance/CashbookTab.tsx src/components/finance/financeResponsive.ts src/__tests__/components/financeResponsive.test.ts
git commit -m "feat: optimize finance cashbook for mobile"
```

### Task 6: Verify end-to-end integration and regression surface

**Files:**
- Modify: `src/components/finance/FinancePageClient.tsx`
- Modify: `src/components/finance/OverviewTab.tsx`
- Modify: `src/components/finance/AnalysisTab.tsx`
- Modify: `src/components/finance/CashbookTab.tsx`
- Test: `src/__tests__/components/financeResponsive.test.ts`

- [ ] **Step 1: Run focused tests**

Run: `npm run test:run -- src/__tests__/components/financeResponsive.test.ts`
Expected: PASS

- [ ] **Step 2: Run broader verification**

Run: `npm run test:run`
Expected: PASS or only unrelated pre-existing failures reported explicitly

- [ ] **Step 3: Run build verification**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Review requirements coverage**

Checklist:
- Mobile tab navigation dễ bấm và không vỡ layout
- Các bảng lớn có fallback card/accordion trên mobile
- Desktop table/chart vẫn còn
- Không thêm fetch/query/API mới
- Không thay đổi business logic dữ liệu

- [ ] **Step 5: Commit**

```bash
git add src/components/finance/FinancePageClient.tsx src/components/finance/OverviewTab.tsx src/components/finance/AnalysisTab.tsx src/components/finance/CashbookTab.tsx src/components/finance/financeResponsive.ts src/__tests__/components/financeResponsive.test.ts
git commit -m "feat: complete finance mobile responsive overhaul"
```
