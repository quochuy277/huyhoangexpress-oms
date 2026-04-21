# Kế Hoạch Rà Soát Bảo Mật + Tăng Tốc + UX — HuyHoang OMS

Ngày lập: 2026-04-20
Rev 2 — 2026-04-20 (cập nhật sau review của Codex)

## Changelog Rev 1 → Rev 2

Rev 2 được viết lại sau khi Codex rà soát Rev 1 và chỉ ra các phát hiện đã lỗi thời hoặc cần đổi bối cảnh. Cụ thể:

- Đổi toàn bộ tham chiếu `src/middleware.ts` → [src/proxy.ts](../src/proxy.ts). Repo đã migrate theo khuyến cáo của Next.js 16.
- Gỡ các claim không còn đúng: `next/image` đã dùng ở [(auth)/login/page.tsx](../src/app/(auth)/login/page.tsx) và [(landing)/components/Header.tsx](../src/app/(landing)/components/Header.tsx); `Link` prefetch là mặc định của App Router; `attendance/export` đã stream CSV; `admin/users` API đã `select`; `useTodos` đã có optimistic update; URL state đã có ở orders/returns/claims/CRM/finance/delayed.
- Hạ mức một số finding xuống defense-in-depth thay vì vulnerability rõ rệt.
- Thay chỉ tiêu số tuyệt đối ("giảm INP 300-500ms", "LCP 200ms") bằng **giả thuyết cần đo** — Rev 1 chưa có profiler/Lighthouse/bundle analyzer.
- Bổ sung 3 finding HIGH mới (attendance team/user scope, login rate limit chưa áp dụng) và 2 finding nhỏ (claims/export rate limit, settings/attendance scope).
- Chuyển đề xuất Zod schema sang **mở rộng [src/lib/validations.ts](../src/lib/validations.ts)** thay vì tạo thư mục mới.

---

## Context

Ứng dụng **HuyHoang OMS** (Next.js 16 App Router + React 19 + Prisma 6 + NextAuth v5 + PostgreSQL) đã đi qua 5+ đợt audit (xem `docs/huyhoang-oms-security-performance-audit-2026-04-02.md`, `docs/huyhoang-oms-remediation-report-2026-04-03.md`, `docs/review-optimize-plan-unified.md`). Những hạng mục lớn đã xử lý: RBAC toàn bộ API routes, OCC Todo, delayed/export streaming, indexes B-tree + trigram, session 5 phút + heartbeat, Phase 0-2 performance.

Rev 2 này tập trung vào **các lỗ hổng và nút thắt CÒN TỒN ĐỌNG đã verify trong code hiện tại**, kết hợp 3 góc nhìn: bảo mật, tốc độ tải/tương tác, trải nghiệm nhân viên. Cam kết: mọi finding dưới đây bám vào file:line thực tế; mọi đề xuất guard route dùng `src/proxy.ts` hoặc route handler; mọi đề xuất validation tái sử dụng `src/lib/validations.ts`.

### Phạm vi loại trừ (đã xong — không lặp lại)

RBAC ở API routes, profile change-request allowlist, proxy guard + `/no-access`, order detail masking theo permission, Todo OCC, warehouse confirmation race, session JWT isActive + TTL + heartbeat + force-logout, delayed pipeline refactor, CSV streaming delayed export, cache dashboard summary 30s, claim-detector N+1, `next.config.ts` optimizePackageImports + `productionBrowserSourceMaps: false`, B-tree + trigram indexes, IdleLogoutProvider passive listeners, landing initialStats SSR, returns filter URL↔API sync, **optimistic update ở todos + CRM pipeline** (đã có), **URL state orders/returns/claims/CRM/finance/delayed** (đã có), **Cache-Control ở dashboard/activities/trend/top-shops/carriers/summary** (đã có), **`next/image` ở login + landing** (đã có), **attendance/export → CSV** (đã có).

---

## Nhóm 1 — Giữ nguyên (phát hiện còn đúng)

### 1.1 [HIGH] A2 IDOR ở PUT `/api/attendance/[id]`
**File**: [src/app/api/attendance/[id]/route.ts:16-36](../src/app/api/attendance/[id]/route.ts)
**Vấn đề**: Chỉ kiểm `canEditAttendance`, update thẳng `attendance.update({ where: { id } })` — không verify bản ghi thuộc phạm vi caller (team/department/user).
**Cách fix**: Trước update, `findUnique` record để lấy `userId`; check caller là ADMIN hoặc quản lý trực tiếp user đó. Fail → `403`. Nếu dự án chưa có khái niệm "team tôi quản lý", cần quyết định đưa mô hình này vào hoặc giới hạn edit chỉ cho ADMIN + MANAGER toàn công ty.

### 1.2 [HIGH] A3 Thiếu Content-Security-Policy
**File**: [next.config.ts:21-39](../next.config.ts)
**Vấn đề**: Có HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy — nhưng không có CSP. App dùng `dangerouslySetInnerHTML` ở footer, FAQ, announcements → mất một lớp defense-in-depth chống XSS.
**Cách fix**: Bắt đầu bằng `Content-Security-Policy-Report-Only` 1-2 tuần (thu violation), rồi chuyển sang enforced. Hướng policy: `script-src 'self'` + nonce/hash, `style-src 'self' 'unsafe-inline'` (Tailwind inject), `img-src 'self' data: https:`, `connect-src 'self' https:`, `frame-ancestors 'none'`. Cần setup nonce generator trong `src/proxy.ts` hoặc root layout.

### 1.3 [MEDIUM] A5 URL đính kèm announcement không validate protocol
**File**: [src/app/api/announcements/route.ts:64-74](../src/app/api/announcements/route.ts)
**Vấn đề**: `attachmentUrl` được lưu nguyên xi. Có `canCreateAnnouncement` → gõ `javascript:...` hoặc `data:text/html,...` → render `<a href>` thành XSS/phishing.
**Cách fix**: Thêm schema vào `src/lib/validations.ts`: `z.string().url().refine(u => ['http:','https:'].includes(new URL(u).protocol))`. Whitelist domain nội bộ nếu muốn chặt hơn.

### 1.4 [MEDIUM] B3 Export orders + claims còn dựng XLSX trong memory
**Files**:
- [src/app/api/orders/export/route.ts:218](../src/app/api/orders/export/route.ts)
- [src/app/api/claims/export/route.ts:155](../src/app/api/claims/export/route.ts)

(attendance/export ĐÃ là CSV — không có trong nhóm này.)

**Cách fix**: Theo pattern `delayed/export` đã áp dụng — stream CSV theo batch 500-1000 dòng, trim cột, `Content-Disposition: attachment; filename=...`. Với claims, nếu khách hàng thật sự cần XLSX, để future-work: đưa sang background job + object storage.

### 1.5 [HIGH] C1 Loại bỏ `alert()` / `confirm()` native
**Files đã verify** (grep `^\s*(alert|confirm)\(` hoặc `window\.(alert|confirm)\(`):
- [src/hooks/useClaimMutations.ts:84, 87, 119](../src/hooks/useClaimMutations.ts)
- [src/components/finance/OverviewTab.tsx:321, 341, 346](../src/components/finance/OverviewTab.tsx)
- [src/components/crm/ShopDetailPanel.tsx:153, 187](../src/components/crm/ShopDetailPanel.tsx)
- [src/components/crm/ProspectFormDialog.tsx:72](../src/components/crm/ProspectFormDialog.tsx)
- [src/components/crm/ProspectDetailSheet.tsx:120](../src/components/crm/ProspectDetailSheet.tsx)
- [src/components/crm/CareLogDialog.tsx:63](../src/components/crm/CareLogDialog.tsx)
- [src/components/orders/OrderFilters.tsx:220](../src/components/orders/OrderFilters.tsx)
- [src/components/claims/AddClaimDialog.tsx:207-212](../src/components/claims/AddClaimDialog.tsx) (`window.confirm`)

**Cách fix**: Cài `sonner` (toast provider), thay `alert()` → `toast.error()/toast.success()`. Thay `confirm()` → tái dùng [src/components/shared/ConfirmDialog.tsx](../src/components/shared/ConfirmDialog.tsx) (đã có). Bọc `<Toaster position="top-right" richColors />` vào `src/app/layout.tsx`.

### 1.6 [MEDIUM] C3 Empty state chuẩn
**Thực tế**: Không có `src/components/shared/EmptyState.tsx` dùng chung.
**Cách fix**: Tạo component `EmptyState` props `{ icon, title, description, action? }`. Dùng cho: orders trống, claims trống, todos trống, CRM prospects/shops, finance expenses, announcements.

### 1.7 [LOW] C8 Global error boundary
**Thực tế**: [src/app/(dashboard)/error.tsx](../src/app/(dashboard)/error.tsx) ĐÃ có; còn thiếu `src/app/global-error.tsx`.
**Cách fix**: Thêm `src/app/global-error.tsx` để cover lỗi ngoài segment (dashboard/landing). Log stack về server qua `logger.error`.

---

## Nhóm 2 — Hạ mức / sửa lại mô tả

### 2.1 [MEDIUM — defense-in-depth] A1 Sanitize HTML announcement ở server
**File**: [src/app/api/announcements/route.ts:70-79](../src/app/api/announcements/route.ts)
**Trạng thái thực tế**: Client đã sanitize khi render ở [AnnouncementSection.tsx:170](../src/components/shared/AnnouncementSection.tsx) và [AnnouncementPreviewDialog.tsx:88](../src/components/shared/AnnouncementPreviewDialog.tsx) bằng `src/lib/sanitize.ts`. Không phải "stored XSS lộ liễu" như Rev 1.
**Vẫn đáng fix vì**: Consumer khác trong tương lai (mobile app, export tool, webhook) có thể render raw content và bị XSS.
**Cách fix**: Dùng `isomorphic-dompurify` ở server, sanitize trước khi ghi DB với whitelist giống client. Vẫn giữ sanitize khi render (defense-in-depth).

### 2.2 [HIGH] A4 + A8(login) Timing-safe login + login rate limit
**File**: [src/lib/auth.ts:65-80](../src/lib/auth.ts), [src/lib/rate-limiter.ts:75](../src/lib/rate-limiter.ts)
**Vấn đề**:
- `if (!user) return null` (line 73) trước `bcrypt.compare` → user enumeration qua timing (~10ms vs ~100ms).
- `loginLimiter` đã khai báo nhưng không thấy nơi `.check()` trong codebase → hiện **không có rate limit login thực sự**.

**Cách fix**:
- Khi `!user`, vẫn gọi `bcrypt.compare(credentials.password, DUMMY_HASH)` để equalize timing.
- Áp dụng `loginLimiter.check(ipAddress)` trong `authorize()` (hoặc middleware phía trước endpoint NextAuth). Chú ý: NextAuth Credentials provider chạy server action, cần lấy IP từ headers như auth.ts đã làm line 86-88.

### 2.3 [MEDIUM] A6 Admin server-side layout guard
**Trạng thái**: [src/proxy.ts:15-24](../src/proxy.ts) đã map `/admin/users → canManageUsers`. Middleware/proxy chạy trước request. Nhưng không có `src/app/(dashboard)/admin/layout.tsx` server component guard.
**Vẫn đáng fix vì**: Defense-in-depth — nếu có bug proxy bypass (đã từng ở S.2 trước đây), layout guard sẽ chặn tiếp. UI hide ≠ server hide.
**Cách fix**: Tạo `src/app/(dashboard)/admin/layout.tsx` server component, gọi `auth()` + `hasPermission(...)`; không pass thì `redirect("/no-access")`. Làm tương tự nếu bổ sung tab `admin/permission-groups`, `admin/announcements`.

### 2.4 [MEDIUM] A7 Zod validation — mở rộng `validations.ts`
**Trạng thái**: Đã có [src/lib/validations.ts](../src/lib/validations.ts) với schema chung (pagination, sort, orders, finance). Một số route đã dùng, ví dụ [finance/expenses/route.ts:53](../src/app/api/finance/expenses/route.ts).
**Còn thiếu**: `announcements POST/PATCH`, `crm/prospects POST/PATCH`, `crm/shops/[shopName] PUT`, `attendance/[id] PUT`, `profile/feedback POST`, `finance/categories POST/PUT`.
**Cách fix**: Bổ sung schema vào `validations.ts` (không tạo thư mục mới). Dùng pattern `safeParse` + trả `400` kèm `issues`. Tái dùng `paginationSchema` / `sortSchema` cho tham số query.

### 2.5 [MEDIUM] A8 Rate limit coverage thật
**Trạng thái hiện tại** (grep `loginLimiter|uploadLimiter|exportLimiter|autoImportLimiter`):
- Chỉ thấy dùng ở `orders/export`, `orders/delayed/export`, `orders/upload`, `orders/auto-import`.
- `loginLimiter` **khai báo nhưng chưa dùng** (xem 2.2).
- `landing/register` có limiter **riêng**, không phải shared.

**Endpoint còn thiếu**:
- `POST /api/announcements` — spam thông báo.
- `POST /api/crm/prospects`.
- `POST /api/todos`, `PATCH /api/todos/[id]`.
- `PUT /api/profile/password` — brute-force re-auth.
- `POST /api/admin/force-logout` — ngăn abuse nội bộ.
- `GET /api/claims/export` (xem 4.4).

**Cách fix**: Với `exportLimiter`, `uploadLimiter` có sẵn, chỉ cần `check(userId + route)` ở đầu handler. Cân nhắc thêm một limiter "write per user" (20 req/phút).

### 2.6 [MEDIUM] A9 Origin check áp dụng ở `proxy.ts` hoặc helper
**Vấn đề**: `src/middleware.ts` KHÔNG tồn tại — Rev 1 sai. Guard đang nằm ở [src/proxy.ts](../src/proxy.ts) cho page routes, nhưng không phủ API routes (matcher exclude `api`).
**Cách fix**: Viết helper `assertSameOrigin(req)` trả `403` khi `origin` không khớp `req.nextUrl.origin`. Gọi ở đầu mọi route handler state-changing (`POST|PUT|PATCH|DELETE`). Với bước phổ quát, có thể gộp vào một wrapper dạng `withRoute(handler, { permission, sameOrigin: true })`.

### 2.7 [MEDIUM] B1 Thu hẹp danh sách mega-component
**Trạng thái verify**:
- [OrderDetailDialog.tsx](../src/components/shared/OrderDetailDialog.tsx) đã dynamic import (line 24-28), fetch-on-open, `memo` (line 787) — **không cần refactor nữa**.
- [OrderFilters.tsx](../src/components/orders/OrderFilters.tsx) đã có `useMemo` + `useCallback` + `memo` — không nên ở top của backlog.
- [ClaimsClient.tsx](../src/components/claims/ClaimsClient.tsx) (1429 dòng) vẫn là file lớn nhất; đã tách một số subcomponent nhưng vẫn nặng state — **đáng ưu tiên**.
- [admin/users/page.tsx](../src/app/(dashboard)/admin/users/page.tsx) chỉ 50 dòng; phần "mega" đã chuyển sang `components/admin/UsersTab.tsx`, `PermissionsTab.tsx`, `RequestsFeedbackTab.tsx` — check từng tab, tab nào > 700 dòng thì ưu tiên.
- [finance/OverviewTab.tsx](../src/components/finance/OverviewTab.tsx) (687 dòng) vẫn có 14 useState + 24 inline style — đáng tách.

**Cách fix**: Chỉ ưu tiên `ClaimsClient` + `OverviewTab` + audit `components/admin/*`. Không đánh giá runtime từ static review; Sprint 2 bắt đầu bằng **một buổi profile** với Chrome DevTools Performance + React Profiler để xác định thực tế component nào re-render nhiều. Tách dựa trên số liệu đo, không theo danh sách cố định.

### 2.8 [MEDIUM] B2 Select over-fetch — audit có số liệu trước
**Trạng thái**: [admin/users/route.ts:19-39](../src/app/api/admin/users/route.ts) đã có `select` — **gỡ khỏi danh sách ưu tiên**.
**Cách làm đúng**: Bật log Prisma query size ở dev, truy cập các trang chính, ghi lại response size > 50KB. Ưu tiên sửa các route vượt ngưỡng. Ước đoán: `crm/shops` (list), `orders/changes`, `claims` list, `attendance/team`.

### 2.9 [LOW] B4 Cache-Control — dashboard đã có, chỉ mở rộng vài điểm
**Trạng thái**: dashboard routes đã có Cache-Control ở [activities](../src/app/api/dashboard/activities/route.ts), [trend](../src/app/api/dashboard/trend/route.ts), [top-shops](../src/app/api/dashboard/top-shops/route.ts), [carriers](../src/app/api/dashboard/carriers/route.ts), [summary](../src/app/api/dashboard/summary/route.ts).
**Còn thiếu**: `admin/users GET` (list nhân viên), `finance/categories GET`, `crm/shops/stats` nếu tồn tại.
**Chú ý**: Với response có dữ liệu per-user, dùng `Cache-Control: private, max-age=...`; **không** dùng `s-maxage` vì sẽ bị CDN cache chung (ví dụ Vercel Edge Cache) và gây leak cross-user — Rev 1 gợi ý sai ở điểm này.

### 2.10 [LOW] B7 ISR cho landing, không cho dashboard
**Trạng thái**: [(landing)/page.tsx:20](../src/app/(landing)/page.tsx) vẫn query DB trực tiếp mỗi request → đáng `export const revalidate = 60`. Dashboard đã có in-memory cache 30s + Cache-Control, không cần thêm.

### 2.11 [LOW] C2 Optimistic update — thu hẹp phạm vi
**Trạng thái**: [useTodos.ts:62-93](../src/hooks/useTodos.ts) đã optimistic. CRM pipeline cũng đã có cache update.
**Còn thiếu**: Warehouse confirm, order notes edit, toggle pin announcement, mark read announcement.
**Cách fix**: Với từng mutation, dùng `useMutation` + `onMutate` → `setQueryData`, `onError` → rollback. Kết hợp toast (1.5).

### 2.12 [LOW] C5 Loading UX — chỉ polish
**Trạng thái**: Skeleton đã có ở [ReturnsPageClient:372](../src/components/returns/ReturnsPageClient.tsx) và nhiều component dashboard. Không phải gap lớn.
**Cách fix**: Audit 2-3 trang còn dùng text "Đang tải..." rồi thay skeleton nếu ảnh hưởng perceived perf. Thêm spinner trong search debounce (hook `useDebounce` đã có).

---

## Nhóm 3 — Gỡ hoặc viết lại hẳn

| Rev 1 | Tình trạng thực tế | Hành động |
|-------|-------------------|-----------|
| B5 `next/image` migration | Đã dùng ở [(auth)/login/page.tsx](../src/app/(auth)/login/page.tsx), [(landing)/components/Header.tsx](../src/app/(landing)/components/Header.tsx) | **GỠ**. Nếu audit sau thấy `<img>` còn ở một vài nơi không quan trọng, có thể đưa vào hardening nhỏ, không phải mục lớn. |
| B6 Link prefetch | App Router `<Link>` prefetch mặc định | **GỠ** — không phải vấn đề. |
| C6 URL state filter cho mọi trang | Orders, Returns, Claims, CRM, Finance, Delayed đã có (xem `OrderFilters.tsx:112`, `ReturnsPageClient.tsx:71`, `CrmClient.tsx:28`, `DelayedClient.tsx:50`) | **GỠ**. Nếu tab nào còn thiếu, để hardening rải rác. |
| B3 attendance/export | Đã là CSV ở [attendance/export/route.ts:26](../src/app/api/attendance/export/route.ts) | **GỠ** khỏi B3. |
| Mọi tham chiếu `src/middleware.ts` | File không tồn tại | **Đổi** thành `src/proxy.ts`. |
| Số liệu perf tuyệt đối (300-500ms, 200ms LCP, 40% payload) | Rev 1 static review, chưa đo | **Đổi** thành giả thuyết cần đo; đặt chỉ tiêu sau khi chạy profiler. |

---

## Nhóm 4 — Bổ sung mới (chưa có ở Rev 1)

### 4.1 [HIGH] `GET /api/attendance/team` thiếu permission check
**File**: [src/app/api/attendance/team/route.ts:7-52](../src/app/api/attendance/team/route.ts)
**Vấn đề**: Chỉ check `session?.user`. Mọi user đăng nhập đều có thể GET attendance toàn bộ nhân viên active — leak thông tin đi/về muộn/vắng của đồng nghiệp.
**Cách fix**: `requirePermission(session.user, "canViewAllAttendance")` hoặc scope theo team quản lý của caller. Nếu staff cần xem attendance của team mình thì cần một endpoint scoped riêng.

### 4.2 [HIGH] `GET /api/attendance/user/[userId]` thiếu scope + permission
**File**: [src/app/api/attendance/user/[userId]/route.ts:7-42](../src/app/api/attendance/user/[userId]/route.ts)
**Vấn đề**: Bất kỳ user đăng nhập nào cũng GET được lịch sử chấm công + login history của user khác khi biết `userId`. Có cả IP/user-agent trong `loginHistory`.
**Cách fix**: Cho phép khi `userId === session.user.id` (xem của mình), hoặc caller có `canViewAllAttendance`, hoặc caller là manager của target. Fail → `403`. Không trả `loginHistory` khi caller không phải ADMIN.

### 4.3 [HIGH] Login rate limit chưa áp dụng thực sự
**File**: [src/lib/rate-limiter.ts:75](../src/lib/rate-limiter.ts) khai báo `loginLimiter`; [src/lib/auth.ts](../src/lib/auth.ts) **không import** limiter này.
**Vấn đề**: Đăng nhập sai password không có cản → brute-force online.
**Cách fix**: Trong `authorize()` của Credentials provider, lấy IP từ `headers()`, gọi `loginLimiter.check(ip)`; nếu nonNull → throw lỗi để NextAuth trả 429 (hoặc return null + log). Thay thế: tạo một route `/api/auth/pre-check` gọi limiter rồi mới cho POST vào `/api/auth/callback/credentials`.

Ghi chú: bản ghi `loginHistory` hiện tại không ghi lần đăng nhập thất bại — nên cân nhắc thêm bảng `LoginAttempt` để dấu vết brute-force được lưu.

### 4.4 [MEDIUM] `GET /api/claims/export` chưa có rate limit + còn nặng memory
**File**: [src/app/api/claims/export/route.ts](../src/app/api/claims/export/route.ts)
**Vấn đề**: Xuất file nặng nhưng không dùng `exportLimiter` đã có sẵn.
**Cách fix**: Gắn `exportLimiter.check(userId)` ở đầu handler. Kết hợp với 1.4 để chuyển sang CSV streaming, giảm memory.

### 4.5 [LOW] `GET /api/settings/attendance` mở cho mọi user
**File**: [src/app/api/settings/attendance/route.ts:7-23](../src/app/api/settings/attendance/route.ts)
**Ghi chú**: Đang trả `late_time`, `auto_logout`, `idle_timeout`, `full_day_hours`, `half_day_hours`, `timezone` cho mọi user đăng nhập. PUT đã chặn không phải ADMIN/MANAGER. Cần xác nhận đây là ý đồ (staff biết giờ vào muộn chuẩn) — nếu không, thêm permission check.

---

## D. Sprint Plan cập nhật

### Sprint 1 (3-4 ngày) — Bảo mật hàng "phải fix"
- 4.1 + 4.2 attendance team/user scope (HIGH).
- 4.3 login rate limit thực sự (HIGH).
- 1.1 A2 IDOR attendance PUT (HIGH).
- 1.2 A3 CSP Report-Only (HIGH).
- 2.2 A4 timing-safe login (HIGH — gộp 4.3).
- 2.3 A6 admin layout guard (MEDIUM).
- 2.4 A7 Zod mở rộng `validations.ts` cho 5-6 route (MEDIUM).
- 1.5 C1 sonner + bỏ alert/confirm (HIGH UX).

### Sprint 2 (3-5 ngày) — Hiệu năng đo trước, tối ưu sau
- **Mở đầu**: Profile 2-3 trang hot (orders list, claims list, finance overview) bằng Chrome DevTools Performance + React Profiler + bundle analyzer. Lưu baseline vào `docs/performance-baseline-2026-04-xx.md`.
- 2.7 B1 refactor ClaimsClient + OverviewTab + audit admin tabs theo kết quả profile.
- 2.8 B2 audit `select` over-fetch từ Prisma query log.
- 1.4 B3 orders/export + claims/export CSV stream.
- 2.11 C2 optimistic warehouse/notes/announcement.

### Sprint 3 (2-3 ngày) — UX + hardening
- 1.3 A5 validate URL announcement (MEDIUM).
- 2.5 A8 rate limit các endpoint còn thiếu.
- 4.4 claims/export rate limit.
- 2.6 A9 origin check helper.
- 2.9 B4 Cache-Control cho `admin/users GET`, `finance/categories GET` (dùng `private`).
- 2.10 B7 ISR landing.
- 1.6 C3 EmptyState dùng chung.
- 2.12 C5 loading polish.
- 1.7 C8 `global-error.tsx`.

### Sprint 4 (1 ngày) — Hardening cuối
- 4.5 xác nhận settings/attendance.
- Bcrypt rounds tracking.
- Error logging audit.
- Touch target + keyboard nav pass.

---

## E. Files dự kiến chỉnh sửa

### Security
- `src/app/api/attendance/team/route.ts` — permission check.
- `src/app/api/attendance/user/[userId]/route.ts` — scope check.
- `src/app/api/attendance/[id]/route.ts` — ownership.
- `src/app/api/announcements/route.ts` — sanitize HTML + validate URL + Zod.
- `src/lib/auth.ts` — dummy bcrypt + loginLimiter integration.
- `src/lib/rate-limiter.ts` — thêm write limiter (nếu cần).
- `src/lib/validations.ts` — mở rộng schema cho announcements, crm, attendance PUT, profile feedback, finance categories.
- `next.config.ts` — CSP header (Report-Only → enforced).
- `src/app/(dashboard)/admin/layout.tsx` (NEW) — server guard.
- `src/lib/sanitize.ts` — export server-side variant (isomorphic-dompurify).
- `src/proxy.ts` hoặc `src/lib/api-guard.ts` — origin check helper.

### Performance
- `src/app/api/orders/export/route.ts` + `src/app/api/claims/export/route.ts` — CSV stream.
- `src/components/claims/ClaimsClient.tsx` — tách theo kết quả profile.
- `src/components/finance/OverviewTab.tsx` — tách section + memo chart.
- `src/components/admin/*Tab.tsx` (nếu tab nào > 700 dòng).
- `src/app/api/admin/users/route.ts`, `src/app/api/finance/categories/route.ts` — Cache-Control `private`.
- `src/app/(landing)/page.tsx` — `export const revalidate = 60`.

### UX
- `package.json` — cài `sonner`, `isomorphic-dompurify`.
- `src/app/layout.tsx` — `<Toaster>`.
- Các file dùng `alert/confirm` (xem 1.5) — thay toast + ConfirmDialog.
- `src/hooks/useOrderNotes.ts`, `src/hooks/useWarehouseConfirm.ts` (hoặc tương đương), announcement mutations — optimistic.
- `src/components/shared/EmptyState.tsx` (NEW).
- `src/app/global-error.tsx` (NEW).

---

## F. Verification

### Bảo mật
- **4.1**: Login bằng staff thường → `GET /api/attendance/team` → `403`.
- **4.2**: Login bằng staff A → `GET /api/attendance/user/B` → `403`; tự xem → 200.
- **4.3**: Sai password 6 lần trong 1 phút → lần 6+ trả `429`.
- **1.1**: User có `canEditAttendance` nhưng không quản lý user X → `PUT /api/attendance/[id]` của X → `403`.
- **1.2**: DevTools → Response có `Content-Security-Policy` (hoặc `-Report-Only` giai đoạn đầu). Sau 1 tuần enforced → không có violation nghiêm trọng trong log.
- **2.2 A4**: `curl -w "%{time_total}"` login email không tồn tại vs email đúng password sai → chênh lệch < 20ms trung bình 20 lần.
- **2.3 A6**: Staff không có `canManageUsers` gõ trực tiếp `/admin/users` → redirect `/no-access` server-side.
- **2.4 A7**: POST `/api/announcements` với body thiếu field → `400` kèm `issues`.

### Hiệu năng
- **Sprint 2 mở đầu**: Có file `docs/performance-baseline-2026-04-xx.md` với LCP/INP/TBT trên các trang hot (mobile throttle 4x CPU, 3G slow).
- **2.7 B1**: Sau refactor, react profiler cho thấy số component re-render/giây giảm so với baseline. Không tự công bố số cụ thể khi chưa đo.
- **1.4 B3**: Export 10k orders → không timeout Vercel Hobby, không OOM > 512MB.
- **Lint/Test/Build**: `npm run lint && npm run test:run && npm run build` pass, không giảm số test so với baseline (360+ tests).

### UX
- **1.5 C1**: Grep `alert\(` và `window\.confirm\(` trong `src/` (trừ test) → 0 kết quả.
- **2.11 C2**: Tắt network → click "confirm warehouse" → UI cập nhật ngay; khi có network fail → rollback + toast lỗi.
- **1.6 C3**: Trang orders filter trả 0 kết quả → render EmptyState có icon + CTA.
- **1.7 C8**: Throw lỗi giả trong root layout → `global-error.tsx` hiển thị, không white screen.

---

## G. Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|--------|-----------|
| CSP enforced chặn inline script/style hợp lệ | Report-Only 1-2 tuần, thu violation log trước khi enforced. Thêm nonce cho script Next.js inject. |
| Đổi scope `attendance/team` làm vỡ staff tab | Xác nhận sản phẩm có ý định cho staff xem "team mình" hay không; nếu có, viết endpoint scoped thay vì mở toàn bộ. |
| `loginLimiter` trong NextAuth authorize có thể gây race với auto-check-in | Check limiter trước `prisma.user.findUnique`; không block non-blocking attendance/loginHistory inserts. |
| `sonner` conflict z-index với Radix dialog | Đặt `<Toaster>` cao hơn dialog overlay; test toast hiển thị khi dialog mở. |
| `isomorphic-dompurify` không chạy edge runtime | Đảm bảo route có `export const runtime = "nodejs"` (mặc định đã nodejs cho API route). |
| Refactor ClaimsClient gây regression UI | Tách theo profile, commit nhỏ, mỗi bước kiểm thử thủ công các flow chính (create claim, update status, bulk actions). |

---

## H. Chỉ tiêu (post-sprint, cần đo)

- 0 CVSS ≥ 7.0 còn tồn tại.
- `GET /api/attendance/team` và `/user/[userId]` trả 403 cho staff không được phép.
- `loginLimiter` trả 429 sau 5 lần sai/phút (test bằng script).
- CSP enforced với 0 violation trong 7 ngày.
- Sau Sprint 2: có baseline + target cho LCP/INP trang hot; delta cải thiện **đo được** (không tự công bố số trước khi đo).
- 0 `alert/confirm` native trong production code.

---

## Ghi chú triển khai

- Branch: `chore/sec-perf-ux-2026-04`.
- PR chia theo Sprint: Sprint 1 = 1 PR bảo mật, Sprint 2 = 1 PR hiệu năng (gồm baseline report), Sprint 3 = 1 PR hardening + UX, Sprint 4 = 1 PR cleanup.
- Mỗi PR phải: pass `lint + test:run + build`; screenshot before/after cho UX; nếu là bảo mật thì kèm test case cụ thể (curl / Postman) trong body PR.
- Với CSP: deploy Report-Only trước 1-2 tuần, xem log `/csp-report`, rồi mới enforced.
