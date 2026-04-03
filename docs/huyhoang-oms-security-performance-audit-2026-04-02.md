# Báo cáo tiền kiểm, audit bảo mật và tối ưu hiệu năng HuyHoang Express OMS

Ngày audit: 2026-04-02

Phạm vi rà soát:
- Next.js 16 App Router, React 19, Prisma 6.19.2, Supabase PostgreSQL, NextAuth v5, TanStack Query.
- Dữ liệu hiện tại khoảng 67.000 đơn, mục tiêu chịu tải dài hạn 500.000 đơn trên Vercel Hobby với ngưỡng timeout serverless 10 giây.
- Trọng tâm: vá lỗ hổng phân quyền ở API, xử lý lệch RBAC giữa UI và API, săn bug logic/race condition, tìm nghẽn database, serverless và client bundle.

## Phần 1: 🛡️ Security & Bug Fixes

### 1.1. Các lỗi đã vá ngay trong code

#### A. Chuẩn hóa RBAC theo permission ở tầng API

Đã bổ sung helper dùng chung:
- `src/lib/route-permissions.ts`
- `src/lib/todo-permissions.ts`

Logic mới:
- `ADMIN` có quyền bypass ở lớp helper chung, tránh tình trạng mỗi route tự hiểu RBAC một kiểu.
- Các route API không còn chỉ kiểm tra “đã đăng nhập”, mà kiểm tra đúng permission nghiệp vụ.

Các route đã được bịt quyền:
- `src/app/api/orders/route.ts`: bắt buộc `canViewOrders`
- `src/app/api/orders/returns/route.ts`: bắt buộc `canViewReturns`
- `src/app/api/orders/[requestCode]/warehouse/route.ts`: bắt buộc `canConfirmReturn`
- `src/app/api/orders/[requestCode]/tracking/route.ts`: bắt buộc `canViewOrders`
- `src/app/api/orders/[requestCode]/detail/route.ts`: bắt buộc `canViewOrders`
- `src/app/api/orders/options/route.ts`: bắt buộc `canViewOrders`
- `src/app/api/orders/upload-history/route.ts`: bắt buộc `canViewOrders`
- `src/app/api/orders/changes/route.ts`: bắt buộc `canViewOrders`
- `src/app/api/orders/changes/stats/route.ts`: bắt buộc `canViewOrders`
- Toàn bộ nhóm `src/app/api/todos/**`: siết lại quyền xem toàn bộ công việc, quyền gán việc cho người khác và quyền thao tác trên todo không thuộc về mình.

Ý nghĩa bảo mật:
- Chặn được tình huống user đã đăng nhập nhưng không có quyền vẫn gọi API trực tiếp bằng DevTools/Postman.
- Đóng lỗ hổng leo thang đặc quyền ở các màn hình Orders, Returns, Warehouse confirmation, Todos và Tracking proxy.

#### B. Sửa lệch quyền giữa UI Finance và Finance API

Vấn đề cũ:
- UI `/finance` cho `ADMIN` vào được.
- `src/lib/finance-auth.ts` lại chặn nếu `canViewFinancePage = false`, khiến `ADMIN` dính `403`.

Đã sửa:
- `src/lib/finance-auth.ts`
- `src/middleware.ts`

Hiện tại:
- Page guard và API guard đều dùng cùng helper `hasPermission`.
- `ADMIN` không còn bị mismatch giữa page và API.

#### C. Ẩn dữ liệu tài chính nhạy cảm theo permission thay vì role cứng

Vấn đề cũ:
- `src/app/api/orders/[requestCode]/detail/route.ts` ẩn/hiện `carrierFee`, `ghsvInsuranceFee`, `revenue` theo role cứng.

Đã sửa:
- Dùng `canViewCarrierFee` và `canViewRevenue` để che dữ liệu đúng theo RBAC thực tế.

Lợi ích:
- Tránh lộ số liệu tài chính cho user không thuộc nhóm được xem phí/doanh thu.
- Đồng nhất với `PermissionGroup` trong schema.

#### D. Chặn staff xem hoặc thao tác todo của người khác

Các lỗ hổng cũ:
- `GET /api/todos?scope=all&assigneeId=...` cho staff lách scope.
- `POST /api/todos` cho staff gán todo cho user khác.
- `PATCH/DELETE` trên `todos/[id]`, `todos/[id]/status`, `todos/[id]/complete`, `todos/[id]/comments` chưa khóa theo ownership.

Đã sửa:
- Nếu user không có `canViewAllTodos`, mọi truy vấn đều bị ép về todo của chính mình.
- Tạo todo mới sẽ tự động `assigneeId = session.user.id` nếu caller không có quyền quản lý toàn bộ.
- Các route thao tác theo `id` chỉ cho phép assignee hoặc user có quyền toàn cục.

### 1.2. Bug mới phát hiện trong quá trình audit

#### A. Race condition: Todo đang là kiểu “last write wins”

Điểm rủi ro:
- `src/app/api/todos/[id]/complete/route.ts`
- `src/app/api/todos/[id]/status/route.ts`
- `src/app/api/todos/reorder/route.ts`

Hiện trạng:
- Mỗi request đọc/xử lý/cập nhật trực tiếp theo `id`.
- Không có version field, không có điều kiện `updatedAt` trong `where`, không có optimistic concurrency control.

Kịch bản lỗi:
- Hai nhân viên cùng bấm hoàn thành hoặc đổi trạng thái trong cùng thời điểm.
- Kết quả cuối sẽ phụ thuộc request đến sau, làm mất thao tác trước mà không báo xung đột.

Khuyến nghị sửa tiếp:
- Thêm cột `version Int @default(0)` hoặc dùng `updatedAt` để kiểm tra điều kiện khi update.
- Chuyển update sang dạng:

```ts
const result = await prisma.todoItem.updateMany({
  where: { id, updatedAt: clientUpdatedAt },
  data: {
    status,
    completedAt,
    updatedAt: new Date(),
  },
});

if (result.count === 0) {
  return NextResponse.json({ error: "Bản ghi đã thay đổi, vui lòng tải lại." }, { status: 409 });
}
```

#### B. Warehouse confirmation cũng có race condition nhẹ

Điểm rủi ro:
- `src/app/api/orders/[requestCode]/warehouse/route.ts`

Hiện trạng:
- Route chỉ `update` thẳng `warehouseArrivalDate = new Date()`.

Kịch bản lỗi:
- Hai người xác nhận cùng lúc sẽ không làm hỏng dữ liệu nghiêm trọng, nhưng timestamp cuối bị ghi đè.
- Nếu sau này có audit trail hoặc trigger nghiệp vụ, sẽ dễ mất tính chính xác.

Khuyến nghị:
- Chỉ update khi `warehouseArrivalDate IS NULL`.
- Nếu đã có giá trị, trả `409` hoặc `200` kèm cờ “already confirmed”.

Ví dụ:

```ts
const updated = await prisma.order.updateMany({
  where: { requestCode, warehouseArrivalDate: null },
  data: { warehouseArrivalDate: new Date() },
});
```

#### C. Batch import có nguy cơ partial write khi đứt giữa chừng

Điểm rủi ro:
- `src/lib/order-import-service.ts`

Hiện trạng:
- Import chạy theo vòng lặp `BATCH_SIZE = 500`.
- Mỗi batch có transaction riêng, không có transaction bao toàn bộ file.

Kịch bản lỗi:
- File Excel 5.000 dòng, serverless timeout hoặc mạng đứt ở batch thứ 7.
- 6 batch đầu đã commit, batch sau chưa chạy, dẫn tới dữ liệu nửa cũ nửa mới.

Kết luận:
- Không phải lỗi “corrupt row”, nhưng là partial success không nguyên tử ở cấp độ file.

Khuyến nghị:
- Ghi `importSessionId` và trạng thái session.
- Import vào staging table trước, validate xong mới merge sang `Order`.
- Nếu vẫn giữ kiến trúc hiện tại, ít nhất phải lưu upload session + số batch đã commit để có thể resume/replay an toàn.

#### D. Edge case doanh thu âm có thể làm dashboard hiểu sai

Điểm rủi ro:
- `src/app/api/finance/negative-revenue/route.ts`
- Các chart/summary ở module finance

Hiện trạng:
- `revenue = totalFee - carrierFee` hoàn toàn có thể âm.
- Route negative-revenue đã hỗ trợ dữ liệu âm, nhưng client/chart cần bảo đảm không giả định min là `0`.

Khuyến nghị:
- Mọi chart dùng revenue phải cho phép domain âm.
- Các tổng hợp P&L nên tách rõ `gross revenue`, `negative revenue count`, `net contribution`.
- Test thêm dữ liệu biên: `0`, âm nhỏ, âm lớn, null fee.

### 1.3. Code refactor cho file phình to

Ưu tiên tách nhỏ:
- `src/components/claims/ClaimsClient.tsx`
- `src/app/(dashboard)/admin/users/page.tsx`
- `src/components/finance/OverviewTab.tsx`
- `src/components/claims/ClaimDetailDrawer.tsx`
- `src/components/orders/OrderChangesTab.tsx`

Lưu ý quan trọng:
- `src/components/crm/CrmClient.tsx` hiện không phải file khổng lồ. Điểm nặng thật sự của CRM nằm ở:
  - `src/components/crm/ShopDetailPanel.tsx`
  - `src/components/crm/ShopManagementTab.tsx`
  - `src/components/crm/ProspectPipelineTab.tsx`

Đề xuất pattern tách:
- Tách container query/state khỏi phần presentational.
- Tách dialog/drawer thành file riêng.
- Tách filter bar, table, bulk actions, detail panel, mutation hooks.
- Với tab nặng, dùng dynamic import theo tab thay vì mount sẵn toàn bộ.

## Phần 2: 🚀 Kế hoạch Tăng Tốc (Speed Optimization Plan)

### 2.1. Danh sách truy vấn Prisma chậm cần sửa

#### A. N+1 trong auto-detect claims

File:
- `src/lib/claim-detector.ts`

Vấn đề:
- Sau khi tạo `allDetectedClaims`, code đang lặp từng claim rồi `findUnique` theo `orderId`.
- Với 500 claim bị phát hiện, route sẽ phát sinh thêm 500 query phụ.

Hiện trạng rủi ro:
- Dễ vượt ngưỡng latency khi import lớn.
- Tăng connection pressure lên Supabase.

Code tối ưu đề xuất:

```ts
const orderIds = allDetectedClaims.map((claim) => claim.orderId);

const existingClaims = await prisma.claimOrder.findMany({
  where: { orderId: { in: orderIds } },
  select: {
    orderId: true,
    id: true,
    issueType: true,
    claimStatus: true,
    isCompleted: true,
  },
});

const existingMap = new Map(existingClaims.map((claim) => [claim.orderId, claim]));

for (const claim of allDetectedClaims) {
  const existingClaim = existingMap.get(claim.orderId);
  // xử lý create/update từ map thay vì query từng vòng lặp
}
```

#### B. `delayed/route.ts` đang kéo toàn bộ dữ liệu vào RAM rồi mới lọc/sort/paginate

File:
- `src/app/api/orders/delayed/route.ts`

Vấn đề hiện tại:
- `findMany` không `take`, không pagination từ database.
- Sau đó mới parse `publicNotes`, filter, sort, build facets, summary và paginate trong Node.js.

Hệ quả:
- Tăng RAM và CPU serverless theo số lượng đơn.
- Khi dữ liệu tăng lên 500.000 đơn, route này sẽ là điểm timeout số 1.

Hướng xử lý dứt điểm:
1. Tiền tính toán delay metadata ở thời điểm import/update.
2. Lưu các field đã chuẩn hóa vào bảng `Order` hoặc bảng phụ `DelayedOrderSnapshot`.
3. Chạy pagination ngay trong SQL/Prisma thay vì trong bộ nhớ.

Field nên materialize:
- `delayEventCount`
- `lastDelayAt`
- `latestDelayReason`
- `latestDelayRisk`
- `hasDelayToday`

Schema hướng khuyến nghị:

```prisma
model Order {
  // ...
  delayEventCount   Int      @default(0)
  lastDelayAt       DateTime?
  latestDelayReason String?
  latestDelayRisk   String?
  hasDelayToday     Boolean  @default(false)

  @@index([claimLocked, deliveryStatus, lastUpdated])
  @@index([claimLocked, deliveryStatus, latestDelayRisk, lastDelayAt])
}
```

API query sau khi tối ưu:

```ts
const [rows, total, summary] = await prisma.$transaction([
  prisma.order.findMany({
    where,
    select: {
      id: true,
      requestCode: true,
      shopName: true,
      receiverName: true,
      deliveryStatus: true,
      carrierName: true,
      lastUpdated: true,
      delayEventCount: true,
      lastDelayAt: true,
      latestDelayReason: true,
      latestDelayRisk: true,
      hasDelayToday: true,
    },
    orderBy,
    skip,
    take: pageSize,
  }),
  prisma.order.count({ where }),
  prisma.order.groupBy({
    by: ["latestDelayRisk"],
    where,
    _count: true,
  }),
]);
```

#### C. `delayed/export/route.ts` vẫn export bằng cách xử lý 10.000 record trong RAM

File:
- `src/app/api/orders/delayed/export/route.ts`

Vấn đề:
- Query tối đa 10.000 đơn rồi map/sort/filter/xuất Excel trong memory.

Nguy cơ:
- Export là ca dễ chạm giới hạn 10 giây nhất trên Vercel Hobby.

Khuyến nghị:
- Nếu chưa có background job: export theo bộ lọc đã materialize và stream CSV thay vì dựng workbook XLSX trong memory.
- Nếu có thể đổi kiến trúc: đẩy export sang background queue và trả link file sau.

Ưu tiên thực tế:
- Giai đoạn 1: CSV streaming.
- Giai đoạn 2: background export + lưu file object storage.

#### D. `negative-revenue/route.ts` đang lấy toàn bộ order âm để suy luận topReason

File:
- `src/app/api/finance/negative-revenue/route.ts`

Vấn đề:
- Route song song hóa tốt, nhưng vẫn `findMany` toàn bộ order âm trong kỳ.
- `topReason` đang tính bằng cách lọc mảng trong memory.

Tối ưu đề xuất:
- Chỉ lấy danh sách order khi tab thực sự cần hiển thị chi tiết.
- Summary nên đẩy hết xuống database.

Ví dụ:

```ts
const [lossAgg, carrierGroups, returnCount] = await Promise.all([
  prisma.order.aggregate({
    where: negWhere,
    _sum: { revenue: true },
    _count: true,
  }),
  prisma.order.groupBy({
    by: ["carrierName"],
    where: negWhere,
    _count: true,
  }),
  prisma.order.count({
    where: {
      ...negWhere,
      deliveryStatus: { in: ["RETURNED_FULL", "RETURNED_PARTIAL"] },
    },
  }),
]);
```

Sau đó mới fetch bảng chi tiết với pagination riêng.

#### E. Import Excel: query hiện tại chấp nhận được, nhưng cần giới hạn blast radius

File:
- `src/lib/order-import-service.ts`

Nhận định:
- Phần `requestCode in (...)` theo batch 500 là hợp lý.
- Điểm chưa tốt nằm ở chỗ claim detection chạy sau import dễ bị kéo dài do N+1.

Khuyến nghị:
- Sửa N+1 ở `claim-detector.ts` trước.
- Gắn timeout nội bộ cho bước hậu xử lý, hoặc tách auto-claim scan sang job riêng nếu import file lớn.

### 2.2. Danh sách component Frontend cần áp dụng Lazy Loading

#### Cần ưu tiên ngay

- `src/app/(dashboard)/returns/page.tsx`
  - Hiện đang `Promise.all` tải cả 3 tab ngay khi mount.
  - Nên chỉ fetch tab đang active.
  - Nên dynamic import từng tab component.

- `src/components/claims/ClaimsClient.tsx`
  - File rất lớn, nhiều state và dialog.
  - Nên tách `ClaimTable`, `ClaimFilters`, `ClaimBulkActions`, `ClaimDrawerHost`, `useClaimsQuery`.

- `src/app/(dashboard)/admin/users/page.tsx`
  - Nhiều form/dialog/bảng trong cùng file.
  - Nên tách danh sách, modal tạo/sửa, permission matrix, audit/history nếu có.

- `src/components/finance/OverviewTab.tsx`
  - `AnalysisTab` và `CashbookTab` đã dynamic import, nhưng `OverviewTab` vẫn import eager.
  - Có thể preload từ Server Component và chỉ hydrate những widget cần tương tác.

#### Cần xử lý ngay sau đó

- `src/components/crm/ShopDetailPanel.tsx`
- `src/components/crm/ShopManagementTab.tsx`
- `src/components/crm/ProspectPipelineTab.tsx`
- `src/components/orders/OrderChangesTab.tsx`
- `src/components/shared/OrderDetailDialog.tsx`

Mẫu refactor nên áp dụng cho `/returns`:

```tsx
const PartialReturnTab = dynamic(() => import("@/components/returns/PartialReturnTab"));
const FullReturnTab = dynamic(() => import("@/components/returns/FullReturnTab"));
const WaitingReturnTab = dynamic(() => import("@/components/returns/WaitingReturnTab"));

const query = useQuery({
  queryKey: ["returns", activeTab, filters],
  queryFn: () => fetchReturns(activeTab, filters),
  staleTime: 60_000,
});
```

Lợi ích:
- Giảm số request đầu trang từ 3 xuống 1.
- Giảm bundle và hydrate cost khi user chỉ dùng một tab.
- Tận dụng cache của TanStack Query thay vì giữ 3 mảng lớn trong local state.

### 2.3. Giải pháp cụ thể cho `delayed/route.ts` để tránh timeout Vercel

#### Nguyên nhân gốc

- Regex/chuẩn hóa note và phân tích rủi ro đang diễn ra trên toàn bộ tập đơn trong bộ nhớ.
- Route vừa làm ETL mini, vừa làm filtering, sorting, faceting, summary, pagination trong một request.

#### Phương án triển khai theo mức ưu tiên

#### Phương án A. Nên làm ngay

1. Không parse note trên toàn bộ tập dữ liệu nữa.
2. Chỉ lấy cột tối thiểu.
3. Giới hạn cứng số record xử lý nếu chưa materialize metadata.
4. Tách summary/facets khỏi rows nếu bộ lọc quá rộng.

Fallback an toàn ngắn hạn:
- Nếu result set thô vượt ngưỡng, trả cảnh báo “vui lòng lọc hẹp hơn”.
- Không cho export tất cả nếu chưa có job nền.

#### Phương án B. Sửa đúng kiến trúc

1. Tại import/update order, parse `publicNotes` một lần.
2. Lưu metadata delay đã chuẩn hóa vào DB.
3. `delayed/route.ts` chỉ đọc dữ liệu đã chuẩn hóa.
4. Export dùng cùng bộ metadata đó.

#### Phương án C. Nếu cần giữ regex hiện tại một thời gian

- Tạo incremental cache theo `requestCode + lastUpdated`.
- Chỉ re-parse các đơn có `lastUpdated` thay đổi.
- Lưu cache sang DB/table phụ thay vì memory của serverless instance.

Kết luận:
- Route này không nên tiếp tục là một “in-memory analytics engine”.
- Với giới hạn 10 giây của Vercel Hobby, hướng bền vững duy nhất là materialize metadata + paginate từ DB.

### 2.4. Đánh giá proxy tracking và chiến lược cache

File:
- `src/app/api/orders/[requestCode]/tracking/route.ts`

Phát hiện:
- Trạng thái cũ dùng `cache: "no-store"` khiến mọi lần mở chi tiết đơn đều đập thẳng sang upstream tracking API.

Đã vá:
- Chuyển sang `cache: "force-cache"` và `next: { revalidate: 300 }`.

Khuyến nghị:
- 5 phút là mức hợp lý cho tracking landing page.
- Nếu user bấm “Làm mới”, khi đó mới cho phép bypass cache thủ công bằng query param riêng.

Lợi ích:
- Giảm tải upstream.
- Giảm latency trung bình của popup chi tiết đơn.
- Tránh nghẽn đồng loạt khi nhiều nhân viên mở cùng một mã đơn.

## Phần 3: 🏗️ Đề xuất Index Database

### 3.1. Nhận định hiện trạng

`Order` đã có một số index tốt:
- `status`
- `carrierName`
- `shopName`
- `deliveryStatus`
- `createdTime`
- `lastUpdated`
- `receiverProvince`
- `salesStaff`
- `claimLocked`
- `deliveryStatus + createdTime`
- `shopName + deliveryStatus`
- `deliveredDate`
- `revenue`
- `creatorShopName + createdTime`

Tuy nhiên để chịu tải khoảng 500.000 đơn, vẫn thiếu index cho các mẫu lọc đang dùng nhiều ở Orders, Delayed, Returns, Finance và Todo.

### 3.2. `@@index` cần thêm ngay trong `prisma/schema.prisma`

#### Cho model `Order`

```prisma
model Order {
  // ...

  @@index([carrierOrderCode])
  @@index([receiverPhone])
  @@index([regionGroup])
  @@index([partialOrderType])

  @@index([carrierName, createdTime])
  @@index([salesStaff, createdTime])
  @@index([shopName, createdTime])

  @@index([claimLocked, deliveryStatus, lastUpdated])
  @@index([claimLocked, deliveryStatus, partialOrderType, warehouseArrivalDate])

  @@index([createdTime, revenue])
}
```

Giải thích ngắn:
- `carrierOrderCode`, `receiverPhone`: tăng tốc tra cứu nhanh ở Orders.
- `regionGroup`, `partialOrderType`: hỗ trợ filter hay dùng nhưng hiện chưa có index riêng.
- `carrierName + createdTime`, `salesStaff + createdTime`, `shopName + createdTime`: hợp với pattern filter + date range.
- `claimLocked + deliveryStatus + lastUpdated`: hỗ trợ Delayed/Returns sau khi đẩy logic về DB.
- `claimLocked + deliveryStatus + partialOrderType + warehouseArrivalDate`: hợp cho màn Returns/Warehouse.
- `createdTime + revenue`: tốt cho finance lọc theo kỳ và truy vấn doanh thu âm.

#### Cho model `TodoItem`

```prisma
model TodoItem {
  // ...

  @@index([assigneeId, status, dueDate])
  @@index([assigneeId, sortOrder])
  @@index([createdById])
}
```

Lý do:
- Màn todo lọc theo `assigneeId`, `status`, `dueDate` rất thường xuyên.
- Kanban reorder dựa vào `assigneeId + sortOrder`.
- Audit và thống kê theo người tạo sẽ nhanh hơn khi thêm `createdById`.

### 3.3. Index Prisma thôi là chưa đủ cho tìm kiếm chứa chuỗi

Các điều kiện như:
- `contains` trên `requestCode`
- `contains` trên `receiverName`
- `contains` trên `shopName`
- `contains` trên `carrierOrderCode`
- `contains` trên `publicNotes`

thường tương đương `ILIKE '%keyword%'`, B-Tree index thông thường không giúp nhiều.

Với mục tiêu 500.000 đơn, cần thêm PostgreSQL trigram index bằng SQL migration:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY order_shop_name_trgm_idx
ON "Order" USING gin ("shopName" gin_trgm_ops);

CREATE INDEX CONCURRENTLY order_receiver_name_trgm_idx
ON "Order" USING gin ("receiverName" gin_trgm_ops);

CREATE INDEX CONCURRENTLY order_carrier_order_code_trgm_idx
ON "Order" USING gin ("carrierOrderCode" gin_trgm_ops);
```

Nếu delayed search còn bám `publicNotes`, nên cân nhắc thêm:

```sql
CREATE INDEX CONCURRENTLY order_public_notes_trgm_idx
ON "Order" USING gin ("publicNotes" gin_trgm_ops);
```

Nhưng khuyến nghị tốt hơn vẫn là:
- Không search business-critical bằng `publicNotes` thô.
- Chuẩn hóa metadata rồi index trên field cấu trúc.

## Kết luận ưu tiên triển khai

### Nên merge ngay

- Bộ vá RBAC/API đã thực hiện.
- Fix mismatch `ADMIN` ở Finance.
- Fix permission-based masking cho order detail.
- Fix todo ownership và tracking proxy auth/cache.

### Nên làm trong sprint kế tiếp

1. Sửa N+1 ở `src/lib/claim-detector.ts`.
2. Refactor `/returns` sang lazy load + fetch theo tab đang mở.
3. Tách file lớn `ClaimsClient`, `admin/users/page`, `OverviewTab`.
4. Thêm composite index cho `Order` và `TodoItem`.

### Nên làm trước khi dữ liệu vượt mạnh qua 100.000-150.000 đơn

1. Materialize delay metadata, dừng regex toàn tập ở `delayed/route.ts`.
2. Chuyển export delayed sang CSV streaming hoặc background job.
3. Thêm trigram index cho các cột search bằng `contains`.
4. Bổ sung optimistic concurrency cho Todo và Warehouse confirmation.
