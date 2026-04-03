# Phase 0-1 Stability Design

## Mục tiêu

Thực hiện hai phase đầu của đợt hardening hiện tại:
- Phase 0: tạo baseline backup và khóa quy trình UTF-8 để tránh mojibake ở các file có tiếng Việt.
- Phase 1: hoàn tất các chốt phân quyền API còn sót trong các endpoint trọng yếu và xử lý race condition nhẹ ở xác nhận kho.

## Phạm vi

Bao gồm:
- Tạo thư mục backup có `git status`, `git diff` và bản copy các file dự kiến chỉnh sửa.
- Quét baseline các file Phase 1 để phát hiện chuỗi tiếng Việt nghi ngờ bị mojibake.
- Chuẩn hóa các endpoint Orders/Returns/Delayed/Upload/Export/Notes/Confirm/Warehouse sang helper permission chung.
- Giữ nguyên nguyên tắc `ADMIN` bypass nhất quán với middleware và finance auth.
- Sửa `warehouse/route.ts` theo hướng idempotent-safe: chỉ xác nhận kho khi bản ghi chưa được xác nhận.
- Sửa các chuỗi tiếng Việt trong những file Phase 1 nếu đang bị mojibake.

Không bao gồm trong Phase 0-1:
- Migration Prisma hoặc thay đổi schema.
- Tối ưu delayed/export sâu về hiệu năng.
- Optimistic concurrency đầy đủ cho Todo nếu cần thêm cột hoặc migration.

## Thiết kế kỹ thuật

- Dùng `requirePermission()` và `hasPermission()` làm nguồn chân lý duy nhất cho permission gate ở API.
- Với `warehouse/route.ts`, chuyển từ `update()` sang `updateMany()` có điều kiện `warehouseArrivalDate: null`, sau đó phân biệt rõ:
  - `404` nếu đơn không tồn tại
  - `409` nếu đơn đã được xác nhận kho trước đó
  - `200` nếu xác nhận thành công
- Tất cả chuỗi tiếng Việt bị chạm tới trong Phase 1 phải được lưu UTF-8 và hiển thị đầy đủ dấu.

## Xác thực

- TDD cho các nhánh RBAC và warehouse race condition.
- Chạy lại test liên quan sau khi sửa.
- Chạy `npm run build` ở cuối phase để kiểm tra regression cấp ứng dụng.
