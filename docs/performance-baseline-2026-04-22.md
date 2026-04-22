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
- `OverviewTab.tsx` (641 LOC) — ưu tiên 2, nhiều `useState` + inline styles.
- `ClaimDetailDrawer.tsx` (844 LOC) — đã được dynamic-import từ ClaimsClient,
  chỉ tải khi mở drawer — không phải blocker cho initial load.
- `OrderChangesTab.tsx` (742 LOC) — đứng sau vì chỉ hiển thị tab con.

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
2. `GET /api/orders/changes` — list orders có field changes. Mỗi record
   có thể đi kèm nhiều OrderChange rows.
3. `GET /api/claims` — list claims có include compensation + user.

Sprint 2 đã fix **3 route trên** (xem commit Sprint 2).

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

## 7. Live measurements (to be filled by QA / Sprint 2 end)

| Page | Device | LCP (ms) | INP (ms) | TBT (ms) | Bundle (KB gzip) | Notes |
|------|--------|----------|----------|----------|------------------|-------|
| `/orders` | Desktop | _pending_ | _pending_ | _pending_ | _pending_ | |
| `/orders` | Mobile 4× throttle | _pending_ | _pending_ | _pending_ | _pending_ | |
| `/claims` | Desktop | _pending_ | _pending_ | _pending_ | _pending_ | |
| `/claims` | Mobile 4× throttle | _pending_ | _pending_ | _pending_ | _pending_ | |
| `/finance` | Desktop | _pending_ | _pending_ | _pending_ | _pending_ | |

QA: chạy `npm run build && npm run start`, mở Chrome Incognito (no extensions),
DevTools → Lighthouse → Performance, lưu report HTML vào
`docs/perf-reports/` và dán 4 metric chính vào bảng trên.

## 8. Post-Sprint 2 delta (to be filled on Sprint 2 close)

So sánh:
- CSV stream orders/claims: size file xuất + peak memory server (đo qua
  `/api/health` metrics nếu có, hoặc log `process.memoryUsage()` trước/sau).
- Select audit: số byte response trung bình (ghi qua devtools Network tab,
  endpoint `/api/crm/shops`, `/api/orders/changes`, `/api/claims`).
- Optimistic updates: UX-only, demo clip trước/sau.
