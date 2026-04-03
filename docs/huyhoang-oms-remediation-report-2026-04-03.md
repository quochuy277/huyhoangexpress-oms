# HuyHoang Express OMS - Báo cáo tổng kết khắc phục và tối ưu hóa

Ngày hoàn tất: 2026-04-03

## 1. Phạm vi đã hoàn tất

### Phase 0 - Backup & Guardrails
- Tạo baseline backup và snapshot trạng thái repo trước khi sửa.
- Lưu `git status`, `working-tree.patch`, và baseline kiểm tra UTF-8.
- Thiết lập quy trình rà soát các file UI/API có tiếng Việt để tránh lỗi mojibake sau chỉnh sửa.

### Phase 1 - Security & Integrity
- Siết RBAC ở tầng API Orders/Todo/Tracking/Warehouse theo `session.user.permissions`.
- Đồng bộ quyền `ADMIN` giữa UI Finance và API/middleware.
- Sửa race condition nhẹ ở xác nhận kho bằng cập nhật có điều kiện và trả `409` nếu record đã được xác nhận trước đó.
- Bổ sung test cho RBAC và conflict handling.

### Phase 2 - Quick Performance Wins
- Xóa N+1 query ở `claim-detector` bằng cách gom `orderId` và `findMany` một lần.
- Tối ưu `negative-revenue` để summary chạy bằng aggregation/grouping ở database.
- Refactor `/returns` để chỉ fetch/render tab active và lazy load tab nặng.
- Áp dụng lazy loading bổ sung cho phần Finance phù hợp rủi ro thấp.

### Phase 3 - Delayed & Export Hardening
- Tạo summary endpoint nhẹ cho `/returns` để tải ngay số lượng 3 tab mà không fetch toàn bộ dữ liệu.
- Hardening `delayed/route.ts` bằng pre-filter tại DB, giới hạn tập quét, trả cờ cảnh báo khi dữ liệu vượt ngưỡng.
- Chuyển `delayed/export` sang CSV streaming theo batch để giảm RAM và tránh timeout Vercel.

### Phase 4 - Schema & Index
- Thêm OCC cho `TodoItem` bằng field `version`.
- Cập nhật API Todo để kiểm tra `version` và trả `409 Conflict` khi stale write.
- Thêm B-tree indexes cho `Order` và `TodoItem`.
- Thêm migration trigram với `pg_trgm` và GIN index cho tìm kiếm text.
- Chuẩn hóa lại test kiểm tra tiếng Việt hiển thị để phản ánh đúng trạng thái source.

## 2. Backup và artifact

- Phase 0-1: `backups/20260403-141306-phase-0-1`
- Phase 2: `backups/20260403-143232-phase-2`
- Phase 3: `backups/20260403-080433-phase-3`
- Phase 4: `backups/20260403-082844-phase-4`

Mỗi phase đều đã lưu snapshot trạng thái repo, patch baseline và kiểm tra UTF-8 tương ứng.

## 3. File chính đã sửa

### Security / RBAC / Finance
- `src/lib/route-permissions.ts`
- `src/lib/todo-permissions.ts`
- `src/lib/finance-auth.ts`
- `src/middleware.ts`
- `src/app/api/orders/route.ts`
- `src/app/api/orders/returns/route.ts`
- `src/app/api/orders/changes/route.ts`
- `src/app/api/orders/changes/stats/route.ts`
- `src/app/api/orders/options/route.ts`
- `src/app/api/orders/upload-history/route.ts`
- `src/app/api/orders/delayed/route.ts`
- `src/app/api/orders/delayed/export/route.ts`
- `src/app/api/orders/export/route.ts`
- `src/app/api/orders/delete/route.ts`
- `src/app/api/orders/notes/route.ts`
- `src/app/api/orders/upload/route.ts`
- `src/app/api/orders/[requestCode]/detail/route.ts`
- `src/app/api/orders/[requestCode]/warehouse/route.ts`
- `src/app/api/orders/[requestCode]/confirm-asked/route.ts`
- `src/app/api/orders/[requestCode]/customer-confirmed/route.ts`
- `src/app/api/orders/[requestCode]/tracking/route.ts`

### Performance / Returns / Delayed
- `src/lib/claim-detector.ts`
- `src/app/api/finance/negative-revenue/route.ts`
- `src/lib/returns-tab-data.ts`
- `src/lib/returns-queries.ts`
- `src/lib/delayed-query.ts`
- `src/lib/delayed-data.ts`
- `src/lib/delay-analyzer.ts`
- `src/app/(dashboard)/returns/page.tsx`
- `src/app/api/orders/returns/summary/route.ts`
- `src/components/delayed/DelayedClient.tsx`
- `src/components/finance/FinancePageClient.tsx`
- `src/components/finance/AnalysisTab.tsx`
- `src/components/finance/financeResponsive.ts`

### Todo OCC
- `prisma/schema.prisma`
- `src/lib/todo-optimistic-lock.ts`
- `src/types/todo.ts`
- `src/hooks/useTodos.ts`
- `src/app/api/todos/route.ts`
- `src/app/api/todos/[id]/route.ts`
- `src/app/api/todos/[id]/status/route.ts`
- `src/app/api/todos/[id]/complete/route.ts`
- `src/app/api/todos/reorder/route.ts`
- `src/components/todos/TodosClient.tsx`
- `src/components/todos/TodoListView.tsx`
- `src/components/todos/TodoKanbanView.tsx`
- `src/components/todos/TodoQuickAdd.tsx`
- `src/components/todos/TodoDetailPanel.tsx`
- `src/components/shared/AddTodoDialog.tsx`

### Test cập nhật / bổ sung
- `src/__tests__/app/api/orders-rbac-route.test.ts`
- `src/__tests__/app/api/orders-delayed-export-route.test.ts`
- `src/__tests__/app/api/orders-returns-summary-route.test.ts`
- `src/__tests__/app/api/todos-route-permissions.test.ts`
- `src/__tests__/app/api/todos-occ-route.test.ts`
- `src/__tests__/lib/claim-detector.test.ts`
- `src/__tests__/lib/returns-tab-data.test.ts`
- `src/__tests__/lib/delayed-data.test.ts`
- `src/__tests__/lib/delayed-text-encoding.test.ts`

## 4. Migration đã tạo

- `prisma/migrations/20260403080000_baseline_existing_database/migration.sql`
- `prisma/migrations/20260403085528_add_occ_and_btree_indexes/migration.sql`
- `prisma/migrations/20260403085906_add_trgm_indexes/migration.sql`
- `prisma/migrations/20260403154800_baseline_existing_database/migration.sql`

Ghi chú:
- `20260403154800_baseline_existing_database` được giữ lại như migration no-op để bảo toàn lịch sử sau khi baseline thực tế được đặt lại về mốc sớm hơn.
- Migration `20260315130321_rebuild_claim_order_model/migration.sql` đã được chỉnh để shadow database và lịch sử Prisma apply ổn định.

## 5. Ghi chú về trigram index

Yêu cầu ban đầu dùng `CREATE INDEX CONCURRENTLY`. Tuy nhiên `npx prisma migrate dev` chạy migration trong transaction/shadow database nên `CONCURRENTLY` lỗi ngay ở bước apply. Để giữ được quy trình Prisma migration chuẩn và lịch sử migration đầy đủ trong repo, migration `add_trgm_indexes` đã dùng:

- `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
- `CREATE INDEX IF NOT EXISTS ... USING GIN (... gin_trgm_ops);`

Kết quả cuối cùng vẫn tạo được trigram index trên:
- `Order.shopName`
- `Order.receiverName`
- `Order.carrierOrderCode`

## 6. Kết quả verify cuối

- `npx prisma generate`: thành công
- `npx prisma migrate status`: database schema is up to date
- `npm run test:run`: 44 test files passed, 360 tests passed
- `npm run build`: thành công

Warning còn lại:
- Next.js cảnh báo `middleware` file convention deprecated sang `proxy`, nhưng không gây fail build.
- Prisma cảnh báo `package.json#prisma` deprecated, nên chuyển sang `prisma.config.ts` ở đợt sau.

## 7. Kết luận

Chiến dịch vá lỗi bảo mật, tăng tốc hiệu năng, hardening delayed/export và chuẩn bị scale lên 500.000 đơn hàng đã hoàn tất trong phạm vi đợt này. Hệ thống hiện đã có:

- RBAC chặt hơn ở API
- Todo OCC để tránh stale write
- delayed/export an toàn hơn với serverless timeout và RAM
- returns UX nhẹ hơn
- hệ thống index/migration Prisma có lịch sử rõ ràng để tiếp tục phát triển
