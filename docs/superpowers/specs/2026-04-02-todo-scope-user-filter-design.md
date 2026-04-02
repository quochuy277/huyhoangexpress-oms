# Todo Scope User Filter Design

**Date:** 2026-04-02
**Target area:** Trang Công việc
**Goal:** Mở rộng dropdown phạm vi công việc để `ADMIN` và `MANAGER` có thể lọc theo từng user có thể nhận việc.

---

## Scope

- Áp dụng cho dropdown phạm vi ở trang `Công việc`.
- Giữ lại 2 lựa chọn hiện có:
  - `Của tôi`
  - `Tất cả`
- Thêm danh sách từng user có thể nhận việc vào cùng dropdown.
- Khi chọn một user cụ thể, danh sách công việc và thẻ tổng quan phải đổi theo user đó.

## Chosen Approach

- Giữ nguyên control hiện tại, chỉ mở rộng option list.
- Dùng giá trị chọn dạng:
  - `mine`
  - `all`
  - `user:<id>`
- Client sẽ chuẩn hóa giá trị này thành:
  - `scope`
  - `assigneeId`

## Data Flow

- `TodosClient` lấy danh sách user từ `useTodoUsers(canViewAll)`.
- `useTodos` gửi thêm `assigneeId` khi đang chọn một user cụ thể.
- `/api/todos` hỗ trợ lọc theo `assigneeId`.
- `/api/todos/stats` hỗ trợ trả thêm thống kê cho `assigneeId` đang chọn.

## UX Rules

- Chỉ `ADMIN` và `MANAGER` thấy đầy đủ dropdown với danh sách user.
- `STAFF` và `VIEWER` giữ nguyên behavior hiện tại.
- Tên user hiển thị đúng ngay trong dropdown.
- Khi đổi lựa chọn:
  - reset về trang 1
  - giữ nguyên view list/kanban
  - giữ nguyên các bộ lọc khác

## Testing

- Thêm test unit cho helper parse scope và chọn assignee.
- Xác minh helper chọn đúng block stats cho `mine`, `all` và `user:<id>`.
