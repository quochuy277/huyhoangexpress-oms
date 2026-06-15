# Finance Phase 3 — Trung tâm cảnh báo & Xuất Excel (Design)

**Date:** 2026-06-14
**Depends on:** Phase 0+1 (xong) và Phase 2 (hub đầy đủ + P&L so sánh).
**Parent design:** `docs/superpowers/specs/2026-06-14-finance-redesign-design.md`
**Goal:** Thêm **Trung tâm cảnh báo** (tổng hợp cảnh báo tài chính từ dữ liệu sẵn có) hiển thị trên hub, và **xuất Excel** cho Báo cáo P&L.

---

## Phạm vi

Trong scope:
1. Module `src/lib/finance/alerts.ts` — `getFinanceAlerts(range)` tổng hợp cảnh báo từ 4 nguồn.
2. API `/api/finance/alerts`.
3. `<AlertCenter>` dùng chung + gắn vào hub (cột rộng cạnh P&L tóm tắt).
4. Module `src/lib/finance/pnl-export.ts` + API `/api/finance/pnl/export` (xlsx).
5. `<ExportButton>` + nút Xuất trên trang P&L (và hub).

Ngoài scope: PDF; đối soát COD; công nợ shop; bất kỳ thay đổi công thức tài chính.

## Cảnh báo — nguồn & ngưỡng

`FinanceAlert = { id, severity: "critical" | "warning", category, title, detail, href }`

| category | Nguồn | Ngưỡng | href |
|---|---|---|---|
| `budget` | `getFinanceBudgetSummary(month)` | ratio > 100 → critical; 90–100 → warning (chỉ danh mục có ngân sách > 0) | `/finance/expenses` |
| `shop_decline` | Đếm đơn 2 tuần gần vs 2 tuần trước (như logic shop-trends), shop có previous ≥ 5 | giảm ≥ 50% → critical; 30–50% → warning | `/finance/analysis?view=shop` |
| `negative_revenue` | Đơn `revenue < 0` trong kỳ | có ≥ 1 đơn → warning (1 cảnh báo gộp) | `/finance/analysis?view=negative` |
| `carrier_margin` | groupBy carrier kỳ này vs kỳ trước, carrier ≥ 20 đơn kỳ này | margin giảm ≥ 5 điểm **và** margin hiện < 25% → warning | `/finance/analysis?view=carrier` |

- Sắp xếp: critical trước, rồi warning. `id` ổn định (vd `budget:<categoryId>`, `shop:<shopName>`, `negative`, `carrier:<carrierName>`).
- Không có cảnh báo → trả `[]` (AlertCenter hiển thị trạng thái "✅ Không có cảnh báo").

## Data contract

```ts
// src/lib/finance/alerts.ts
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
export function getFinanceAlerts(range: DateRange): Promise<FinanceAlert[]>;
// pure, testable:
export function buildBudgetAlerts(summary: FinanceBudgetSummary): FinanceAlert[];
```

## API

- `GET /api/finance/alerts?period=&from=&to=` → `FinanceAlert[]` (gác `requireFinanceAccess`).
- `GET /api/finance/pnl/export?from=&to=&compareTo=prev|yoy` → file `.xlsx` (`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `Content-Disposition: attachment; filename="bao-cao-pnl-<from>_<to>.xlsx"`). Tên file ASCII để tránh lỗi encoding header.

## Xuất Excel — nội dung

Một sheet "P&L". Khi có `compareTo`: 4 cột (Khoản mục, Kỳ này, Kỳ trước, Δ%); không có: 2 cột (Khoản mục, Số tiền). Dùng helper sẵn có `buildXlsxBuffer(headers, rows, sheetName)`. Hàng theo đúng cấu trúc P&L (DT ròng → chênh đền bù → LN gộp → chi phí VH → LN ròng). Số để dạng số (không hậu tố "đ") để Excel tính được; Δ% là số.

## Component contracts

```tsx
// src/components/finance/shared/AlertCenter.tsx
interface AlertCenterProps { alerts: FinanceAlert[] }

// src/components/finance/shared/ExportButton.tsx
interface ExportButtonProps { href: string; label?: string } // <a download> tới endpoint export
```

## UI

- **Hub:** hàng "hai cột" hiện tại (P&L tóm tắt | Truy cập nhanh) đổi thành layout có **AlertCenter** (cột rộng) + P&L tóm tắt; link nhanh xuống dưới. AlertCenter query `/api/finance/alerts?${period}`. Mỗi dòng cảnh báo bấm được → điều hướng `href`.
- **P&L:** thêm `<ExportButton href="/api/finance/pnl/export?from=&to=&compareTo=">` ở thanh tiêu đề.

## Acceptance

1. `getFinanceAlerts` trả mảng đúng severity/threshold; `buildBudgetAlerts` có unit test (>90 warning, >100 critical, ≤90 hoặc ngân sách 0 → không cảnh báo).
2. Hub hiển thị AlertCenter: nhóm 🔴/🟡, link sâu đúng trang; rỗng → trạng thái "không có cảnh báo".
3. Nút Xuất trên P&L tải file `.xlsx` mở được, cấu trúc khớp bảng; có/không compareTo đều đúng số cột.
4. Quyền: mọi endpoint gác `requireFinanceAccess`; export không lộ dữ liệu cho user thiếu quyền.
5. Lint + tsc xanh; test mới cho `buildBudgetAlerts` và builder hàng export (`buildPnlExportRows`).
