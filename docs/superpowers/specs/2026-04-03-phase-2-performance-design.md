# Phase 2 Performance Design

## Mục tiêu

Thực hiện nhóm quick wins hiệu năng có rủi ro thấp:
- Xóa N+1 query trong `claim-detector.ts`.
- Đẩy tính toán summary của `negative-revenue` xuống database, chỉ lấy chi tiết khi có phân trang.
- Refactor `/returns` để chỉ fetch và render tab đang active, đồng thời lazy load component tab.

## Phạm vi

Bao gồm:
- Backup baseline riêng cho Phase 2.
- Quét UTF-8 cho toàn bộ file sẽ chỉnh sửa.
- Bổ sung test trước khi đổi logic backend/frontend.
- Áp dụng dynamic import cho tab returns.
- Cân nhắc dynamic import thêm cho Finance nếu không làm giảm first-paint UX.

Không bao gồm:
- Migration schema/index.
- Tối ưu delayed/export sâu.
- Refactor CRM lớn.

## Thiết kế kỹ thuật

- `claim-detector.ts`: gom tất cả `orderId`, gọi `claimOrder.findMany({ where: { orderId: { in: [...] }}})` một lần, đưa vào `Map`.
- `negative-revenue/route.ts`: tách summary và detail.
  - Summary: `aggregate`, `groupBy`, `count`.
  - Detail list: chỉ query khi client yêu cầu `page/pageSize` hoặc explicit `includeOrders`.
- `/returns/page.tsx`:
  - Dùng `next/dynamic` cho `PartialReturnTab`, `FullReturnTab`, `WaitingReturnTab`.
  - Chỉ fetch tab active.
  - Cache data theo tab trong local state để tránh gọi lại vô ích khi quay lại tab cũ.

## Xác thực

- Test đỏ/xanh cho `claim-detector`.
- Test đỏ/xanh cho `negative-revenue` route.
- Test helper tab/fetch cho `/returns`.
- Cuối phase chạy `npm run test:run` và `npm run build`.
