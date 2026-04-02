# Header Announcement Preview Design

**Date:** 2026-04-02
**Target area:** Header notification bell
**Goal:** Khi người dùng bấm vào một thông báo trong chuông, hệ thống vừa đánh dấu đã đọc vừa mở popup hiển thị đầy đủ nội dung thông báo.

---

## Scope

- Áp dụng cho tab `Thông báo` trong chuông ở header.
- Hiển thị đầy đủ tiêu đề, nội dung rich text, người tạo, thời gian tạo và file đính kèm nếu có.
- Giữ nguyên API hiện tại; chỉ thay đổi UI và state client.

## Chosen Approach

- Tách popup xem chi tiết thông báo thành component dùng chung.
- Reuse component này ở cả khu quản trị thông báo và bell dropdown trên header.
- Khi user click một item trong bell dropdown:
  - Gọi API đánh dấu đã đọc.
  - Đóng dropdown chuông.
  - Mở popup xem chi tiết thông báo vừa chọn.

## Data Requirements

- Dùng dữ liệu hiện có từ `/api/announcements`.
- Bổ sung `attachmentUrl` vào kiểu dữ liệu phía header để popup có thể mở file đính kèm.
- Nội dung HTML phải render qua `sanitizeHtml`.

## UX Rules

- Popup hiển thị ở giữa màn hình, có overlay và nút đóng.
- Nội dung dài có thể scroll.
- Không hiển thị chuỗi lỗi mã hóa; toàn bộ label mới phải dùng tiếng Việt có dấu.
- Item chưa đọc vẫn giữ nền nổi bật trong danh sách trước khi người dùng bấm.

## Testing

- Thêm test component cho flow:
  - mở bell dropdown,
  - click thông báo,
  - gọi endpoint đánh dấu đã đọc,
  - mở popup với nội dung đầy đủ và file đính kèm.
- Thêm test encoding để khóa các file mới/chỉnh sửa không bị mojibake.
