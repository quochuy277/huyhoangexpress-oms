# Performance Baseline — 2026-04-22

Snapshot trước khi bắt đầu các công việc perf của Sprint 2
(branch `chore/sec-perf-ux-2026-04`, ngay sau khi Sprint 1 landed).

## 1. Scope & disclaimers

Plan gốc đề xuất: Chrome DevTools Performance + React Profiler + Lighthouse
trên 2–3 trang nóng, throttle CPU 4× + 3G slow. Tôi ghi nhận ràng buộc sau:

- **Môi trường hiện tại không có browser/DevTools**: không chạy được
  `performance.measureUserAgentSpecificMemory()`, không record FCP/LCP/INP
  thực sự. Các con số "đo-được" sẽ đến ở Sprint 2 sau khi QA chạy Lighthouse
  mobile profile và dán vào section 7 bên dưới.
- Next.js 16 Turbopack (`next build`) **không in kích thước First Load JS**
  trong stdout như webpack trước đây. Thay vào đó đo từ thư mục build
  artifacts (`.next/static/chunks`) — đây là after-gzip-before-brotli size
  tại rest, không phải số browser parse thật.
- Không có bundle analyzer được cấu hình; phần "biggest chunks" chỉ là
  file size raw. Bundle-analyzer hoặc `source-map-explorer` sẽ bổ sung ở
  sprint kế tiếp nếu cần quyết định tree-shaking cụ thể.

Mục tiêu của baseline này không phải là con số chính xác — mục tiêu là
**có một cột mốc trước-sau** để Sprint 2 so sánh sau khi refactor.

## 2. Build output

```
Next.js 16.1.6 (Turbopack)
✓ Compiled successfully in 27.8s
✓ Generating static pages using 7 workers (96/96) in 4.0s
```

- 96 pages/routes
- 91 chunk files trong `.next/static/chunks/` (tổng 5.2 MB unzipped)
- 5 chunks lớn cùng hash ~410 KB each (likely shared framework bundle
  duplicated across routes) → cần bundle-analyzer để xác định.
- Server app bundle: 4.0 MB in `.next/server/app/`.

**Top 5 chunk theo kích thước file (unzipped):**

```
408977  f90f74c3a6a96845.js
408977  a941491c82fcdeae.js
408977  98575645df028646.js
408977  6245ab608fadcc68.js
408977  5f595602c286f7aa.js
```

Cả 5 có size y hệt → nhiều khả năng cùng là React/framework vendor chunk
được hash lại theo page entry. Confirm bằng bundle-analyzer ở sprint sau.

## 3. Largest source files (LOC)

> **Measurement**: `wc -l` (tổng số dòng, **bao gồm** dòng trắng). Đây
> là số "logical line count" nhiều tool đo bundle + IDE hiển thị. Non-blank
> count (`grep -v "^\s*$" | wc -l`) sẽ thấp hơn ~10–15%. Toàn bộ doc này
> thống nhất dùng `wc -l`.

```
1429  src/components/claims/ClaimsClient.tsx
 844  src/components/claims/ClaimDetailDrawer.tsx
 808  src/components/shared/OrderDetailDialog.tsx
 742  src/components/orders/OrderChangesTab.tsx
 685  src/components/orders/OrderTable.tsx
 654  src/components/claims/ClaimsToolsTab.tsx
 641  src/components/finance/OverviewTab.tsx
 591  src/components/delayed/DelayedOrderTable.tsx
 582  src/components/shared/AddClaimFromPageDialog.tsx
 548  src/components/orders/OrderFilters.tsx
```

Plan Rev 2 đã lưu ý: `OrderDetailDialog` + `OrderFilters` **không phải**
top-priority (đã có dynamic import + memo). Những file còn lại trên
ngưỡng 600 LOC đáng audit:

- `ClaimsClient.tsx` (1429 LOC, 40 hooks calls) — ưu tiên 1, plan chỉ đích danh.
  **Sprint 2: CHƯA refactor** — carry-over sang Sprint 3 (xem mục 9 bên dưới).
- `OverviewTab.tsx` (641 → **497** LOC, `wc -l`) — **Sprint 2: đã tách
  thành 4 component memo-hoá**; 3 component mới: `OverviewPeriodSelector`
  (88 LOC), `OverviewSummaryCards` (110 LOC), `OverviewCharts` (124 LOC).
  Tổng 4 file = 819 LOC (vs. 641 cũ, +178 do boilerplate import + type);
  lợi ích thực: chart tree không reconcile khi người dùng gõ vào input
  filter hoặc mở dialog khác.
- `ClaimDetailDrawer.tsx` (844 LOC) — đã được dynamic-import từ ClaimsClient,
  chỉ tải khi mở drawer — không phải blocker cho initial load.
- `OrderChangesTab.tsx` (742 LOC) — đứng sau vì chỉ hiển thị tab con.

**Admin tabs** (plan 2.7 B1 chỉ yêu cầu audit nếu > 700 LOC):
- `UsersTab.tsx` 508 LOC — dưới ngưỡng, không cần refactor.
- `PermissionsTab.tsx` 294 LOC — dưới ngưỡng.
- `RequestsFeedbackTab.tsx` 155 LOC — dưới ngưỡng.

→ Không có admin tab nào chạm ngưỡng 700 LOC. Plan 2.7 B1 phần admin
xem như **N/A** cho thời điểm hiện tại (sẽ re-check ở Sprint 3 sau khi
theo dõi UX thực tế).

## 4. Prisma select audit (static)

Scan 40 route handlers dùng `findMany/findUnique/findFirst`, đếm số
occurrence `select:` trong mỗi file làm heuristic "có đang select rõ
columns hay đang hứng `*`".

**Có select (≥1 lần)**:
- `dashboard/activities/route.ts` (9) — OK
- `crm/shops/route.ts` (4) — OK
- `claims/route.ts` (2)
- `orders/changes/route.ts` (1)
- `attendance/team/route.ts` (1)

**Còn lại 35 route**: chưa quét chi tiết; một số đã biết dùng `include`
(eager-join) thay vì `select` (ví dụ `crm/prospects/[id]` vừa thêm ở
Sprint 1). Những chỗ trả object có relation lớn cần audit:

1. `GET /api/crm/shops` — list các shop đi kèm assignments + recent
   care logs. Nếu list trả kèm care log lớn thì over-fetch.
   → **Sprint 2 đã fix** (commit `9ffcad5`): trim ShopAssignment +
   ShopProfile, loại `internalShopNote` Text blob và các cột không dùng.
2. `GET /api/orders/changes` — list orders có field changes. Mỗi record
   có thể đi kèm nhiều OrderChange rows.
   → **Sprint 2 đã fix** (commit `9ffcad5`): bỏ `include` eager-join
   của `uploadHistoryId`.
3. `GET /api/claims` — list claims có include compensation + user.
   → **Sprint 2 fix-up** (commit sau `9ffcad5`): chuyển từ `include`
   sang `select` tường minh trong `src/lib/claims-page-data.ts`, drop
   các field không dùng ở list view (`completedAt`, `completedBy`,
   `source`, `createdById`, `createdAt`, `updatedAt`). Giữ lại
   `issueDescription`/`processingContent` vì UI list render trực tiếp.

## 5. Routes đã streaming/CSV vs. còn memory-XLSX

| Route | Format hiện tại | Plan 1.4 B3 |
|-------|-----------------|------------|
| `GET /api/orders/delayed/export` | CSV stream | ✅ đã xong |
| `GET /api/attendance/export` | CSV | ✅ đã xong |
| `GET /api/orders/export` | XLSX in-memory | ⚠️ chuyển sang CSV stream trong Sprint 2 |
| `GET /api/claims/export` | XLSX in-memory | ⚠️ chuyển sang CSV stream trong Sprint 2 |

**Rủi ro rõ ràng**: `orders/export` và `claims/export` build toàn bộ workbook
trong RAM trước khi trả. Với dataset 10K+ rows → risk OOM trên Vercel Hobby
(512 MB) + thời gian response > 30s (timeout). Sprint 2 fix cả 2.

## 6. Mutations thiếu optimistic update (plan 2.11 C2)

Grep `useMutation` + `onMutate` trong `src/hooks/`:

- ✅ `useTodos.ts` — đã optimistic (drag-drop reorder, mark done).
- ✅ `useCrmPipeline` — đã optimistic (stage move).
- ❌ `useOrderNotes` / order notes edit — cần.
- ❌ `useWarehouseConfirm` / warehouse confirm toggle — cần.
- ❌ Announcement pin/mark-read mutations — cần.

Sprint 2 ship optimistic cho 3 mục ❌ ở trên.

## 7. Live measurements (cần QA chạy — chưa có dữ liệu)

> **Status**: Ô này không thể filled bởi dev agent — yêu cầu Chrome
> DevTools + Lighthouse trên máy QA. Đây là **điều kiện bắt buộc** để
> chốt Sprint 2 DoD (plan F "Hiệu năng — Sprint 2 mở đầu").

| Page | Device | LCP (ms) | INP (ms) | TBT (ms) | Bundle (KB gzip) | Notes |
|------|--------|----------|----------|----------|------------------|-------|
| `/orders` | Desktop | _QA pending_ | _QA pending_ | _QA pending_ | _QA pending_ | |
| `/orders` | Mobile 4× throttle | _QA pending_ | _QA pending_ | _QA pending_ | _QA pending_ | |
| `/claims` | Desktop | _QA pending_ | _QA pending_ | _QA pending_ | _QA pending_ | |
| `/claims` | Mobile 4× throttle | _QA pending_ | _QA pending_ | _QA pending_ | _QA pending_ | |
| `/finance` | Desktop | _QA pending_ | _QA pending_ | _QA pending_ | _QA pending_ | |

QA workflow: xem `docs/perf-reports/README.md`. Ngắn gọn:
1. `npm run build && npm run start`
2. Chrome Incognito (no extensions) → DevTools → Lighthouse → Performance
   (throttle: "Slow 4G", "4x CPU slowdown" cho mobile).
3. Lưu report HTML vào `docs/perf-reports/{YYYY-MM-DD}-{page}-{device}.html`.
4. Điền 4 metric chính vào bảng trên.

## 8. Post-Sprint 2 delta (cần QA chạy — chưa có dữ liệu)

> **Status**: Cần đo bằng browser + server logs. Không thể filled
> trước khi Sprint 2 close.

So sánh:
- CSV stream orders/claims: size file xuất + peak memory server (đo qua
  `/api/health` metrics nếu có, hoặc log `process.memoryUsage()` trước/sau).
- Select audit: số byte response trung bình (ghi qua DevTools Network tab,
  endpoint `/api/crm/shops`, `/api/orders/changes`, `/api/claims`).
- Optimistic updates: UX-only, demo clip trước/sau.

## 9. Sprint 2 carry-over (chuyển sang Sprint 3)

Sprint 2 đã ship 4/5 hạng mục của plan 2.7 B1 + 2.8 B2 + 1.4 B3 + 2.11 C2:

- ✅ 1.4 B3 — CSV stream `orders/export` + `claims/export`.
- ✅ 2.8 B2 — select audit 3 route (crm/shops, orders/changes, claims).
- ✅ 2.11 C2 — optimistic updates (order notes, warehouse confirm, announcements).
- ✅ 2.7 B1 — tách OverviewTab.
- ⚠️ 2.7 B1 — **ClaimsClient.tsx chưa refactor** (1429 LOC, 40 hooks).
  Lý do hoãn: refactor file này cần profile thật trên trang `/claims`
  với DevTools Performance + React Profiler để biết re-render hotspots;
  refactor mù (tách sub-component không có measurement) có rủi ro
  ngược (tăng bundle splitting overhead mà không giảm work thật).
  Carry-over Sprint 3: sau khi QA điền mục 7, ta có baseline INP để
  verify refactor delta.
- N/A 2.7 B1 admin tabs — không tab nào ≥ 700 LOC (xem mục 3).

**Sprint 2 DoD vẫn chờ**:
- Mục 7 live measurements (QA phải điền).
- Mục 8 delta (sau khi có mục 7).
- Refactor ClaimsClient (Sprint 3, data-driven).
