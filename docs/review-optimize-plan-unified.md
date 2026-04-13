# Plan Thống Nhất: Review & Optimize HuyHoang OMS

## Context
Sau commit `e428d7b` thêm 4 permissions mới và fix enforcement toàn bộ routes, đã review toàn diện ứng dụng. **Phase Security (cũ Phase 1) đã HOÀN THÀNH** qua 5 vòng review với Codex. Plan này gộp từ 2 nguồn:
- `docs/review-optimize-plan-2026-04-12.md` (plan gốc, chi tiết task + file paths)
- `docs/review-optimize-plan-2026-04-12-v2.md` (V2 từ Codex, tập trung performance + KPI)

**Ứng dụng:** Next.js 16 + React 19 + Prisma + PostgreSQL, 47 permissions, 14 trang dashboard.

---

## KPI bắt buộc đạt sau khi hoàn thành

- `GET /api/orders/delayed` p95 giảm ≥ 35% so với baseline
- `GET /api/crm/shops` + `GET /api/crm/dashboard` tổng server time giảm ≥ 30%
- Tab switch trên `finance`, `claims`, `orders`: phản hồi cảm nhận < 200ms
- Filter/search returns đồng bộ giữa URL/UI/API, không lệch dữ liệu
- Không còn `catch {}` hoặc `.catch(() => {})` tại các file đã liệt kê
- `npm run lint` + `npm run test:run` + `npm run build` đều pass

---

## ✅ PHASE SECURITY — Sửa lỗi Permission & Bảo mật (DONE)

> 8 tasks hoàn thành qua 5 vòng Codex review. Xem chi tiết tại `docs/review-optimize-plan-2026-04-12.md` Phase 1.

- ✅ Task S.1 — Fix lỗ hổng profile change-request (ALLOWED_FIELDS allowlist)
- ✅ Task S.2 — Fix middleware bypass khi !permissions
- ✅ Task S.3 — Tạo trang /no-access
- ✅ Task S.4 — Thay toàn bộ raw permission check bằng hasPermission/requirePermission (30+ files)
- ✅ Task S.5 — Fix order detail dùng permission thay vì role cho finance fields
- ✅ Task S.6 — Thêm requirePermission("canViewDashboard") cho 5 dashboard API routes
- ✅ Task S.7 — Giảm TTL 5min + force-logout mechanism + heartbeat check + JWT isActive
- ✅ Task S.8 — Middleware comment cho /todos và /attendance

---

## ✅ PHASE 0 — Baseline đo lường (DONE)

### ✅ Task 0.1 — Chốt baseline trước khi tối ưu
- [x] Tạo `src/lib/server-timing.ts` — helper utility tái sử dụng
- [x] Lưu template vào `docs/performance-baseline.md` với dataset + điều kiện đo

### ✅ Task 0.2 — Chuẩn hóa điểm đo
- [x] Thêm `Server-Timing` header cho: delayed (7 metrics), CRM prospects + shops, dashboard summary, returns
- [x] Console log `[Server-Timing]` cho mỗi route
- [x] TypeScript check pass (lỗi chỉ ở test files sẵn có)

---

## ✅ PHASE 1 — Quick Wins (DONE)

### ✅ Task 1.1 — Tối ưu next.config.ts (bundle size)
- [x] `productionBrowserSourceMaps: false`
- [x] `optimizePackageImports` cho lucide-react, recharts, date-fns, @tiptap/*, @radix-ui/*

### ✅ Task 1.2 — Đồng bộ filter returns giữa UI và API
- [x] `returns-page-data.ts`: Thêm 4 filter params (shopFilter, daysRange, hasNotes, confirmAsked) + Prisma WHERE
- [x] Fix `confirmAsked` value mismatch: UI "asked"/"notasked" → data layer aligned
- [x] API route parse shop, days, notes, confirm params → pass to data layer
- [x] `returns-tab-data.ts`: `fetchReturnsTabData` accepts `ReturnsFilterParams`, builds full URL
- [x] `ReturnsPageClient.tsx`: Passes filters+pageSize; invalidates on filter change
- [x] Removed redundant client-side filtering (kept only `daysRange` computed)

### ✅ Task 1.3 — Giảm overhead IdleLogoutProvider
- [x] Thêm `{ passive: true }` cho 6 event listeners
- [x] Debounce đã có (1000ms)
- [x] Fix empty catch block → `console.warn`

### ✅ Task 1.4 — Giảm waterfall landing stats
- [x] Server component prefetch stats, truyền `initialStats` vào StatsSection
- [x] StatsSection skip client fetch khi có initialStats
- [x] Fix empty catch block → `console.warn`

### ✅ Task 1.5 — Tăng staleTime cho dữ liệu ít thay đổi
- [x] Claims filter options: 5min → 30min
- [x] Dashboard carriers: thêm staleTime 10min

---

## ✅ PHASE 2 — Tối ưu API/Query Hot Path (DONE)

### ✅ Task 2.1 — Refactor delayed pipeline (CRITICAL)
**Đã làm:**
- [x] Early exit trong `scanDelayNote()` — skip line-by-line regex khi notes không chứa delay markers
- [x] `skipFacets` param — client gửi `skipFacets=1` khi chỉ đổi page/sort, server skip summary+facets
- [x] Hợp nhất `buildDelayedSummary` + `buildDelayedFacets` → `buildDelayedSummaryAndFacets` (single pass)
- [x] Client merge: giữ last known summary/facets khi server skip
- [x] Server-Timing đã có từ Phase 0

### ✅ Task 2.2 — Giảm fan-out query CRM bootstrap (CRITICAL)
**Đã làm:**
- [x] Gom 2 shopProfile queries thành 1 (queries #4 và #10 merged → giảm 10 → 9 queries)
- [x] Thêm staleTime 2min cho CRM dashboard, 1min cho shops/prospects
- [x] Thêm `placeholderData` cho shops query (avoid spinner on filter change)

### ✅ Task 2.3 — Tối ưu finance tabs
**Đã làm:**
- [x] CashbookTab: Tách uploads fetch riêng (không refetch mỗi lần đổi filter) → giảm 3→2 requests per filter change
- [x] Uploads chỉ fetch 1 lần lúc mount + sau upload

### ✅ Task 2.4 — Cache ngắn hạn cho dashboard aggregates
**Đã làm:**
- [x] In-memory cache 30s cho `getDashboardSummaryData` (theo role: admin vs staff)
- [x] Dashboard route đã có `Cache-Control: s-maxage=30, stale-while-revalidate=60`

---

## PHASE 3 — Tối ưu Render & Interaction Client (2-4 ngày)

### Task 3.1 — Giảm chi phí mount trang Claims
**Files:**
- `src/components/claims/ClaimsPageWrapper.tsx`
- `src/components/claims/ClaimsClient.tsx` (1429 lines, 18 useState, 109 inline styles)

- [ ] Rà soát `ssr: false` — chỉ giữ cho phần cần browser API
- [ ] Dynamic import dialog/drawer nặng theo nhu cầu mở
- [ ] Memo hóa row/cell/action, giảm inline object/function gây rerender

### Task 3.2 — Chia nhỏ admin/users/page.tsx (mega-file)
**File:** `src/app/(dashboard)/admin/users/page.tsx` (1166 lines, 37 useState, 131 inline styles)
**Tạo mới:** `src/components/admin/*`

- [ ] Tách: `UsersTab`, `PermissionsTab`, `RequestsFeedbackTab`, dialog forms
- [ ] Chuyển inline styles → Tailwind
- [ ] Lazy-load tab hiếm dùng (announcements/requests)
- [ ] Mục tiêu: không còn file đơn > 900 dòng ở khu vực admin

### Task 3.3 — Tối ưu OverviewTab và dialog tài chính
**File:** `src/components/finance/OverviewTab.tsx` (687 lines, 14 useState, 24 inline styles)

- [ ] Gom state liên quan thành nhóm logic (filter/dialog/form)
- [ ] `useMemo` cho chart data transformations
- [ ] Tách sub-component: `ExpenseSection`, `BudgetSection`, `PnLSection`
- [ ] Lazy-load dialog chỉnh sửa

### Task 3.4 — Tối ưu OrderDetailDialog
**File:** `src/components/shared/OrderDetailDialog.tsx` (790 lines, 10 useState, 68 inline styles)

- [ ] `React.memo` cho dialog + handler ổn định từ table
- [ ] Fetch chi tiết chỉ khi mở, cache theo `requestCode`
- [ ] Logic hiển thị field tài chính đã dùng permission (đã fix Phase Security)

### Task 3.5 — Thêm useCallback cho OrderFilters handlers
**File:** `src/components/orders/OrderFilters.tsx` (539 lines)

- [ ] Wrap filter handlers với `useCallback`

### Task 3.6 — Lazy-load dialog/drawer nặng
- [ ] Áp dụng `dynamic()` cho các dialog/drawer chưa được lazy-load
- [ ] Ưu tiên initial data từ server + hydrate để giảm fetch sau mount

---

## PHASE 4 — Reliability & Error Handling (1-2 ngày)

### Task 4.1 — Try-catch cho dashboard và announcements API
**Files:**
- `src/app/api/dashboard/activities/route.ts`
- `src/app/api/dashboard/carriers/route.ts`
- `src/app/api/dashboard/summary/route.ts`
- `src/app/api/dashboard/top-shops/route.ts`
- `src/app/api/dashboard/trend/route.ts`
- `src/app/api/announcements/route.ts` (GET & POST)
- `src/app/api/announcements/[id]/route.ts`
- `src/app/api/announcements/unread-count/route.ts`

- [ ] Trả lỗi chuẩn hóa (`{ error: message }`) thay vì throw trôi nổi
- [ ] Logging có context: route name + request params

### Task 4.2 — Xóa silent catch blocks

| File | Giải pháp |
|------|-----------|
| `src/components/shared/UserProfileDialog.tsx:89` | `console.warn` |
| `src/components/crm/ProspectFormDialog.tsx` | Toast lỗi |
| `src/components/shared/AddTodoDialog.tsx` | Toast lỗi |
| `src/components/todos/TodoReminderBanner.tsx` | `console.warn` |
| `src/hooks/useTodoUsers.ts` | `console.warn` |
| `src/app/(landing)/components/StatsSection.tsx` | `console.warn` |
| `src/components/attendance/IdleLogoutProvider.tsx` | `console.warn` |

**Tiêu chí:** Không còn silent catch trong các file trên.

### Task 4.3 — Fix announcement POST permission check
**File:** `src/app/api/announcements/route.ts`

- [ ] Thay `session.user.permissions?.canCreateAnnouncement` bằng `requirePermission(session.user, "canCreateAnnouncement")`

---

## PHASE 5 — Tooling, Tests & Cleanup (1-2 ngày)

### Task 5.1 — Fix 12 test failures
**Vấn đề:** 12/477 tests fail sau refactor:
- **10 tests** `orders-search` & `orders-route-search`: expect query cũ, code mới dùng `in` + thêm `isMulti`/`hasExactMatch`
- **1 test** `overview-page.test.tsx`: mock session thiếu `canViewDashboard`
- **1 test** `orders-rbac-route.test.ts`: expect export 200 nhưng mock không có data

**Giải pháp:** Cập nhật test fixtures khớp code mới.

### Task 5.2 — Thêm RBAC matrix tests
- [ ] Test permission enforcement cho: ADMIN, MANAGER, STAFF, VIEWER, custom permission group
- [ ] Test cho returns params flow và delayed query builder

### Task 5.3 — Xóa Zustand dependency không sử dụng
**File:** `package.json`

- [ ] Xác nhận không có file nào import `zustand`
- [ ] `npm uninstall zustand`
- [ ] Chỉ gỡ khi lint/test/build pass

### Task 5.4 — Thay console.log bằng structured logger
- [ ] Tạo/dùng `src/lib/logger.ts` cho 100+ console statements trong API routes

### Task 5.5 — Thêm timing measurement cho routes chậm
- [ ] CRM, delayed, dashboard, export routes — `Server-Timing` hoặc console timing

**Lưu ý:** `next lint` đã hoạt động đúng với `eslint-config-next@^16.1.6`, KHÔNG cần thay đổi lint script.

---

## Verify Plan theo Phase

| Phase | Verify |
|-------|--------|
| Phase 0 | Có baseline document với số liệu cụ thể |
| Phase 1 | Returns filter khớp URL/API; `npm run build` pass; bundle size giảm |
| Phase 2 | `Server-Timing` delayed p95 giảm ≥ 35%; CRM TTFB giảm ≥ 30% |
| Phase 3 | Tab switch < 200ms; Profiler re-render giảm; không file > 900 dòng |
| Phase 4 | Simulate DB error → 500 structured; không còn silent catch |
| Phase 5 | `npm run lint` + `npm run test:run` + `npm run build` pass |

---

## Rủi ro và giảm thiểu

| Rủi ro | Giảm thiểu |
|--------|-----------|
| Refactor delayed sai logic phân loại reason/risk | Giữ test snapshot cho `delay-analyzer`, rollout theo cờ |
| Chuyển fetch → React Query lệch state UI cũ | Chuyển từng tab, so sánh output trước/sau |
| Tách mega-file gây regression UI | Tách theo cụm component, verify thủ công |

---

## Timeline đề xuất

| Ngày | Phase |
|------|-------|
| Ngày 1 | Phase 0 + Phase 1 |
| Ngày 2-3 | Phase 2 (API hot path) |
| Ngày 4-5 | Phase 3 (Client render) |
| Ngày 6 | Phase 4 (Reliability) |
| Ngày 7 | Phase 5 (Tooling/Tests) + hardening |

---

## Trạng thái

- [x] **Phase Security** — DONE (5 vòng Codex review)
- [x] **Phase 0** — Baseline: DONE (Server-Timing headers + baseline template)
- [x] **Phase 1** — Quick Wins: DONE (5 tasks)
- [x] **Phase 2** — API Hot Path: DONE
- [ ] Phase 3 — Client Runtime: TODO
- [ ] Phase 4 — Reliability: TODO
- [ ] Phase 5 — Tooling/Tests: TODO
