# Kế Hoạch Triển Khai Trang Delayed Theo Phương Án 2

## Tóm tắt
Triển khai theo hướng giữ trải nghiệm desktop dạng table, còn mobile dưới `768px` chuyển sang card-first UI với filter drawer hoặc bottom-sheet, đồng thời sửa các lỗi correctness, security và tái cấu trúc luồng dữ liệu delayed để số liệu phân tích, filter, export và pagination nhất quán.

Mục tiêu:
- chặn rò rỉ dữ liệu qua API delayed,
- loại bỏ sai lệch dữ liệu do paginate kép và chart hoặc export theo page hiện tại,
- giảm chi phí query và CPU trên Vercel với Supabase,
- cải thiện thao tác mobile cho delayed, detail, note, todo, claim, tracking.

## Thay đổi chính
### 1. Security và correctness
- Thêm kiểm tra `session.user.permissions.canViewDelayed` trong API delayed; user không có quyền nhận `403`.
- Bỏ hardcode `userRole="ADMIN"` khi mở order detail từ delayed; role thực lấy từ session hoặc page props.
- Sửa `InlineStaffNote` theo hướng save có kiểm soát:
  - không cập nhật trạng thái “đã lưu” trước khi PATCH thành công,
  - nếu lỗi thì rollback về giá trị cũ,
  - hiển thị lỗi ngắn gọn tại chỗ hoặc toast nhẹ,
  - không nuốt lỗi im lặng.
- Bỏ phân trang nội bộ trong bảng delayed; chỉ còn một nguồn phân trang ở tầng page hoặc API.
- Không gọi `setState` trong render path của bảng.

### 2. Dữ liệu delayed, API và hiệu năng
- Tách rõ 3 lớp dữ liệu:
  - `rows`: danh sách đơn đã paginate để hiển thị bảng hoặc card.
  - `summary`: tổng số, risk counts, COD tổng, COD risk cao cho toàn bộ tập lọc.
  - `facets`: options cho shop, status, reason và phân bố delay hoặc reason cho toàn bộ tập lọc.
- `GET /api/orders/delayed` đổi response shape để trả đồng thời `rows`, `summary`, `facets`, `pagination`.
- Search hoặc filter ở page dùng URL state làm nguồn sự thật; debounce search trước khi gọi API.
- Gộp reset filter thành một lần cập nhật URL hoặc query, không bắn nhiều request liên tiếp.
- Tối ưu delayed route:
  - giữ filter SQL được trong Prisma ở DB,
  - chỉ `select` field thật sự cần cho delayed list hoặc facets,
  - không fetch thừa dữ liệu detail,
  - không để chart hoặc export phụ thuộc page hiện tại.
- Export delayed chuyển sang endpoint riêng dùng cùng filter hiện tại nhưng lấy toàn bộ tập lọc, không export từ mảng đang render.
- Giữ polling 5 phút như hiện tại cho desktop page, nhưng tránh refetch vô ích khi người dùng đang gõ tìm kiếm.

### 3. Responsive hoặc mobile theo Option 2
- Tạo helper responsive riêng cho delayed, bám pattern hiện có ở orders hoặc finance.
- Breakpoint mặc định: mobile `<768px`, tablet hoặc desktop `>=768px`.
- Desktop:
  - giữ `DelayedOrderTable`,
  - filter bar hiện inline như hiện tại nhưng đồng bộ dữ liệu đúng,
  - charts hiển thị 2 cột nếu đủ rộng.
- Mobile:
  - thay table bằng delayed mobile card list,
  - mỗi card hiển thị: `requestCode`, `shopName`, người nhận cộng SĐT, `delayCount`, risk badge, COD, 1-2 lý do chính, ngày tạo hoặc tuổi đơn,
  - actions dạng hàng ngang lớn, dễ bấm: `Chi tiết`, `Tracking`, `Todo`, `Claim`,
  - inline note trên card đổi thành expand editor hoặc mở note sheet nhỏ; không giữ textarea mini dày đặc trong list.
- Filter mobile:
  - header có nút `Lọc`,
  - filter mở dạng bottom sheet hoặc drawer,
  - có khu `đang áp dụng` dạng chips,
  - có `Xóa bộ lọc` và `Áp dụng`.
- Stats hoặc charts mobile:
  - stats cards hiển thị `2x2`,
  - charts nằm trong accordion hoặc tab `Thống kê` / `Lý do` để giảm chiều dài trang,
  - labels ngắn hơn để tránh tràn.
- Modal hoặc popup mobile:
  - `OrderDetailDialog`, `TrackingPopup`, `AddTodoDialog`, `AddClaimFromPageDialog` chuyển sang full-screen sheet hoặc near-fullscreen panel trên mobile,
  - giữ desktop dialog hiện tại trên màn hình lớn.

## API, interface và type cần chốt
- `GET /api/orders/delayed` dùng shape ổn định:
  - `rows: ProcessedDelayedOrder[]`
  - `summary: { total, high, medium, low, totalCOD, highCOD }`
  - `facets: { shops, statuses, reasons, delayDistribution, reasonDistribution }`
  - `pagination: { page, pageSize, total, totalPages }`
- Thêm type riêng cho delayed response thay vì để page dùng inline anonymous type.
- Tách model hiển thị mobile card nếu cần, nhưng ưu tiên tái dùng `ProcessedDelayedOrder`.
- Không đổi contract của note PATCH ngoài việc chuẩn hóa error handling client-side.
- Role hoặc permission truyền xuống delayed page từ session thực; không tạo quyền mới.

## Kế hoạch test và tiêu chí chấp nhận
### Test tự động
- API delayed:
  - trả `403` nếu user không có `canViewDelayed`,
  - trả đúng `summary`, `facets`, `pagination` theo filter,
  - không làm chart hoặc filter options phụ thuộc page hiện tại.
- UI delayed:
  - không còn paginate kép,
  - debounce search không bắn request mỗi ký tự,
  - reset filter chỉ đưa page về `1` và xóa query một lần,
  - mobile helper trả đúng class, breakpoint, card mode.
- `InlineStaffNote`:
  - save thành công cập nhật giá trị mới,
  - save thất bại rollback về giá trị cũ,
  - hiển thị trạng thái lỗi.
- `delay-analyzer`:
  - parse reason, count, risk đúng với note mẫu delayed thực tế.

### Kiểm tra thủ công
- Desktop:
  - bảng, stats, charts, export cùng một tập dữ liệu,
  - đổi page không làm đổi options filter tổng,
  - detail, tracking, todo, claim mở đúng quyền.
- Mobile:
  - danh sách delayed dùng card, không cần kéo ngang,
  - filter drawer thao tác được bằng một tay,
  - note, todo, claim, tracking, detail không vỡ layout ở chiều rộng 360–430px,
  - actions chính bấm dễ, không chồng lấn.
- Hiệu năng:
  - thời gian phản hồi delayed route giảm so với bản hiện tại trên cùng bộ lọc,
  - số request khi gõ tìm kiếm giảm rõ rệt,
  - không có warning React do setState trong render.

## Giả định đã chốt
- Chốt **Option 2**: desktop table, mobile card-first.
- Breakpoint mobile dùng chuẩn đang có trong repo: `<768px`.
- Không bổ sung quyền mới; dùng lại `canViewDelayed` và `canEditStaffNotes`.
- Chưa thêm migration DB ở vòng đầu; ưu tiên refactor query và response shape trước.
- Nếu sau khi đo mà delayed route vẫn chậm trên dữ liệu lớn, phase tiếp theo sẽ chuẩn hóa snapshot hoặc metadata delay trong DB.
