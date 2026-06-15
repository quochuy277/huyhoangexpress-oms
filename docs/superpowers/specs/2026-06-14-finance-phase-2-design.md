# Finance Phase 2 — Hub & P&L nâng cao (Design)

**Date:** 2026-06-14
**Depends on:** Phase 0 + 1 (đã xong trên `feature/finance-redesign`).
**Parent design:** `docs/superpowers/specs/2026-06-14-finance-redesign-design.md`
**Goal:** Nâng Bảng điều khiển từ "parity cơ bản" lên **hub đầy đủ** (KPI có so sánh kỳ + tiến độ mục tiêu) và thêm **cột so sánh kỳ** cho Báo cáo P&L, kèm model `FinanceTarget` + dialog đặt mục tiêu.

---

## Phạm vi

Trong scope:
1. Model `FinanceTarget` (+ migration) cho mục tiêu KPI theo tháng.
2. Tầng dữ liệu + API mục tiêu (`/api/finance/targets`).
3. Dialog "Đặt mục tiêu" (admin) trên trang P&L.
4. Tầng dữ liệu so sánh kỳ cho hub (`/api/finance/dashboard`).
5. `<KpiCard>` dùng chung + dải KPI mới trên hub (giá trị + Δ so kỳ trước + thanh tiến độ mục tiêu).
6. Bộ chọn kỳ trên hub (dùng `useFinancePeriod` đã có ở Phase 0).
7. Cột so sánh kỳ cho P&L (Kỳ này / Kỳ trước / Δ%), chế độ `prev` hoặc `yoy`.

Ngoài scope (để Phase 3): trung tâm cảnh báo có dữ liệu thật, xuất Excel. Không đụng công thức tài chính lõi (`getFinancePnlData`, margin).

## Định nghĩa số liệu & so sánh

- **Kỳ trước (prev):** cùng độ dài, liền trước. `prevFrom = from − (to − from)`, `prevTo = from − 1ms`. (Đã dùng cho `revenueChange` trong `getFinanceOverviewData`.)
- **Cùng kỳ năm ngoái (yoy):** dời `from`/`to` lùi 1 năm.
- **KPI hub:** Lợi nhuận ròng (`pnl.netProfit`), Doanh thu ròng (`pnl.revenue.netRevenue`), Margin (`netRevenue / totalFeeFromShop × 100`, 1 chữ số thập phân), Số dư quỹ cuối kỳ (latest `CashbookEntry.balance` trong kỳ — không Δ/mục tiêu).
- **Δ%** = `(current − previous) / |previous| × 100`, làm tròn. Nếu `previous === 0` → hiển thị "—".
- **Mục tiêu:** `FinanceTarget` theo `month` (ngày 1) + `metric ∈ {NET_REVENUE, NET_PROFIT}`. Tiến độ = `current / target × 100` (clamp hiển thị 0–100% trên thanh, nhưng nhãn cho phép >100%). Không có mục tiêu cho một metric → ẩn thanh tiến độ thẻ đó.

## Data contracts

```ts
// src/lib/finance/targets.ts
export interface FinanceTargets { netRevenue: number | null; netProfit: number | null }
export function getFinanceTargets(month: string): Promise<FinanceTargets>;
export function setFinanceTargets(month: string, targets: FinanceTargets, createdBy: string): Promise<void>;

// src/lib/finance/dashboard.ts
export interface FinanceKpi { netRevenue: number; netProfit: number; margin: number }
export interface FinanceDashboardData {
  current: FinanceKpi;
  previous: FinanceKpi;          // cùng độ dài, liền trước
  cashBalance: { amount: number; date: string | null };
  targets: FinanceTargets;       // theo tháng của range.from
}
export function getFinanceDashboardData(range: DateRange): Promise<FinanceDashboardData>;
```

## API

- `GET /api/finance/targets?month=YYYY-MM` → `FinanceTargets`. (gác `requireFinanceAccess`)
- `PUT /api/finance/targets` body `{ month, netRevenue, netProfit }` → upsert (admin-only). Giá trị `null`/0 → xóa mục tiêu metric đó.
- `GET /api/finance/dashboard?period=&from=&to=` → `FinanceDashboardData`.
- `GET /api/finance/pnl?from=&to=&compareTo=prev|yoy` — **mở rộng tương thích ngược:** không có `compareTo` → trả `FinancePnlData` phẳng (như Phase 1); có `compareTo` → trả `{ current: FinancePnlData, previous: FinancePnlData, compareMode }`.

## UI

**Hub (`DashboardPageClient`)**
- Thêm `<PeriodFilter>` (qua `useFinancePeriod`) ở đầu trang.
- Thay khối `OverviewSummaryCards` bằng **dải 4 `<KpiCard>`**: 3 thẻ đầu có Δ so kỳ trước + (nếu có) thanh tiến độ mục tiêu; thẻ "Số dư quỹ" chỉ giá trị + ngày.
- Giữ `OverviewCharts`, P&L tóm tắt, link nhanh.
- Fetch: query `dashboard` (KPI/so sánh/mục tiêu) + query `landing` (charts/distributions/pnl summary) hiện có.

**P&L (`PnlPageClient`)**
- Thêm bộ chọn "So với: Tháng trước / Cùng kỳ năm ngoái" (`compareTo`).
- Bảng P&L 4 cột (Khoản mục · Kỳ này · Kỳ trước · Δ). Δ tô xanh/đỏ theo hướng; với dòng chi phí, tăng = đỏ.
- Dải "🎯 Mục tiêu" + nút "Đặt mục tiêu" (admin) mở `TargetDialog`.

## Component contracts

```tsx
// src/components/finance/shared/KpiCard.tsx
interface KpiCardProps {
  label: string;
  value: string;                 // đã format
  tone?: "blue" | "green" | "amber" | "violet";
  deltaPercent?: number | null;  // null → ẩn dòng Δ
  deltaSuffix?: string;          // vd "so tháng trước"
  targetPercent?: number | null; // null → ẩn thanh tiến độ
  targetLabel?: string;
}
```

## Acceptance

1. `npx prisma migrate dev` tạo bảng `FinanceTarget`; client regenerate; `npx tsc` xanh.
2. Hub hiển thị 4 KPI; 3 thẻ đầu có Δ% so kỳ trước; thẻ có mục tiêu hiện thanh tiến độ đúng %; đổi bộ chọn kỳ cập nhật cả KPI lẫn biểu đồ.
3. Admin đặt mục tiêu DT ròng/LN ròng cho tháng → lưu, hub + P&L phản ánh; non-admin không thấy nút đặt mục tiêu.
4. P&L có cột Kỳ trước + Δ%; đổi prev/yoy hoạt động; chế độ không-compare vẫn trả dữ liệu cũ (không vỡ caller khác).
5. Δ% khi previous=0 hiển thị "—" (không chia 0/NaN).
6. Lint + tsc xanh; test mới cho `getPreviousRange`, tính Δ%, tiến độ mục tiêu, `getFinanceTargets` mapping.
