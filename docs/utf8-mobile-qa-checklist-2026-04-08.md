# UTF-8 And Mobile QA Checklist 2026-04-08

## UTF-8 / Mojibake

- [ ] Không có chuỗi giao diện bị mất dấu tiếng Việt.
- [ ] Không có ký tự lạ hoặc Mojibake trong tiêu đề, label, placeholder, toast, dialog, empty state.
- [ ] Không có lỗi dấu trong header bảng, nhãn biểu đồ, badge trạng thái.
- [ ] Không có lỗi dấu trong API message có thể hiển thị ra giao diện.
- [ ] Không có lỗi dấu trong nội dung export CSV liên quan tới các file đã chạm.

## Mobile Layout

- [ ] Route hoạt động tốt tại `360px`.
- [ ] Route hoạt động tốt tại `375px`.
- [ ] Route hoạt động tốt tại `390px`.
- [ ] Route hoạt động tốt tại `768px`.
- [ ] Tab bar không tràn vỡ và vẫn cuộn được nếu cần.
- [ ] Filter/action bar không đẩy nội dung ra ngoài viewport.
- [ ] Dialog/drawer không vượt quá màn hình và không che thao tác chính.
- [ ] Bảng có hành vi cuộn ngang có kiểm soát nếu bắt buộc.
- [ ] Sticky header/pagination vẫn dùng được trên mobile.
