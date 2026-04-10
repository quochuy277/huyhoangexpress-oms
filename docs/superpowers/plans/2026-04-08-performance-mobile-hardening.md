# HuyHoang OMS Performance & Mobile Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Giảm rõ rệt độ trễ khi F5 và khi chuyển trang trong dashboard bằng cách cắt giảm chi phí auth, bỏ request thừa ở shell, chuyển các route nóng sang server-first/prefetch, tối ưu các API first-load nặng, đồng thời giữ toàn bộ giao diện tiếng Việt UTF-8 có dấu đầy đủ và thân thiện với mobile.

**Architecture:** Kế hoạch đi theo hướng tối ưu tăng dần theo hot path thay vì rewrite lớn. Mỗi phase xử lý một lớp vấn đề rõ ràng: baseline và guardrails, auth/middleware, dashboard shell, route-level bootstrap/prefetch, API nặng, rồi cuối cùng là hardening UTF-8 và responsive mobile. Mọi thay đổi phải ưu tiên pattern đã chứng minh hiệu quả ở `orders`: server prefetch + hydrate dữ liệu đầu tiên cho client.

**Tech Stack:** Next.js 16 App Router, React 19, NextAuth v5, Prisma 6, PostgreSQL, TanStack React Query v5, TailwindCSS v4, Vitest 4.

---

## Mục tiêu đo lường

- Giảm thời gian chờ cảm nhận được khi `F5` ở các route nóng: `overview`, `claims`, `attendance`, `todos`, `returns`, `delayed`, `finance`, `crm`.
- Giảm số request tự động ngay khi mount dashboard shell.
- Giảm số lần gọi `auth()` trên đường vào trang và trên các API first-load.
- Chuyển tối thiểu các tab mặc định của route nóng sang hướng server-first hoặc prefetch/hydrate.
- Không phát sinh Mojibake, không mất dấu tiếng Việt trong UI, API message, CSV export, chart label, dialog.
- Không phát sinh hồi quy mobile: không tràn ngang bất thường, không vỡ tab bar, không che action, không dialog quá khổ.

## Nguyên tắc bắt buộc

- Mọi chuỗi người dùng nhìn thấy phải là tiếng Việt có dấu đầy đủ, lưu và chỉnh sửa theo UTF-8.
- Không ASCII-normalize bất kỳ text UI nào: nút bấm, label, tooltip, toast, empty state, tiêu đề bảng, tiêu đề biểu đồ, nội dung dialog, header export.
- Mọi file chạm tới có text tiếng Việt phải được rà lại sau khi sửa để phát hiện Mojibake hoặc mất dấu.
- Mọi task UI phải có kiểm tra mobile tối thiểu tại `360px`, `375px`, `390px`, `768px`.
- Ưu tiên giảm chặn first paint hơn là tối ưu vi mô ở vùng người dùng chưa thấy.
- Không dồn toàn bộ dữ liệu ứng dụng vào một bootstrap endpoint duy nhất; bootstrap theo page để giữ ranh giới rõ ràng.

## Phân pha triển khai

### P0: Baseline và guardrails

- Task 1
- Task 2

### P1: Auth hot path và dashboard shell

- Task 3
- Task 4
- Task 5

### P2: Route-level server-first và bootstrap

- Task 6
- Task 7
- Task 8
- Task 9
- Task 10

### P3: API nặng, UTF-8 hardening, mobile QA, chốt rollout

- Task 11
- Task 12
- Task 13
- Task 14

---

### Task 1: Baseline hiệu năng, backup và mốc đối chiếu

**Files:**
- Create: `backups/20260408-performance-mobile/README.txt`
- Create: `backups/20260408-performance-mobile/git-status.txt`
- Create: `backups/20260408-performance-mobile/working-tree.patch`
- Create: `backups/20260408-performance-mobile/utf8-baseline-suspect-counts.txt`
- Create: `docs/performance-baseline-2026-04-08.md`

- [ ] Tạo thư mục backup cho phase hiện tại và lưu snapshot `git status --short` cùng `git diff --binary`.
- [ ] Ghi baseline cho từng route nóng theo 2 tình huống: `F5` và `click chuyển trang trong dashboard`.
- [ ] Với mỗi route nóng, ghi rõ: số request page/RSC, số API dữ liệu chính, số API shell, số request nền lặp lại.
- [ ] Ghi chú route nào đang client-first, route nào đã có server prefetch.
- [ ] Chụp baseline mobile cho các route nóng tại `375px` trước khi bắt đầu tối ưu.

**Verification:**
- DevTools Network có bảng tổng hợp trước khi chỉnh sửa.
- Tài liệu baseline đủ để so sánh trước/sau theo từng route.

### Task 2: Thêm guardrails cho UTF-8 tiếng Việt và checklist mobile

**Files:**
- Modify: `docs/performance-baseline-2026-04-08.md`
- Create: `docs/utf8-mobile-qa-checklist-2026-04-08.md`
- Review: `src/app/globals.css`

- [ ] Tạo checklist QA riêng cho tiếng Việt UTF-8: text UI, toast, dialog, table header, chart label, export CSV.
- [ ] Tạo checklist QA mobile riêng cho: tab bar, filter bar, pagination, sticky header, dialog, drawer, dropdown, table overflow.
- [ ] Gắn checklist này làm điều kiện bắt buộc cho mọi task từ Task 3 trở đi.
- [ ] Chốt danh sách route bắt buộc QA lại trên mobile sau mỗi phase lớn.

**Verification:**
- Có file checklist riêng và được tham chiếu lại trong các phase xác minh cuối.

### Task 3: Giảm chi phí auth hot path và loại trùng lặp auth

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/lib/auth.config.ts`
- Modify: `src/middleware.ts`
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/app/(dashboard)/overview/page.tsx`
- Modify: `src/app/(dashboard)/orders/page.tsx`
- Modify: `src/app/(dashboard)/finance/page.tsx`
- Modify: `src/app/(dashboard)/todos/page.tsx`
- Modify: `src/app/(dashboard)/claims/page.tsx`
- Modify: `src/app/(dashboard)/attendance/page.tsx`
- Modify: `src/app/(dashboard)/crm/page.tsx`
- Modify: `src/app/(dashboard)/delayed/page.tsx`
- Create: `src/__tests__/lib/auth-hot-path.test.ts`
- Create: `src/__tests__/app/dashboard-auth-flow.test.tsx`

- [ ] Thêm regression test cho logic auth hot path: layout dashboard không kéo thêm nhánh nặng không cần thiết ở page con.
- [ ] Thêm regression test cho middleware matcher để tránh bắt rộng không cần thiết các request shell/polling.
- [ ] Di chuyển hoặc làm nhẹ cơ chế refresh permissions trong JWT callback để không chặn điều hướng thông thường.
- [ ] Chỉ giữ `auth()` ở page con nếu page đó thực sự cần dữ liệu user riêng mà layout không cung cấp được.
- [ ] Tối ưu lại `middleware` theo hướng gate thô, tránh để mọi request đầu trang đều đi qua thêm một vòng xác thực nặng.
- [ ] Khẳng định lại không hồi quy redirect login và redirect thiếu quyền.

**Verification:**
- `npm run test:run`
- `npm run build`
- So sánh Network của một route nóng trước/sau để xác nhận giảm auth-induced latency.

### Task 4: Scope provider đúng chỗ và giảm JS mặc định ngoài dashboard

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/components/Providers.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`
- Create: `src/app/(dashboard)/providers.tsx`

- [ ] Đưa React Query provider xuống dashboard route group thay vì bọc toàn bộ app.
- [ ] Đảm bảo landing và login không bị hydrate runtime dành cho dashboard.
- [ ] Giữ nguyên behavior cache hiện có trong dashboard sau khi di chuyển provider.
- [ ] Kiểm tra lại không phát sinh mismatch hydration ở root layout.

**Verification:**
- `npm run build`
- Kiểm tra `/`, `/login`, `/orders` trong dev và production build.

### Task 5: Làm nhẹ dashboard shell và trì hoãn request nền không thiết yếu

**Files:**
- Modify: `src/components/layout/DashboardShell.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/providers/HeartbeatProvider.tsx`
- Modify: `src/components/attendance/IdleLogoutProvider.tsx`
- Modify: `src/components/shared/UserProfileDialog.tsx`
- Modify: `src/app/api/todos/overdue-count/route.ts`
- Modify: `src/app/api/announcements/unread-count/route.ts`
- Modify: `src/app/api/todos/reminders/route.ts`
- Modify: `src/app/api/settings/attendance/route.ts`
- Modify: `src/app/api/attendance/heartbeat/route.ts`
- Create: `src/app/api/dashboard/shell-bootstrap/route.ts`
- Create: `src/__tests__/components/dashboard-shell-fetching.test.tsx`

- [ ] Thêm test chứng minh header không fetch danh sách thông báo/reminders trước khi người dùng mở dropdown.
- [ ] Gom hoặc lazy-load dữ liệu badge của header để giảm số request ngay lúc mount.
- [ ] Hoãn heartbeat ban đầu tới sau first paint hoặc sau khi route ổn định.
- [ ] Giảm polling settings attendance vô điều kiện; ưu tiên cache và fetch nhẹ.
- [ ] Dynamic import `UserProfileDialog` để tránh kéo dialog lớn vào shell mặc định.
- [ ] Kiểm tra bell dropdown và user menu vẫn dùng tốt trên mobile sau khi lazy-load.

**Verification:**
- Kiểm tra Network của `overview` và `orders` khi mới vào dashboard.
- Kiểm tra bell dropdown, profile dialog, idle warning, heartbeat hoạt động đúng sau khi vào trang một lúc.

### Task 6: Tối ưu `overview` bằng server prefetch và bootstrap dữ liệu đầu tiên

**Files:**
- Modify: `src/app/(dashboard)/overview/page.tsx`
- Modify: `src/components/dashboard/AlertCardsRow.tsx`
- Modify: `src/components/dashboard/FinanceCardsRow.tsx`
- Modify: `src/components/dashboard/ActivityAndRatesRow.tsx`
- Modify: `src/components/dashboard/TrendAndStatusRow.tsx`
- Modify: `src/components/dashboard/CarrierAndShopsRow.tsx`
- Modify: `src/app/api/dashboard/summary/route.ts`
- Modify: `src/app/api/dashboard/trend/route.ts`
- Modify: `src/app/api/dashboard/activities/route.ts`
- Modify: `src/app/api/dashboard/carriers/route.ts`
- Modify: `src/app/api/dashboard/top-shops/route.ts`
- Create: `src/app/api/dashboard/bootstrap/route.ts`
- Create: `src/__tests__/app/dashboard-overview-bootstrap.test.tsx`

- [ ] Chuyển dữ liệu first screen của `overview` sang hướng server-prefetch hoặc bootstrap endpoint rõ ràng.
- [ ] Hydrate React Query bằng `initialData` cho row/card đầu tiên thay vì chờ mount rồi fetch toàn bộ.
- [ ] Giữ chart nặng dưới dạng delayed/lazy ở những vùng không ảnh hưởng first paint.
- [ ] Rà lại các component dashboard để tránh request trùng key nhưng khác thời điểm gây waterfall cảm nhận.
- [ ] Kiểm tra layout dashboard overview trên mobile: card summary, chart row, activity panel, button điều hướng.

**Verification:**
- So sánh waterfall trước/sau ở `overview`.
- `npm run build`

### Task 7: Chuyển `claims` sang default-tab server-first và gom payload first-load

**Files:**
- Modify: `src/app/(dashboard)/claims/page.tsx`
- Modify: `src/components/claims/ClaimsPageWrapper.tsx`
- Modify: `src/components/claims/ClaimsClient.tsx`
- Modify: `src/hooks/useClaimsList.ts`
- Modify: `src/app/api/claims/route.ts`
- Modify: `src/app/api/claims/filter-options/route.ts`
- Create: `src/app/api/claims/bootstrap/route.ts`
- Create: `src/__tests__/hooks/useClaimsList.test.ts`
- Create: `src/__tests__/app/claims-page-bootstrap.test.tsx`

- [ ] Thêm test chứng minh tab mặc định `claims` có thể nhận dữ liệu initial payload mà không cần chờ 2 request client đầu tiên.
- [ ] Gộp list đầu tiên và filter options theo một contract bootstrap rõ ràng.
- [ ] Bỏ hoặc giảm `ssr: false` ở đường vào tab mặc định nếu không có phụ thuộc browser bắt buộc.
- [ ] Giữ tools và compensation là lazy sections, không ảnh hưởng first load của tab mặc định.
- [ ] Kiểm tra tab bar claims trên mobile: không vỡ, không mất khả năng cuộn, không đẩy nội dung ra ngoài viewport.

**Verification:**
- `npm run test:run`
- Kiểm tra `claims` trên `375px`, `768px` và desktop.

### Task 8: Chuyển `attendance` sang server-first cho tab "Chấm công của tôi"

**Files:**
- Modify: `src/app/(dashboard)/attendance/page.tsx`
- Modify: `src/components/attendance/AttendancePageClient.tsx`
- Modify: `src/components/attendance/AttendancePageWrapper.tsx`
- Modify: `src/components/attendance/MyAttendanceTab.tsx`
- Modify: `src/app/api/attendance/me/route.ts`
- Modify: `src/app/api/login-history/me/route.ts`
- Modify: `src/app/api/leave-requests/route.ts`
- Create: `src/app/api/attendance/bootstrap/route.ts`
- Create: `src/__tests__/app/attendance-page-bootstrap.test.tsx`

- [ ] Gộp attendance summary, login history và leave requests cho tab mặc định thành payload bootstrap hợp lý.
- [ ] Bỏ client waterfall ba request ở lần vào đầu tiên.
- [ ] Chỉ lazy-load management tab nếu người dùng có quyền và thực sự mở tab đó.
- [ ] Rà lại calendar, summary card, leave form, history table trên mobile.
- [ ] Bảo toàn text tiếng Việt có dấu ở status, warning, leave labels.

**Verification:**
- Kiểm tra `attendance` khi F5 và khi chuyển từ route khác trong dashboard.
- `npm run build`

### Task 9: Tối ưu `todos` bằng bootstrap và giảm API fragmentation

**Files:**
- Modify: `src/app/(dashboard)/todos/page.tsx`
- Modify: `src/components/todos/TodosClient.tsx`
- Modify: `src/hooks/useTodos.ts`
- Modify: `src/hooks/useTodoStats.ts`
- Modify: `src/hooks/useTodoUsers.ts`
- Modify: `src/components/todos/TodoReminderBanner.tsx`
- Modify: `src/app/api/todos/route.ts`
- Modify: `src/app/api/todos/stats/route.ts`
- Modify: `src/app/api/todos/users/route.ts`
- Modify: `src/app/api/todos/reminders/route.ts`
- Modify: `src/app/api/todos/overdue-count/route.ts`
- Create: `src/app/api/todos/bootstrap/route.ts`
- Create: `src/__tests__/app/todos-page-bootstrap.test.tsx`
- Create: `src/__tests__/lib/todos-bootstrap-contract.test.ts`

- [ ] Tạo bootstrap payload cho `todos`: first page list, stats, reminders, users nếu có quyền.
- [ ] Prefetch first load từ server và hydrate ở client.
- [ ] Giảm trùng lặp giữa `reminders`, `overdue-count`, `stats` nếu có thể dùng chung dữ liệu.
- [ ] Chỉ mount hoặc fetch những phần không thiết yếu khi thực sự cần, ví dụ banner/detail-heavy flow.
- [ ] Kiểm tra `todos` trên mobile: filter bar, view switch, summary cards, kanban/list, detail panel.

**Verification:**
- So sánh request count trước/sau.
- Kiểm tra tạo/sửa/xóa/toggle trạng thái todo không bị hồi quy.

### Task 10: Chuyển `returns` sang server-first và đẩy filter/sort/pagination về API

**Files:**
- Modify: `src/app/(dashboard)/returns/page.tsx`
- Modify: `src/lib/returns-tab-data.ts`
- Modify: `src/components/returns/PartialReturnTab.tsx`
- Modify: `src/components/returns/FullReturnTab.tsx`
- Modify: `src/components/returns/WaitingReturnTab.tsx`
- Modify: `src/app/api/orders/returns/route.ts`
- Modify: `src/app/api/orders/returns/summary/route.ts`
- Create: `src/__tests__/lib/returns-tab-data.test.ts`
- Create: `src/__tests__/app/returns-page-prefetch.test.tsx`

- [ ] Thêm test chứng minh chỉ tab active được tải ở first-load và cache tab cũ được reuse hợp lý.
- [ ] Chuyển page `returns` khỏi mô hình client-first toàn trang sang server-first cho tab mặc định.
- [ ] Đẩy sort/filter/pagination xuống API thay vì tải cả danh sách tab rồi xử lý ở client.
- [ ] Cân nhắc trả counts cùng payload phù hợp để giảm summary request riêng khi vào route.
- [ ] Kiểm tra bảng returns trên mobile: tab cards đầu trang, filter panel, pagination, action buttons, ghi chú inline.
- [ ] Kiểm tra export CSV giữ tiếng Việt có dấu đầy đủ ở header.

**Verification:**
- `npm run test:run`
- Kiểm tra `returns` ở desktop và mobile.

### Task 11: Tối ưu `delayed` và đường API nặng nhất hệ thống

**Files:**
- Modify: `src/app/(dashboard)/delayed/page.tsx`
- Modify: `src/components/delayed/DelayedClient.tsx`
- Modify: `src/components/delayed/DelayDistributionChart.tsx`
- Modify: `src/components/delayed/DelayReasonChart.tsx`
- Modify: `src/app/api/orders/delayed/route.ts`
- Modify: `src/lib/delayed-query.ts`
- Modify: `src/lib/delayed-data.ts`
- Modify: `src/lib/delay-analyzer.ts`
- Create: `src/app/api/orders/delayed/bootstrap/route.ts`
- Create: `src/__tests__/app/api/orders-delayed-route.test.ts`
- Create: `src/__tests__/app/delayed-page-bootstrap.test.tsx`

- [ ] Thêm test chứng minh delayed route không còn scan in-memory quá lớn cho first-load mặc định.
- [ ] Giảm hoặc loại bỏ mô hình scan `2000` order rồi mới filter/facet/sort/paginate ở app memory trên mọi lần vào route.
- [ ] Ưu tiên summary + rows chính ở first load; chart nặng chỉ tải sau hoặc khi xuất hiện trong viewport.
- [ ] Nếu chưa thể đẩy hoàn toàn xuống DB, ít nhất phải thu hẹp tập dữ liệu xử lý và thêm cache ngắn hạn theo bộ lọc.
- [ ] Kiểm tra delayed table và filter panel trên mobile để tránh tràn ngang khó kiểm soát.

**Verification:**
- So sánh CPU time và response time của `/api/orders/delayed` trước/sau.
- `npm run build`

### Task 12: Tối ưu `finance` và `crm` theo active-tab prefetch, unmount ẩn, giảm payload nặng

**Files:**
- Modify: `src/app/(dashboard)/finance/page.tsx`
- Modify: `src/components/finance/FinancePageClient.tsx`
- Modify: `src/components/finance/OverviewTab.tsx`
- Modify: `src/components/finance/AnalysisTab.tsx`
- Modify: `src/components/finance/CashbookTab.tsx`
- Modify: `src/lib/finance/landing.ts`
- Modify: `src/app/api/finance/cashbook/summary/route.ts`
- Modify: `src/app/api/finance/cashbook/route.ts`
- Modify: `src/app/api/finance/cashbook/uploads/route.ts`
- Modify: `src/app/api/finance/shops/route.ts`
- Modify: `src/app/api/finance/shop-trends/route.ts`
- Modify: `src/app/api/finance/negative-revenue/route.ts`
- Modify: `src/app/(dashboard)/crm/page.tsx`
- Modify: `src/components/crm/CrmClient.tsx`
- Modify: `src/components/crm/ShopManagementTab.tsx`
- Modify: `src/components/crm/ProspectPipelineTab.tsx`
- Create: `src/__tests__/app/finance-tab-prefetch.test.tsx`
- Create: `src/__tests__/app/crm-page-prefetch.test.tsx`

- [ ] Mở rộng server prefetch của `finance` sang `analysis` và `cashbook` khi user vào trực tiếp tab đó.
- [ ] Giảm fragmentation của `cashbook` first load bằng bootstrap hoặc gom endpoint.
- [ ] Chuyển mounted hidden tabs ở finance sang hướng unmount UI nhưng giữ query cache.
- [ ] Đánh giá lại `ProspectPipelineTab` để giảm client-only entry khi vào trực tiếp `crm?tab=prospects`.
- [ ] Kiểm tra mobile cho finance/crm: tab ngang, filter controls, chart overflow, table scroll, dialogs.

**Verification:**
- Kiểm tra `finance?tab=analysis`, `finance?tab=cashbook`, `crm?tab=prospects`.
- `npm run build`

### Task 13: Phase riêng cho UTF-8, chống Mojibake và hardening mobile trên toàn bộ khu vực đã chạm

**Files:**
- Modify: tất cả file UI và API message đã chạm ở Task 3-12
- Modify: `docs/utf8-mobile-qa-checklist-2026-04-08.md`
- Create: `docs/utf8-mobile-hardening-report-2026-04-08.md`

- [ ] Rà toàn bộ text tiếng Việt trong các file đã sửa: shell, dashboard, claims, attendance, todos, returns, delayed, finance, crm.
- [ ] Khôi phục ngay mọi chuỗi mất dấu hoặc có dấu hiệu Mojibake.
- [ ] Rà lại text trong response message của API nếu chúng có thể hiện ra UI.
- [ ] Rà export CSV và nhãn biểu đồ để giữ đúng tiếng Việt UTF-8.
- [ ] Chạy checklist mobile cho tất cả route nóng ở `360px`, `375px`, `390px`, `768px`.
- [ ] Ghi rõ mọi điểm phải chấp nhận cuộn ngang có kiểm soát và mọi điểm phải tuyệt đối không tràn viewport.

**Verification:**
- Review thủ công toàn bộ route nóng.
- Đối chiếu checklist UTF-8 và mobile đã tạo từ Task 2.

### Task 14: Verification cuối, so sánh baseline và chốt rollout

**Files:**
- Modify: `docs/performance-baseline-2026-04-08.md`
- Modify: `docs/utf8-mobile-hardening-report-2026-04-08.md`
- Modify: `docs/superpowers/plans/2026-04-08-performance-mobile-hardening.md`
- Optional Create: `docs/huyhoang-oms-performance-mobile-report-2026-04-08.md`

- [ ] Chạy các test focused đã thêm ở từng phase.
- [ ] Chạy full `npm run test:run`.
- [ ] Chạy `npm run build`.
- [ ] So sánh baseline trước/sau theo từng route nóng cho cả `F5` và `click chuyển trang`.
- [ ] Tóm tắt route nào cải thiện mạnh, route nào còn bottleneck.
- [ ] Chốt danh sách follow-up nếu cần phase tiếp theo cho DB index, aggregation table, hoặc bundle split sâu hơn.

**Verification:**
- `npm run test:run`
- `npm run build`
- Có tài liệu tổng kết đối chiếu trước/sau.

---

## Gợi ý chia commit

1. `perf: baseline dashboard performance and utf8 guardrails`
2. `perf: simplify dashboard auth hot path`
3. `perf: defer nonessential dashboard shell fetches`
4. `perf: scope dashboard query provider`
5. `perf: prefetch overview bootstrap payload`
6. `perf: prefetch claims and attendance default tabs`
7. `perf: bootstrap todos and server-shape returns`
8. `perf: optimize delayed route bootstrap and processing`
9. `perf: prefetch finance tabs and crm prospects`
10. `fix: preserve vietnamese utf8 copy and mobile layouts`
11. `docs: record performance and mobile hardening results`

## Rủi ro cần theo dõi

- Hồi quy phân quyền khi giảm trùng lặp auth.
- Hồi quy stale data khi bootstrap payload và query cache không đồng bộ.
- Hồi quy browser-only behavior nếu bỏ `ssr: false` ở khu vực có phụ thuộc DOM.
- Hồi quy mobile khi đổi cấu trúc render, đặc biệt ở bảng, biểu đồ, tab ngang và dialog.
- Hồi quy tiếng Việt nếu file bị lưu sai encoding hoặc chuỗi bị thay bằng bản không dấu.

## Điều kiện hoàn thành

- Các route nóng có cải thiện rõ về thời gian cảm nhận khi `F5` và khi chuyển trang.
- Dashboard shell không còn bắn nhiều request không thiết yếu trước khi nội dung chính xuất hiện.
- Các route mặc định quan trọng đã theo hướng server-first hoặc prefetch/hydrate.
- Không có Mojibake, không mất dấu tiếng Việt ở khu vực đã chạm.
- Không có layout mobile vỡ hoặc hành vi khó dùng sau tối ưu.
