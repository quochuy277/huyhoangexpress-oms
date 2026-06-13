# Tái thiết kế toàn diện trang Tài chính

**Date:** 2026-06-14
**Target area:** Trang Tài chính (`/finance`) — hiện là 1 trang 3 tab (`FinancePageClient`).
**Goal:** Đập đi xây lại cụm trang Tài chính theo mô hình **Hub & chi tiết**: tách thành 5 trang dưới nhóm "Tài chính" trong sidebar, ưu tiên trải nghiệm cho quản lý nhưng vẫn phục vụ nhân viên nhập liệu, giảm dồn nén, thêm so sánh kỳ + mục tiêu KPI + trung tâm cảnh báo + xuất báo cáo Excel. Giữ nguyên toàn bộ công thức tài chính hiện có.

---

## Bối cảnh & vấn đề hiện tại

Trang `/finance` hiện gồm 3 tab điều phối qua `?tab=` trong `src/components/finance/FinancePageClient.tsx`:
- **Tổng quan & P&L** (`OverviewTab`): gộp 6 việc — bộ chọn kỳ, 6 thẻ tóm tắt, 3 biểu đồ, bảng P&L (có bộ chọn kỳ *riêng*), CRUD khoản chi, ngân sách tháng.
- **Phân tích** (`AnalysisTab`): bộ chọn kỳ + "tab trong tab" (Đối tác / Cửa hàng / Đơn doanh thu âm).
- **Sổ quỹ** (`CashbookTab`): upload công nợ, 4 thẻ, bảng giao dịch, biểu đồ, tổng hợp trả shop.

Vấn đề: (1) tab Tổng quan quá tải, cuộn dài, trộn "xem báo cáo" với "nhập liệu"; (2) tồn tại 3 bộ chọn kỳ độc lập gây nhầm; (3) tab lồng tab ở Phân tích; (4) style lẫn lộn Tailwind + inline `style={{}}`; (5) không xuất được báo cáo; (6) `fmtVND` lặp lại ở mọi file.

## Định hướng đã chốt (qua brainstorming)

- Người dùng chính: **cả quản lý và nhân viên, ưu tiên quản lý**.
- Mục tiêu chữa: **giảm dồn nén/dễ tìm** + **cho xuất báo cáo**.
- Phạm vi: **tách thành nhiều trang** trong menu.
- Năng lực mới: **so sánh kỳ & mục tiêu KPI**, **trung tâm cảnh báo**, **xuất Excel** (P&L).
- **KHÔNG làm vòng này:** Đối soát COD (cần map 1-1 gây chậm + thiếu dữ liệu thực tế), Công nợ giữ hộ shop (cùng lý do dữ liệu), xuất PDF, phân quyền mịn theo từng trang.

---

## Kiến trúc điều hướng (Phương án C — Hub & chi tiết)

Mục "Tài Chính" trong `src/components/layout/Sidebar.tsx` đổi từ 1 link đơn thành **nhóm có menu con** gồm 5 trang:

| Trang | Route | Mô tả ngắn |
|---|---|---|
| 📊 Bảng điều khiển (hub) | `/finance` | Dashboard cho quản lý: KPI + so sánh kỳ, trung tâm cảnh báo, P&L tóm tắt, xu hướng, link nhanh, nút xuất |
| 📄 Báo cáo P&L | `/finance/pnl` | P&L đầy đủ + cột so sánh kỳ + xuất Excel + mục tiêu KPI |
| 🏦 Sổ quỹ | `/finance/cashbook` | Toàn bộ sổ quỹ hiện có, dọn lại UI |
| 💸 Chi phí & Ngân sách | `/finance/expenses` | CRUD khoản chi + danh mục + ngân sách tháng |
| 📈 Phân tích | `/finance/analysis` | So sánh đối tác · Cửa hàng · Đơn doanh thu âm (sub-nav phẳng) |

**Quy ước nền tảng:**
- Mỗi route là 1 `page.tsx` server component, tự prefetch dữ liệu của nó (bỏ kiểu prefetch-theo-tab trong `src/lib/finance/page-data.ts`).
- Code client tách theo thư mục: `src/components/finance/{dashboard,pnl,cashbook,expenses,analysis,shared}/`.
- **Mỗi trang có đúng 1 bộ chọn kỳ** (`<PeriodFilter>`) điều khiển toàn bộ nội dung trang; lựa chọn giữ trên URL (`?period=` hoặc `?from=&to=`). Sửa lỗi 3 bộ chọn kỳ độc lập hiện tại.
- Sidebar thu gọn (hover): nhóm hiện dạng flyout; active theo `pathname.startsWith`.
- **Redirect tương thích ngược:** `/finance?tab=analysis` → `/finance/analysis`, `?tab=cashbook` → `/finance/cashbook`, `?tab=overview` → `/finance` (giữ bookmark cũ không vỡ).

**Phân quyền:** giữ gác cả cụm bằng `canViewFinancePage` (qua `hasPermission`). Mọi thao tác ghi (thêm/sửa/xóa khoản chi, danh mục, ngân sách, mục tiêu KPI, upload sổ quỹ) chỉ `isAdmin` như hiện nay. Không thêm quyền mịn ở vòng này.

---

## Trang 1 — Bảng điều khiển (`/finance`)

Bố cục từ trên xuống:

1. **Thanh tiêu đề:** tên trang + `<PeriodFilter>` + nút **Xuất báo cáo**.
2. **Dải KPI — 4 thẻ.** Các thẻ hiển thị: giá trị, và (khi phù hợp) so sánh kỳ trước (▲/▼) + tiến độ mục tiêu:
   - **Lợi nhuận ròng** (số chủ đạo) + Δ% so kỳ trước + thanh tiến độ mục tiêu
   - **Doanh thu ròng** + Δ% so kỳ trước + thanh tiến độ mục tiêu
   - **Margin trung bình** + Δ điểm so kỳ trước (không có mục tiêu)
   - **Số dư quỹ cuối kỳ** (từ sổ quỹ, `latestBalance`) — hiển thị giá trị + ngày cập nhật, không có Δ/mục tiêu
3. **Hai cột:**
   - **Trung tâm cảnh báo** (cột rộng): danh sách cảnh báo nhóm theo mức 🔴/🟡, mỗi dòng có link sâu xuống trang xử lý.
   - **P&L tóm tắt**: 5 dòng (DT ròng → chênh đền bù → LN gộp → chi phí VH → LN ròng) + link "Xem báo cáo đầy đủ →".
4. **Biểu đồ xu hướng 6 tháng:** doanh thu ròng · chi phí · lợi nhuận.
5. **3 thẻ link nhanh:** Top cửa hàng → Phân tích · Đối tác hiệu quả → Phân tích · Quỹ (số dư, COD nhận, đã trả shop) → Sổ quỹ.

**Dữ liệu/API:** 1 endpoint tổng hợp `GET /api/finance/dashboard?period=…` trả: KPI kỳ hiện tại + kỳ trước (tính Δ), mục tiêu kỳ, danh sách cảnh báo, P&L tóm tắt, trend 6 tháng, top shops/carriers, tóm tắt quỹ. Server prefetch first paint.

**So sánh kỳ:** tính song song aggregate kỳ hiện tại và kỳ liền trước (mở rộng từ logic `prevAgg` đã có trong `getFinanceOverviewData`).

## Trang 2 — Báo cáo P&L (`/finance/pnl`)

**Giữ nguyên** cấu trúc & công thức từ `PnLSection` + `getFinancePnlData`:
DOANH THU (tự động từ Order) → CHI PHÍ TRỰC TIẾP/Claims → **LỢI NHUẬN GỘP** → CHI PHÍ VẬN HÀNH (từ Expense) → **LỢI NHUẬN RÒNG**.

**Thêm mới:**
1. **Cột so sánh kỳ:** bảng 4 cột *Khoản mục · Kỳ này · Kỳ trước · Δ%*. Chế độ so sánh: **Tháng trước** hoặc **Cùng kỳ năm ngoái** (`compareTo=prev|yoy`). Δ tô màu theo hướng tốt/xấu (với dòng chi phí: tăng = đỏ).
2. **Xuất Excel:** `<ExportButton>` → `GET /api/finance/pnl/export?from=&to=&compareTo=`, tái dùng `src/lib/xlsx-export.ts` + pattern route như `src/app/api/claims/export/route.ts`. Workbook giữ cấu trúc bảng + cột so sánh. (Không làm PDF.)
3. **Mục tiêu kỳ:** dải hiển thị % đạt mục tiêu; admin bấm "Đặt mục tiêu" mở dialog nhập mục tiêu Doanh thu ròng / Lợi nhuận ròng cho tháng, lưu `FinanceTarget`.

**API:** `GET /api/finance/pnl?from=&to=&compareTo=` trả P&L kỳ hiện tại + kỳ so sánh trong một lần gọi.

## Trang 3 — Sổ quỹ (`/finance/cashbook`)

Chuyển `CashbookTab` thành trang riêng, **giữ nguyên toàn bộ tính năng**: upload file công nợ + lịch sử, 4 thẻ (COD nhận, đã trả shop, nạp tiền, số dư cuối kỳ), bảng giao dịch (lọc nhóm/tìm kiếm/phân trang), biểu đồ dòng tiền theo ngày, pie phân bố nhóm, tổng hợp trả shop. Chỉ **dọn style** (inline `style={{}}` → Tailwind) và dùng shared components. **Không** thêm Đối soát COD / Công nợ shop.

## Trang 4 — Chi phí & Ngân sách (`/finance/expenses`)

Tách 2 khối **Quản lý khoản chi** (`ExpenseSection`) + **Ngân sách tháng** (`BudgetSection`) khỏi tab Tổng quan ra trang riêng dành cho nhập liệu.
- **Khoản chi:** bảng CRUD + nút "Quản lý danh mục" + nút "+ Thêm khoản chi" nổi bật. **Thêm mới: lọc theo danh mục.** Tái dùng `ExpenseDialog`, `CategoryDialog`.
- **Ngân sách tháng:** bảng ngân sách/đã chi/còn lại/tỷ lệ/trạng thái, cảnh báo vượt 90%, nút "Đặt ngân sách". Tái dùng `BudgetDialog`.
- Logic và API hiện có (`/api/finance/expenses`, `/categories`, `/budgets`) giữ nguyên.

## Trang 5 — Phân tích (`/finance/analysis`)

Chuyển `AnalysisTab` thành trang riêng, **bỏ "tab trong tab"** → thay bằng **thanh phân đoạn phẳng** (`<SegmentedNav>`) + 1 bộ chọn kỳ chung:
- **🚚 So sánh đối tác:** bảng so sánh margin/đơn lỗ/COD + biểu đồ cột.
- **🏪 Cửa hàng:** tìm kiếm, xếp hạng + xu hướng tăng/giảm, line chart top 5, cảnh báo shop giảm đơn.
- **⚠️ Đơn doanh thu âm:** thẻ tóm tắt + bảng, click mở `OrderDetailDialog`.

Giữ đủ chức năng & biểu đồ + các API hiện có (`/carriers`, `/shops`, `/shop-trends`, `/shop-chart`, `/negative-revenue`). **Dọn inline-style → Tailwind.** Segment giữ trên URL (`?view=`).

---

## Schema mới — `FinanceTarget`

```prisma
model FinanceTarget {
  id           String   @id @default(cuid())
  month        DateTime @db.Date        // ngày 1 của tháng
  metric       String                    // "NET_REVENUE" | "NET_PROFIT"
  targetAmount Decimal
  createdBy    String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  @@unique([month, metric])
}
```
Migration Prisma. Nếu một tháng chưa đặt mục tiêu cho một metric → ẩn thanh tiến độ tương ứng. API `GET/PUT /api/finance/targets?month=YYYY-MM` (PUT chỉ `isAdmin`).

## Module cảnh báo — `src/lib/finance/alerts.ts`

`getFinanceAlerts(range): Promise<FinanceAlert[]>` với `FinanceAlert = { id, severity: 'critical' | 'warning', category, title, detail, href }`. Là **bộ tổng hợp** từ logic đã có, không tạo dữ liệu mới:
- **Ngân sách vượt ngưỡng:** từ `getFinanceBudgetSummary` — ratio > 100% = critical, > 90% = warning. `href` → `/finance/expenses`.
- **Shop giảm đơn:** từ logic shop-trends (`alertLevel` critical/warning). `href` → `/finance/analysis?view=shop`.
- **Đơn doanh thu âm:** đếm + tổng từ logic negative-revenue. `href` → `/finance/analysis?view=negative`.
- **Margin đối tác giảm mạnh:** so margin đối tác kỳ này vs kỳ trước (từ logic carriers). `href` → `/finance/analysis?view=carrier`.

## Module xuất Excel — `src/lib/finance/pnl-export.ts`

`buildPnlWorkbook(pnl, comparison)` dựng workbook bằng `xlsx` (SheetJS), tái dùng helper `src/lib/xlsx-export.ts`. Route `GET /api/finance/pnl/export` gọi `getFinancePnlData` (×2 cho 2 kỳ) rồi trả file. Tên file: `bao-cao-pnl_<kỳ>.xlsx`. Chuỗi tiếng Việt UTF-8.

## Tổ chức data layer & component dùng chung

**Data layer** `src/lib/finance/`:
- Tách `landing.ts` (đang ôm overview + P&L + budget) thành: `dashboard.ts` (tổng hợp hub + so sánh kỳ), `pnl.ts` (logic P&L — giữ nguyên công thức `getFinancePnlData`), `overview.ts` (trend + distribution), `budgets.ts`, `alerts.ts`, `targets.ts`, `pnl-export.ts`. Giữ `finance-period.ts`.
- Cashbook/analysis: giữ logic ở route, tách helper khi cần. **Refactor có mục tiêu, không đụng phần không liên quan.**

**Component dùng chung** `src/components/finance/shared/`:
`<PeriodFilter>` · `<KpiCard>` · `<MoneyText>` (gom `fmtVND` đang lặp) · `<FinancePanel>` (khung panel trắng bo góc) · `<ExportButton>` · `<SegmentedNav>` · `<AlertCenter>`.

---

## Out of scope (KHÔNG làm vòng này)

- Đối soát COD (cashbook ↔ orders) và mọi logic map 1-1.
- Công nợ giữ hộ shop / tuổi nợ ("còn phải trả" theo shop).
- Xuất PDF.
- Phân quyền mịn theo từng trang con.
- Dự báo dòng tiền.
- Đổi bất kỳ công thức tài chính hiện có (P&L, margin, doanh thu ròng giữ nguyên).

## Lộ trình build theo giai đoạn

Mỗi phase độc lập shippable, có plan/PR riêng:
- **Phase 0 — Nền tảng:** sidebar nhóm + flyout; 5 route khung; shared components (`<PeriodFilter>`, `<MoneyText>`, `<FinancePanel>`, `<SegmentedNav>`); scaffold `src/lib/finance/` (tách `landing.ts`). Không đổi hành vi nghiệp vụ.
- **Phase 1 — Tách trang đạt parity:** chuyển nội dung Overview/Analysis/Cashbook sang các trang chi tiết + hub cơ bản; bỏ tab-trong-tab; redirect URL cũ; dọn style. Chưa thêm tính năng mới.
- **Phase 2 — Hub & P&L nâng cao:** hub đầy đủ (KPI + so sánh kỳ + link nhanh + P&L tóm tắt); cột so sánh P&L; `FinanceTarget` + dialog mục tiêu.
- **Phase 3 — Cảnh báo & Xuất Excel:** module `alerts.ts` gắn vào `<AlertCenter>` trên hub; xuất Excel P&L.

## Chiến lược test

Theo pattern `src/__tests__/` hiện có (Vitest, `npx vitest run <file>`):
- **Unit (lib thuần, không mock Prisma):** tính Δ so sánh kỳ, tiến độ mục tiêu, tổng hợp `getFinanceAlerts`, builder workbook P&L, parse period.
- **Route:** cập nhật `src/__tests__/lib/route-permissions.test.ts` cho 4 route mới + route `dashboard`/`targets`/`pnl/export`.
- **Responsive:** theo mẫu `*Responsive.test.tsx` cho các trang mới.
- Công thức P&L không đổi → test tài chính hiện có vẫn pass. Test mojibake UTF-8 áp dụng cho file mới có chuỗi tiếng Việt.

## Tiêu chí nghiệm thu

1. Sidebar hiện nhóm "Tài chính" với 5 mục con; điều hướng đúng; flyout khi thu gọn.
2. Mỗi trang có đúng 1 bộ chọn kỳ; URL phản ánh kỳ đã chọn; reload giữ nguyên.
3. `/finance?tab=…` cũ redirect đúng sang route mới.
4. Hub hiển thị 4 KPI có Δ so kỳ trước + tiến độ mục tiêu (khi có), trung tâm cảnh báo có link sâu hoạt động, P&L tóm tắt khớp trang P&L.
5. Trang P&L có cột so sánh kỳ + nút xuất Excel tạo file đúng cấu trúc; admin đặt được mục tiêu.
6. Sổ quỹ, Chi phí & Ngân sách, Phân tích giữ đủ chức năng cũ; Phân tích không còn tab-trong-tab; lọc khoản chi theo danh mục hoạt động.
7. Quyền: non-admin không thấy nút ghi; thiếu `canViewFinancePage` bị chặn cả cụm.
8. `npm run lint`, `npx tsc --noEmit`, và toàn bộ test pass.
