# Finance Mobile Responsive Design

**Context**

Trang `Tài chính` hiện đang dựng theo hướng desktop-first với nhiều inline style cố định. Trên mobile, các vấn đề chính là:
- Thanh tab và bộ lọc bị chật, dễ vỡ hàng và khó bấm.
- KPI cards, chart container, bảng dữ liệu và dialog chưa tối ưu cho màn hình nhỏ.
- Nhiều bảng lớn chỉ dựa vào cuộn ngang, làm UX đọc và thao tác kém trên điện thoại.

**Goal**

Tối ưu UX cho trang `Tài chính` trên mobile bằng responsive layout theo hướng:
- Giữ trải nghiệm desktop hiện tại cho màn hình lớn.
- Chuyển các bảng lớn trên mobile sang `summary + card/accordion`.
- Không làm tăng số lượng request tới API hiện có.
- Không thêm polling, websocket, query mới hoặc logic render nặng gây ảnh hưởng hiệu năng trên Vercel và Supabase.

**Non-Goals**

- Không thay đổi business logic của dữ liệu tài chính.
- Không đổi schema database hoặc API contract.
- Không đại tu toàn bộ trang sang kiến trúc CSS mới.
- Không thêm animation phức tạp hoặc thư viện UI mới.

**Constraints**

- Tiếp tục dùng các endpoint hiện có trong `src/app/api/finance/*`.
- Giữ cơ chế lazy mount tab hiện tại trong `FinancePageClient`.
- Mọi thay đổi phải ưu tiên render nhẹ, không tạo thêm fetch và không tăng tần suất invalidate query.
- Mobile-first ở tầng layout và information hierarchy, nhưng desktop phải tiếp tục dùng được như hiện tại.

## Architecture Direction

Thay vì tách riêng một mobile page, trang sẽ dùng kiến trúc responsive thích ứng trong cùng component tree:
- Desktop và tablet lớn tiếp tục hiển thị chart/table như hiện tại.
- Mobile hiển thị các khối dữ liệu lớn ở dạng card list hoặc accordion với phần tóm tắt nổi bật và phần chi tiết ẩn.
- Các cụm điều khiển như tab, period switcher, view switcher và filter chuyển sang kiểu wrap/stack hoặc horizontal scroll để tăng khả năng chạm.

Hướng này giảm rủi ro lệch logic giữa desktop và mobile, đồng thời giới hạn thay đổi chủ yếu ở lớp render và style.

## Component Design

### 1. FinancePageClient

**Current issues**
- Padding tổng thể lớn cho mobile.
- Tab navigation chỉ hợp với desktop, thiếu trạng thái cuộn ngang.

**Design**
- Giảm padding ngang cho mobile.
- Header co gọn, vẫn giữ tiêu đề trang.
- Thanh tab chuyển sang dạng pill button trong container cuộn ngang.
- Tăng kích thước vùng chạm của tab, giữ lazy mount theo tab để không tăng chi phí render ban đầu.

### 2. OverviewTab

**Current issues**
- Period filter, P&L filter và custom date dễ vỡ hàng.
- KPI cards và chart section chưa có nhịp dọc phù hợp mobile.
- Bảng P&L, quản lý khoản chi và ngân sách tháng quá rộng cho điện thoại.

**Design**
- Period switcher chuyển sang cụm nút có thể wrap hoặc cuộn ngang.
- Custom date inputs xếp dọc trên mobile.
- KPI cards dùng grid 1 cột ở mobile, nhiều cột dần theo breakpoint lớn hơn.
- Chart giảm chiều cao trên mobile, giảm mật độ tick/label nếu cần.
- P&L:
  - Desktop: giữ table.
  - Mobile: hiển thị theo section accordion gồm `Doanh thu`, `Chi phí trực tiếp`, `Chi phí vận hành`, `Lợi nhuận`.
  - Luôn giữ số tổng nổi bật ở đầu mỗi section.
- Expense Management:
  - Desktop: giữ table.
  - Mobile: mỗi khoản chi là một card, hiển thị ngày, danh mục, số tiền, tên khoản chi; phần note và action nằm trong vùng mở rộng hoặc footer card.
- Monthly Budget:
  - Desktop: giữ table.
  - Mobile: mỗi danh mục là một card với ngân sách, đã chi, còn lại, progress bar và trạng thái.
- Dialog:
  - Giảm padding trên mobile.
  - Giới hạn chiều cao hợp lý và bảo đảm vùng thao tác cuối form không bị khuất.

### 3. AnalysisTab

**Current issues**
- Period filter, view switcher và custom date đang tranh chỗ theo chiều ngang.
- Các bảng carrier/shop/negative revenue rất rộng.
- Search input và granularity control chưa tối ưu cho mobile.

**Design**
- Tách vùng filter thành các block dọc rõ ràng trên mobile.
- View switcher dùng pill group có thể cuộn ngang.
- Carrier comparison:
  - Desktop: giữ table + chart.
  - Mobile: mỗi carrier là card chứa tên đối tác, số đơn, doanh thu, margin, số đơn lỗ và COD tổng.
- Shop ranking:
  - Desktop: giữ table.
  - Mobile: mỗi shop là card với doanh thu, xu hướng, số đơn, delivery rate, return rate, COD và phí trung bình.
- Negative revenue:
  - Desktop: giữ table.
  - Mobile: mỗi đơn là card với request code, carrier, shop, trạng thái, doanh thu âm và COD; request code tiếp tục mở dialog chi tiết.
- Alert cards cho shop giảm đơn tiếp tục hiển thị dạng stack card nhưng tối ưu spacing và font cho mobile.
- Chart khuynh hướng top shops giữ lại, nhưng header và granularity controls phải wrap tốt trên mobile.

### 4. CashbookTab

**Current issues**
- Upload area, lịch sử upload, bảng giao dịch và bảng tổng hợp trả shop đều quá rộng cho mobile.
- Group filter dạng chip và pagination chưa tối ưu khi thiếu chiều ngang.

**Design**
- Upload area xếp dọc, nút upload rộng và dễ bấm.
- Upload history trong `details` giữ lại nhưng table con phải có fallback card hoặc khối thông tin đơn giản ở mobile nếu cần.
- Summary cards dùng grid thích ứng như Overview.
- Transaction list:
  - Desktop: giữ table.
  - Mobile: card cho từng giao dịch, nổi bật thời gian, nhóm, số tiền, tồn và nội dung.
- Group filter chip cho phép wrap nhiều dòng.
- Pagination chuyển sang bố cục dọc trên mobile, tránh ép ngang.
- Shop payout summary:
  - Desktop: giữ table.
  - Mobile: card theo shop với số lần đối soát, tổng đã trả, phí chuyển khoản và lần gần nhất.

## Performance and Data Strategy

- Không thêm endpoint mới.
- Không thêm request song song mới so với hiện trạng.
- Không thay đổi query key chính đang được dùng trừ khi cần cho test hoặc ổn định render.
- Ưu tiên tách helper render thuần để chọn giao diện mobile/desktop thay vì tạo state và effect không cần thiết.
- Với chart:
  - Chỉ thay đổi container size và label density.
  - Không thêm xử lý tính toán dữ liệu nặng ở client.
- Với mobile card views:
  - Dùng dữ liệu đã fetch sẵn từ cùng nguồn hiện có.
  - Accordion hoặc details chỉ quản lý mở/đóng cục bộ, không gắn thêm network event.

## Testing Strategy

- Viết test trước cho các nhánh render quan trọng:
  - Tab container và responsive wrapper ở `FinancePageClient`.
  - Render fallback card/accordion cho các bảng lớn khi ở chế độ mobile.
  - Giữ table view cho desktop.
- Nếu môi trường test hiện tại chưa có test cho UI component, bổ sung test Vitest tối thiểu theo hướng render logic và conditional branches thay vì test pixel styling.
- Sau khi triển khai, chạy test liên quan và build/lint ở mức khả thi trong workspace hiện tại.

## Risks

- Các component hiện đang dài và dùng nhiều inline style, nên sửa responsive dễ làm file phình hơn nếu không tách helper hợp lý.
- Recharts có thể hiển thị chật trên viewport rất nhỏ; cần giảm chiều cao và tránh label dài.
- Nếu render mobile/desktop bằng điều kiện dựa trên JS runtime không cẩn thận, có thể phát sinh mismatch hoặc logic phức tạp. Cần ưu tiên CSS-friendly layout và render structure đơn giản.

## Success Criteria

- Người dùng mobile có thể chuyển tab, lọc kỳ và thao tác chính mà không phải zoom màn hình.
- Các bảng lớn trên mobile không còn phụ thuộc chủ yếu vào cuộn ngang.
- Thông tin tài chính chính vẫn đọc được nhanh trong 1 cột dọc.
- Không phát sinh thêm request API trong các luồng hiện có.
- Desktop không bị regression đáng kể về cấu trúc và khả năng sử dụng.
