# Kế Hoạch Chi Tiết Tối Ưu Hiệu Năng OMS (V2)

> Tài liệu này là bản kế hoạch mới, **không ghi đè** `docs/review-optimize-plan-2026-04-12.md`.
> Trọng tâm: tăng tốc độ tải trang và tăng độ mượt khi người dùng tương tác UI.

## 1) Bối cảnh và mục tiêu

- Phase 1 (security/permission) đã hoàn tất, giữ nguyên kết quả và không mở rộng thêm trong vòng tối ưu hiệu năng.
- Hệ thống hiện có các điểm nghẽn lớn ở cả server query và client render:
  - Server: delayed/CRM/returns có xử lý nặng hoặc chưa đồng bộ filter qua API.
  - Client: nhiều mega-component gây mount chậm, rerender nhiều, tab switch nặng.
- Mục tiêu của V2 là ưu tiên các hạng mục tạo tác động rõ rệt cho người dùng cuối trước, rồi mới cleanup.

## 2) Mục tiêu định lượng (KPI)

## KPI bắt buộc đạt sau khi hoàn thành V2

- `GET /api/orders/delayed` giảm p95 ít nhất 35% so với baseline hiện tại.
- `GET /api/crm/shops` + `GET /api/crm/dashboard` tổng thời gian server giảm ít nhất 30%.
- Tab chuyển đổi trên `finance`, `claims`, `orders` sau lần tải đầu: phản hồi cảm nhận < 200ms.
- Các thao tác lọc/search trên returns không còn lệch dữ liệu giữa URL/UI/API.
- Không còn `catch {}` hoặc `.catch(() => {})` ở các điểm đã liệt kê trong plan này.

## KPI chất lượng phát hành

- `npm run lint` pass.
- `npm run test:run` pass.
- `npm run build` pass.

---

## 3) Phạm vi kỹ thuật ưu tiên cao

## Nhóm Server/API

- `src/lib/delayed-page-data.ts`
- `src/lib/delayed-query.ts`
- `src/lib/delayed-data.ts`
- `src/lib/crm-page-data.ts`
- `src/lib/returns-tab-data.ts`
- `src/lib/returns-page-data.ts`
- `src/app/api/orders/delayed/route.ts`
- `src/app/api/orders/returns/route.ts`
- `src/app/api/orders/returns/summary/route.ts`

## Nhóm Client/UI

- `src/components/returns/ReturnsPageClient.tsx`
- `src/components/claims/ClaimsPageWrapper.tsx`
- `src/components/claims/ClaimsClient.tsx`
- `src/app/(dashboard)/admin/users/page.tsx`
- `src/components/finance/OverviewTab.tsx`
- `src/components/finance/AnalysisTab.tsx`
- `src/components/finance/CashbookTab.tsx`
- `src/components/shared/OrderDetailDialog.tsx`
- `src/components/attendance/IdleLogoutProvider.tsx`
- `src/app/(landing)/components/StatsSection.tsx`

## Nhóm Reliability/Tooling

- `src/app/api/dashboard/*/route.ts`
- `src/app/api/announcements/route.ts`
- `src/app/api/announcements/[id]/route.ts`
- `src/app/api/announcements/unread-count/route.ts`
- `package.json`

---

## 4) Thứ tự ưu tiên mới

1. Baseline đo lường + quick wins đúng/sai dữ liệu (returns, idle, landing stats).
2. Tối ưu API/query hot path (delayed, CRM, finance data flow).
3. Tối ưu render/runtime ở các mega-component (claims/admin/finance/order detail).
4. Reliability và error handling.
5. Tooling/tests và cleanup.

---

## 5) Kế hoạch triển khai chi tiết

## PHASE 0 - Baseline và đo lường (0.5 ngày)

### Task 0.1 - Chốt baseline trước khi sửa
- [ ] Thu thập số liệu hiện tại cho: delayed, CRM, returns, claims, finance tab switch.
- [ ] Lưu baseline vào tài liệu mới: `docs/performance-baseline-2026-04-12-v2.md`.
- [ ] Ghi rõ dataset và điều kiện đo (local/prod-like, số bản ghi, warm/cold cache).

### Task 0.2 - Chuẩn hóa điểm đo
- [ ] Dùng `Server-Timing` cho route nặng (`delayed`, `crm`, `claims`, `dashboard`).
- [ ] Ghi rõ metric client: thời gian tab switch, thời gian từ click filter đến render ổn định.

### Tiêu chí hoàn thành Phase 0
- [ ] Có baseline rõ ràng trước khi tối ưu.
- [ ] Có bảng so sánh trước/sau theo từng route/tab.

---

## PHASE 1 - Quick wins ảnh hưởng trực tiếp UX (1 ngày)

### Task 1.1 - Đồng bộ filter returns giữa UI và API
**Files chính**
- `src/lib/returns-tab-data.ts`
- `src/components/returns/ReturnsPageClient.tsx`
- `src/app/api/orders/returns/route.ts`
- `src/lib/returns-page-data.ts`
- `src/components/returns/PartialReturnTab.tsx`
- `src/components/returns/WaitingReturnTab.tsx`

**Việc cần làm**
- [ ] Mở rộng `fetchReturnsTabData` để truyền đủ params: `tab/page/pageSize/search/shop/days/notes/confirm`.
- [ ] API route parse đủ params và chuyển xuống data layer.
- [ ] Đẩy filter/pagination xuống server, giảm lọc lại ở client tab component.
- [ ] Giữ URL là source of truth để refresh/back-forward không lệch dữ liệu.

**Tiêu chí hoàn thành**
- [ ] Mọi filter đổi trên UI đều xuất hiện trong request URL API.
- [ ] Dữ liệu giữa tab/URL/API khớp nhau, không còn lệch đếm hoặc lệch danh sách.

### Task 1.2 - Giảm overhead theo dõi hoạt động người dùng
**File chính**
- `src/components/attendance/IdleLogoutProvider.tsx`

**Việc cần làm**
- [ ] Đăng ký listener với `{ passive: true }` cho các event phù hợp.
- [ ] Giảm tần suất ghi `sessionStorage` khi người dùng di chuyển chuột/scroll liên tục.
- [ ] Thêm debounce/throttle rõ ràng cho cập nhật activity timestamp.

**Tiêu chí hoàn thành**
- [ ] Không có warning listener blocking scroll.
- [ ] CPU usage nền giảm trong trạng thái người dùng idle/di chuyển nhẹ.

### Task 1.3 - Giảm waterfall ở landing stats
**Files chính**
- `src/app/(landing)/page.tsx`
- `src/app/(landing)/components/StatsSection.tsx`
- `src/app/api/landing/stats/route.ts`

**Việc cần làm**
- [ ] Prefetch stats từ server component và truyền vào client component để hydrate.
- [ ] Giữ animation count-up ở client nhưng bỏ fetch dư lúc mount.
- [ ] Thay catch rỗng bằng logging nhẹ có ngữ cảnh.

**Tiêu chí hoàn thành**
- [ ] Landing giảm ít nhất 1 request sau mount.
- [ ] Không còn silent catch ở StatsSection.

---

## PHASE 2 - Tối ưu API/Query hot path (2-3 ngày)

### Task 2.1 - Refactor delayed pipeline theo 2 tầng
**Files chính**
- `src/lib/delayed-page-data.ts`
- `src/lib/delayed-query.ts`
- `src/lib/delayed-data.ts`
- `src/lib/delay-analyzer.ts`
- `src/app/api/orders/delayed/route.ts`

**Việc cần làm**
- [ ] Tách rõ lọc DB-level (search/shop/carrier/status/today) khỏi xử lý note nặng.
- [ ] Giảm volume parse note bằng cơ chế candidate set theo trang + bộ lọc đang dùng.
- [ ] Không tính facet đầy đủ trên toàn dataset khi không bắt buộc; hỗ trợ chế độ facet rút gọn.
- [ ] Thêm `Server-Timing` để đo riêng: DB query, parse note, aggregate/pagination.

**Tiêu chí hoàn thành**
- [ ] p95 route delayed giảm >= 35% so với baseline.
- [ ] Tỷ lệ xuất hiện cảnh báo truncated giảm rõ rệt ở các ca dùng phổ biến.

### Task 2.2 - Giảm fan-out query CRM bootstrap
**Files chính**
- `src/lib/crm-page-data.ts`
- `src/app/(dashboard)/crm/page.tsx`
- `src/components/crm/ShopManagementTab.tsx`
- `src/components/crm/ProspectPipelineTab.tsx`

**Việc cần làm**
- [ ] Chia bootstrap thành dữ liệu bắt buộc first paint và dữ liệu hậu tải.
- [ ] Gom/đơn giản hóa các `groupBy` trùng mục tiêu, ưu tiên query tổng hợp ít lượt gọi.
- [ ] Không tải đồng thời quá nhiều aggregate nặng ngay lần đầu vào trang.
- [ ] Thiết lập staleTime hợp lý cho dữ liệu ít biến động.

**Tiêu chí hoàn thành**
- [ ] TTFB trang CRM giảm >= 30%.
- [ ] Số query nặng khởi tạo giảm rõ ràng so với baseline.

### Task 2.3 - Chuẩn hóa data-fetch finance analysis/cashbook
**Files chính**
- `src/components/finance/AnalysisTab.tsx`
- `src/components/finance/CashbookTab.tsx`
- `src/lib/finance/page-data.ts`

**Việc cần làm**
- [ ] Chuyển các fetch thủ công trong `useEffect` sang React Query để tránh request trùng.
- [ ] Tách query key rõ theo period/filter/page.
- [ ] Dùng `placeholderData`/`staleTime` để giảm spinner khi đổi tab/period.

**Tiêu chí hoàn thành**
- [ ] Đổi tab/period mượt hơn, giảm số request trùng.

---

## PHASE 3 - Tối ưu render và interaction ở client (2-4 ngày)

### Task 3.1 - Giảm chi phí mount trang Claims
**Files chính**
- `src/components/claims/ClaimsPageWrapper.tsx`
- `src/components/claims/ClaimsClient.tsx`
- `src/components/claims/claims-table/*`

**Việc cần làm**
- [ ] Rà soát `ssr: false` ở tab claims chính và chỉ giữ cho phần thực sự cần browser API.
- [ ] Dynamic import các dialog/drawer nặng theo nhu cầu mở.
- [ ] Memo hóa row/cell/action và giảm inline object/function gây rerender.

**Tiêu chí hoàn thành**
- [ ] Thời gian tương tác đầu trên claims cải thiện rõ rệt.
- [ ] Render commit/paint trong profiler giảm so với baseline.

### Task 3.2 - Chia nhỏ `admin/users/page.tsx` (mega-file)
**Files chính**
- `src/app/(dashboard)/admin/users/page.tsx`
- Tạo mới dưới `src/components/admin/*`

**Việc cần làm**
- [ ] Tách `UsersTab`, `PermissionsTab`, `RequestsFeedbackTab`, các dialog form.
- [ ] Giảm inline style lặp lại, gom style dùng chung.
- [ ] Lazy-load tab hiếm dùng (announcements/requests) nếu phù hợp.

**Tiêu chí hoàn thành**
- [ ] Không còn file đơn > 900 dòng ở khu vực admin users.
- [ ] Tab chuyển đổi phản hồi nhanh hơn.

### Task 3.3 - Tối ưu `OverviewTab` và các dialog tài chính
**Files chính**
- `src/components/finance/OverviewTab.tsx`
- Tạo mới: `src/components/finance/overview/*` (nếu tách)

**Việc cần làm**
- [ ] Gom state liên quan thành nhóm logic (filter/dialog/form).
- [ ] Memo hóa transform dữ liệu chart và list nặng.
- [ ] Tách sub-component: expense/budget/pnl, lazy-load dialog chỉnh sửa.

**Tiêu chí hoàn thành**
- [ ] Rerender giảm khi thay period/filter.
- [ ] Không drop frame khi mở/đóng dialog.

### Task 3.4 - Tối ưu mở `OrderDetailDialog`
**Files chính**
- `src/components/shared/OrderDetailDialog.tsx`
- `src/components/orders/OrderTable.tsx`

**Việc cần làm**
- [ ] Memo hóa dialog + handler ổn định từ table.
- [ ] Chỉ fetch chi tiết khi mở, và cache theo `requestCode` để mở lại nhanh.
- [ ] Rà soát logic hiển thị field tài chính theo permission thay vì role cứng.

**Tiêu chí hoàn thành**
- [ ] Mở lại cùng 1 đơn nhanh hơn rõ rệt (cache hit).

---

## PHASE 4 - Reliability và error handling (1-2 ngày)

### Task 4.1 - Bọc try/catch cho dashboard và announcements
**Files chính**
- `src/app/api/dashboard/activities/route.ts`
- `src/app/api/dashboard/carriers/route.ts`
- `src/app/api/dashboard/summary/route.ts`
- `src/app/api/dashboard/top-shops/route.ts`
- `src/app/api/dashboard/trend/route.ts`
- `src/app/api/announcements/route.ts`
- `src/app/api/announcements/[id]/route.ts`
- `src/app/api/announcements/unread-count/route.ts`

**Việc cần làm**
- [ ] Trả lỗi chuẩn hóa (`error code/message`) thay vì throw trôi nổi.
- [ ] Gắn logging có ngữ cảnh route và request params quan trọng.
- [ ] Đồng nhất check permission bằng helper nhất quán.

### Task 4.2 - Xóa silent catch có chủ đích
**Files chính**
- `src/components/shared/UserProfileDialog.tsx`
- `src/components/crm/ProspectFormDialog.tsx`
- `src/components/shared/AddTodoDialog.tsx`
- `src/components/todos/TodoReminderBanner.tsx`
- `src/hooks/useTodoUsers.ts`
- `src/app/(landing)/components/StatsSection.tsx`
- `src/components/attendance/IdleLogoutProvider.tsx`

**Việc cần làm**
- [ ] Thay `catch {}` và `.catch(() => {})` bằng xử lý lỗi tối thiểu: log/toast/fallback rõ ràng.

**Tiêu chí hoàn thành Phase 4**
- [ ] Không còn silent catch trong các file nêu trên.

---

## PHASE 5 - Tooling, test, cleanup (1-2 ngày)

### Task 5.1 - Cập nhật lint script tương thích Next.js 16
**File chính**
- `package.json`

**Việc cần làm**
- [ ] Đổi script lint sang ESLint CLI phù hợp Next 16.

### Task 5.2 - Ổn định test sau refactor
- [ ] Cập nhật fixture test bị lệch logic query mới.
- [ ] Bổ sung test cho returns params flow và delayed query builder.

### Task 5.3 - Rà soát phụ thuộc thừa (`zustand`)
**File chính**
- `package.json`

**Việc cần làm**
- [ ] Xác nhận usage thực tế rồi mới gỡ dependency.
- [ ] Chỉ gỡ khi lint/test/build đều xanh.

---

## 6) Kế hoạch verify theo pha

### Verify nhanh sau mỗi phase
- [ ] `npm run lint`
- [ ] `npm run test:run`
- [ ] `npm run build`

### Verify chức năng trọng điểm
- [ ] Returns: filter/search/page phản ánh đúng trên URL và API request.
- [ ] Delayed: đo `Server-Timing` trước/sau, xác nhận p95 giảm.
- [ ] CRM: đo thời gian render first content và số query server khi vào trang.
- [ ] Claims/Finance/Admin: đo tab-switch latency và tương tác dialog.

### Verify reliability
- [ ] Simulate lỗi DB/network: API trả lỗi có cấu trúc, không 500 mơ hồ.
- [ ] Không còn catch rỗng ở các file trong phạm vi.

---

## 7) Rủi ro và phương án giảm thiểu

- Rủi ro 1: refactor delayed làm sai logic phân loại lý do/risk.
  - Giảm thiểu: giữ test snapshot cho `delay-analyzer`, rollout theo cờ cấu hình nếu cần.
- Rủi ro 2: chuyển fetch sang React Query làm lệch state UI cũ.
  - Giảm thiểu: chuyển từng tab nhỏ, giữ fallback và so sánh output trước/sau.
- Rủi ro 3: tách mega-file gây regression sự kiện UI.
  - Giảm thiểu: tách theo từng cụm component, verify thủ công theo checklist.

---

## 8) Mốc triển khai đề xuất

- Ngày 1: Phase 0 + Phase 1.
- Ngày 2-3: Phase 2.
- Ngày 4-5: Phase 3.
- Ngày 6: Phase 4.
- Ngày 7: Phase 5 + hardening + release note.

---

## 9) Trạng thái theo dõi

- [x] Phase 1 security cũ: DONE (theo tài liệu gốc).
- [ ] Phase 0 baseline: TODO.
- [ ] Phase 1 quick wins: TODO.
- [ ] Phase 2 API hot path: TODO.
- [ ] Phase 3 client runtime: TODO.
- [ ] Phase 4 reliability: TODO.
- [ ] Phase 5 tooling/tests: TODO.
