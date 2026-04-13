# Plan: Review & Optimize HuyHoang OMS sau điều chỉnh quyền

## Context
Sau commit `e428d7b` thêm 4 permissions mới và fix enforcement toàn bộ routes, cần review toàn diện ứng dụng để tìm lỗi còn sót, lỗ hổng bảo mật, và tối ưu hiệu suất. Ứng dụng là Next.js 16 + React 19 + Prisma + PostgreSQL với 47 permissions, 14 trang dashboard.

---

## PHASE 1: Sửa lỗi Permission & Bảo mật (CRITICAL) ✅ DONE

### ✅ Task 1.1 — Fix lỗ hổng profile change-request ghi field tùy ý (SECURITY)
**File:** `src/app/api/profile/change-requests/[id]/route.ts` (line 24-27)
**File:** `src/app/api/profile/change-requests/route.ts` (line 34-48)

**Vấn đề:** Khi admin approve request, `request.fieldName` được ghi thẳng vào `prisma.user.update` không có allowlist. User có thể craft request đổi `role`, `permissionGroupId`, `isActive` → leo thang quyền.

**Giải pháp:**
- Tạo allowlist fields được phép đổi:
```ts
const ALLOWED_FIELDS = ["name", "phone", "dateOfBirth", "hometown", "permanentAddress", "currentAddress", "citizenId", "socialLink"];
```
- Validate ở **cả 2 nơi**: POST route (khi user submit) và PATCH route (khi admin approve)
- Reject nếu `fieldName` không nằm trong allowlist

### ✅ Task 1.2 — Fix middleware bypass khi không có permissions object
**File:** `src/middleware.ts` (line 54)

**Vấn đề:** `if (permissions) { ... }` — nếu user không có `permissionGroup` và JWT thiếu `permissions`, toàn bộ permission check bị SKIP.

**Giải pháp:** Nếu `!permissions && role !== "ADMIN"`, redirect về `/no-access`.

### ✅ Task 1.3 — Tạo trang /no-access để tránh redirect loop
**Vấn đề:** Khi bị từ chối quyền, middleware redirect về `/orders`. Nhưng `/orders` cũng yêu cầu `canViewOrders` → loop vô hạn.

**Giải pháp:** Tạo `src/app/(dashboard)/no-access/page.tsx` với thông báo "Không có quyền truy cập". Thêm `/no-access` vào public routes.

### ✅ Task 1.4 — Thay toàn bộ raw permission check bằng hasPermission/requirePermission
**Vấn đề:** Nhiều nơi check `session.user.permissions?.canXxx` trực tiếp thay vì dùng `hasPermission()` → ADMIN override bị bỏ qua.

**Đã sửa:**
- Tất cả API routes: `admin/users`, `admin/permission-groups`, `documents`, `announcements`, `claims/compensation`, `finance/expenses`, 13 CRM routes → dùng `hasPermission()`/`requirePermission()`
- Tất cả pages: `overview`, `orders`, `claims`, `crm`, `finance`, `attendance`, `todos` → dùng `hasPermission()`
- `src/lib/crm-page-data.ts` helper → dùng `hasPermission()`
- `src/components/layout/Sidebar.tsx` → ADMIN luôn thấy tất cả nav items, non-ADMIN check `permissions?.[key]`

### ✅ Task 1.5 — Fix order detail dùng role thay vì permission cho finance fields
**File:** `src/app/(dashboard)/orders/[requestCode]/page.tsx` (line 28, 74-77)

**Vấn đề:** `isStaffOrViewer = userRole === "STAFF" || userRole === "VIEWER"` quyết định hiển thị carrierFee/revenue. Manager bị revoke `canViewCarrierFee` vẫn thấy; Staff được grant vẫn không thấy.

**Giải pháp:** Thay bằng permission check:
```ts
const canSeeCarrierFee = hasPermission(session?.user, "canViewCarrierFee");
const canSeeRevenue = hasPermission(session?.user, "canViewRevenue");
```

### ✅ Task 1.6 — Thêm permission check cho dashboard API routes
**Vấn đề:** 5 API routes dashboard chỉ check authentication, không check `canViewDashboard`.

**Files:**
- `src/app/api/dashboard/activities/route.ts`
- `src/app/api/dashboard/carriers/route.ts`
- `src/app/api/dashboard/summary/route.ts`
- `src/app/api/dashboard/top-shops/route.ts`
- `src/app/api/dashboard/trend/route.ts`

**Pattern:** Thêm `requirePermission(session.user, "canViewDashboard")` sau auth check.

### ✅ Task 1.7 — Giảm TTL refresh permission và thêm cơ chế invalidation
**File:** `src/lib/auth.ts` (line 11)

**Vấn đề:** `PERMISSIONS_REFRESH_INTERVAL = 30 * 60 * 1000` — sau khi admin đổi quyền, user đang online giữ quyền cũ tối đa 30 phút.

**Giải pháp đã thực hiện:**
- Giảm interval xuống 5 phút
- Permission group update → auto close sessions + set `force_logout_at`
- User PATCH (đổi permissionGroupId/isActive) → close sessions
- User DELETE (soft-delete) → close sessions
- Heartbeat check recent force-logout trước khi tạo session mới
- JWT refresh check `isActive` → invalidate token nếu user bị deactivate
- HeartbeatProvider client xử lý cả `forceLogout: true` lẫn `401` → signOut

### ✅ Task 1.8 — Thêm middleware note cho /todos và /attendance
**File:** `src/middleware.ts` (line 11, `ROUTE_PERMISSIONS`)

**Quyết định:** `/todos` và `/attendance` mọi user đều truy cập được (xem todo/chấm công của mình), chỉ restrict features bên trong → KHÔNG thêm middleware. Thêm comment giải thích.

---

## PHASE 2: Sửa Test & Tooling (HIGH)

### Task 2.1 — Fix lint script cho Next.js 16
**File:** `package.json:9`

**Vấn đề:** `next lint` không tương thích Next 16. Chuyển sang ESLint CLI trực tiếp.

### Task 2.2 — Fix 12 test failures
**Vấn đề:** 12/477 tests fail sau refactor:

- **orders-search & orders-route-search tests**: expect query cũ, code mới dùng `in` và thêm `isMulti`/`hasExactMatch`
- **overview-page.test.tsx**: mock session thiếu `canViewDashboard`
- **orders-rbac-route.test.ts**: expect export trả 200 nhưng mock không có data

**Giải pháp:** Cập nhật test fixtures để khớp với code mới.

### Task 2.3 — Thêm RBAC matrix tests
Test permission enforcement cho các role combinations: ADMIN, MANAGER, STAFF, VIEWER, custom permission group.

---

## PHASE 3: Error Handling & Reliability (HIGH)

### Task 3.1 — Thêm try-catch cho dashboard API routes (kết hợp Task 1.6)
**Files:** 5 dashboard routes + announcement routes thiếu error handling.

- `src/app/api/dashboard/activities/route.ts`
- `src/app/api/dashboard/carriers/route.ts`
- `src/app/api/dashboard/summary/route.ts`
- `src/app/api/dashboard/top-shops/route.ts`
- `src/app/api/dashboard/trend/route.ts`
- `src/app/api/announcements/route.ts` (GET & POST)
- `src/app/api/announcements/[id]/route.ts`
- `src/app/api/announcements/unread-count/route.ts`

### Task 3.2 — Sửa silent error swallowing (empty catch blocks)

| File | Giải pháp |
|------|-----------|
| `src/components/shared/UserProfileDialog.tsx:89` | Thêm `console.warn` |
| `src/components/crm/ProspectFormDialog.tsx` | Hiện toast lỗi |
| `src/components/shared/AddTodoDialog.tsx` | Hiện toast lỗi |
| `src/components/todos/TodoReminderBanner.tsx` | Thêm `console.warn` |
| `src/hooks/useTodoUsers.ts` | Thêm `console.warn` |
| `src/app/(landing)/components/StatsSection.tsx` | Thêm `console.warn` |

### Task 3.3 — Fix announcement POST permission check
**File:** `src/app/api/announcements/route.ts`

Thay `session.user.permissions?.canCreateAnnouncement` bằng `requirePermission(session.user, "canCreateAnnouncement")` để đảm bảo ADMIN bypass nhất quán.

---

## PHASE 4: Tối ưu Query & API Performance (MEDIUM)

### Task 4.1 — Refactor CRM page data
**File:** `src/lib/crm-page-data.ts`

- Giảm số `groupBy/findMany`, paginate trước khi enrich
- Cân nhắc bảng summary/precompute cho shop stats

### Task 4.2 — Refactor delayed page data
**File:** `src/lib/delayed-page-data.ts`

- Đẩy filter/sort/pagination xuống DB thay vì scan 2000+ records rồi parse note bằng JS mỗi request

### Task 4.3 — Cache ngắn hạn cho dashboard & finance aggregates
**File:** `src/lib/dashboard-overview-data.ts`

- Thêm in-memory cache (hoặc HTTP cache headers) cho aggregate queries nặng
- Rà search trên `publicNotes`, `receiverName`, `shopName` — nếu data lớn, cân nhắc full-text index

### Task 4.4 — Tăng staleTime cho dữ liệu ít thay đổi (React Query)
- Claims filter options: 5min → 30min
- User list, carrier list: thêm staleTime 30min

---

## PHASE 5: Tối ưu Frontend Performance (MEDIUM)

### Task 5.1 — Tối ưu next.config.ts
**File:** `next.config.ts`

```ts
productionBrowserSourceMaps: false,
experimental: {
  optimizePackageImports: [
    'lucide-react', 'recharts', 'date-fns',
    '@tiptap/react', '@tiptap/starter-kit',
    '@radix-ui/react-dialog', '@radix-ui/react-popover',
    '@radix-ui/react-select', '@radix-ui/react-tooltip',
  ],
},
```

### Task 5.2 — Tối ưu IdleLogoutProvider
**File:** `src/components/attendance/IdleLogoutProvider.tsx`

- Thêm `{ passive: true }` cho 6 event listeners
- Extract 20+ inline style objects thành constants hoặc Tailwind

### Task 5.3 — Consolidate useState trong OverviewTab.tsx
**File:** `src/components/finance/OverviewTab.tsx` (687 lines, 14+ useState)

- Gom filter/dialog state thành objects
- Thêm `useMemo` cho chart data transformations
- Extract sub-components: `ExpenseSection`, `BudgetSection`, `PnLSection`

### Task 5.4 — Split & optimize admin/users/page.tsx
**File:** `src/app/(dashboard)/admin/users/page.tsx` (1,166 lines)

- Chuyển 131 inline style objects sang Tailwind
- Split thành: `UserTable`, `UserFormDialog`, `PermissionGroupEditor`
- Di chuyển vào `src/components/admin/`

### Task 5.5 — Thêm useCallback cho OrderFilters handlers
**File:** `src/components/orders/OrderFilters.tsx` (539 lines)

### Task 5.6 — Thêm React.memo cho OrderDetailDialog
**File:** `src/components/shared/OrderDetailDialog.tsx` (789 lines)

### Task 5.7 — Lazy-load dialog/drawer nặng
- Áp dụng `dynamic()` cho các dialog/drawer chưa được lazy-load
- Ưu tiên initial data từ server + hydrate để giảm fetch sau mount

---

## PHASE 6: Code Quality (LOW)

### Task 6.1 — Thay console.log bằng structured logger
100+ console statements trong API routes → dùng `src/lib/logger.ts` (nếu đã có) hoặc tạo mới.

### Task 6.2 — Xóa Zustand dependency không sử dụng
```bash
npm uninstall zustand
```

### Task 6.3 — Thêm timing log cho routes chậm
Thêm timing measurement cho: CRM, delayed, dashboard, export routes.

---

## Verification Plan

### Sau Phase 1:
- Login với user không có permissionGroup → thấy `/no-access`
- Login với ADMIN trong custom permission group restrictive → vẫn access được mọi nơi
- Submit profile change request cho field `role` → bị reject 400
- Gọi `/api/dashboard/summary` không có `canViewDashboard` → 403
- Trang order detail: user có `canViewCarrierFee` → thấy; user không có → ẩn
- Đổi permission group → user bị force-logout hoặc refresh trong 5 phút

### Sau Phase 2:
- `npm run lint` pass
- `npm run test:run` → 0 failures

### Sau Phase 3-4:
- Simulate DB error → API trả 500 structured
- CRM/delayed page load time giảm (đo trước/sau)

### Sau Phase 5:
- `npm run build` thành công, bundle size giảm
- React DevTools Profiler: re-render count giảm ở OverviewTab, OrderFilters

---

## Thứ tự ưu tiên

| Phase | Ước tính | Rủi ro nếu hoãn |
|-------|----------|-----------------|
| Phase 1 (Security) | 4-5h | **CRITICAL** — lỗ hổng leo thang quyền, bypass permission |
| Phase 2 (Tests) | 2-3h | **HIGH** — CI fail, không detect regression |
| Phase 3 (Error Handling) | 2-3h | MEDIUM — lỗi không xử lý trong production |
| Phase 4 (API Performance) | 4-6h | MEDIUM — slow pages khi data lớn |
| Phase 5 (Frontend Perf) | 6-8h | LOW — UX chậm nhưng functional |
| Phase 6 (Code Quality) | 3-4h | LOW — maintainability |

**Thứ tự thực hiện:** Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
