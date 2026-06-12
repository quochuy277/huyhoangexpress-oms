# Claims Compensation Tab Redesign

**Date:** 2026-06-12
**Target area:** Trang Bồi Hoàn / Khiếu Nại — tab "Tổng hợp đền bù"
**Goal:** Tái cấu trúc tab Tổng hợp đền bù với bộ lọc đầy đủ, bộ thẻ số liệu mới định nghĩa thuần theo `claimStatus`, bảng chi tiết đền bù theo cửa hàng kèm modal drill-down theo từng đơn.

---

## Scope

- Giữ nguyên cấu trúc 3 tab của trang Claims (`ClaimsPageWrapper`) và toàn bộ tab 1 (Đơn có vấn đề), tab 2 (Công cụ).
- Chỉ thay đổi:
  - `src/components/claims/ClaimsCompensationTab.tsx`
  - `src/app/api/claims/compensation/route.ts`
  - Endpoint mới: `src/app/api/claims/compensation/details/route.ts`
  - Test liên quan đến hai phần trên.
- Không đổi schema database, không đổi quyền hạn, không đổi menu/sidebar.

## Bộ lọc đầu trang

- **Khoảng thời gian** (lọc theo `detectedDate`):
  - Preset nhanh: Tháng này, Quý này, Năm nay.
  - Tùy chọn: từ ngày – đến ngày (custom range).
  - Mặc định: **1/1 năm hiện tại → hôm nay** (year-to-date).
- **Cửa hàng:** dropdown một cửa hàng, nguồn từ `/api/claims/filter-options` (đã có cache phía server). Mặc định: tất cả cửa hàng.
- Bộ lọc áp dụng cho toàn trang: 7 thẻ số liệu, bảng cửa hàng, cả 2 biểu đồ, và modal chi tiết.

## Bảy thẻ số liệu

Định nghĩa thuần theo `claimStatus` (không dùng cờ `isCompleted`):

| Thẻ | Định nghĩa |
|---|---|
| Tổng số đơn có vấn đề | Tất cả claim trong kỳ lọc |
| Đơn đang xử lý | `claimStatus` ngoài nhóm `RESOLVED` / `CUSTOMER_COMPENSATED` / `CUSTOMER_REJECTED` (tức ngoài `COMPLETION_STATUSES`) |
| Đơn đã đền bù KH | `CUSTOMER_COMPENSATED` |
| Đơn từ chối ĐB | `CUSTOMER_REJECTED` |
| Tổng tiền đền bù | Tổng `customerCompensation` của đơn `CUSTOMER_COMPENSATED` |
| Chênh lệch lời/lỗ | Tổng `carrierCompensation` (đơn `CARRIER_COMPENSATED`) − tổng tiền đền bù KH. Dòng phụ ghi rõ hai con số gốc. |
| Đơn chờ đền bù | `claimStatus` thuộc `CARRIER_COMPENSATED` / `CARRIER_REJECTED` (NVC đã chốt, chưa quyết với KH) |

Ghi chú:
- Đơn trạng thái `RESOLVED` được đếm trong Tổng nhưng không xuất hiện ở thẻ đếm nào khác (hệ quả đã chấp nhận khi bỏ thẻ "Đã xử lý").
- Đơn chờ đền bù là tập con của Đơn đang xử lý.

## Bảng "Chi tiết đền bù theo cửa hàng"

Thay thế bảng "Đối soát theo Cửa hàng" hiện tại.

- Cột: Cửa Hàng | Tổng VĐ | Đang XL | Đã ĐB KH | Từ chối ĐB | Chờ ĐB | Tiền ĐB KH | Xem chi tiết.
- Hiển thị mọi cửa hàng có đơn có vấn đề trong kỳ lọc.
- Hàng **Tổng cộng** ở cuối bảng — số liệu phải khớp với 7 thẻ phía trên.
- Sắp xếp mặc định: Tổng VĐ giảm dần.
- Giữ ô tìm kiếm cửa hàng (lọc client-side trên bảng).
- Nút xuất file: nâng từ CSV lên **XLSX**, theo đúng các cột mới (theo pattern export XLSX đã dùng ở orders/delayed/returns).
- Responsive: bảng trên desktop, thẻ card trên mobile (giữ pattern `claims-compensation-shop-table` / `claims-compensation-shop-cards` hiện có).

## Modal "Xem chi tiết" theo từng đơn

- Mở từ nút "Xem chi tiết" của một dòng cửa hàng.
- Nội dung: danh sách đơn có vấn đề của cửa hàng đó trong kỳ lọc.
- Cột: STT | Mã YC | Ngày phát hiện | Loại VĐ | Trạng thái xử lý | Tiền NVC ĐB | Tiền ĐB KH (hai chiều tiền).
- Phân trang server-side, 20 đơn/trang.
- Kỹ thuật:
  - Overlay + `createPortal` theo pattern dialog sẵn có trong claims.
  - Lazy-load component bằng `dynamic import`.
  - Cache bằng React Query, key theo (shopName + dateFrom + dateTo + page), `staleTime` 5 phút.
  - Mobile: hiển thị toàn màn hình, các dòng chuyển dạng card.
- KHÔNG làm link mở `ClaimDetailDrawer` từ modal ở vòng này (tránh modal chồng modal; user finance có thể thiếu `canViewClaims`).

## Hai biểu đồ

- Giữ nguyên hình thức: bar chart "Tiền đền bù theo tháng" (2 series NVC/KH) và pie chart "Đơn KN theo loại vấn đề".
- Đổi nguồn dữ liệu: cả hai chạy theo bộ lọc trang (thời gian + cửa hàng). Bar chart bỏ cửa sổ cố định 6 tháng, vẽ các tháng nằm trong khoảng thời gian đã lọc.

## API

### `GET /api/claims/compensation` (sửa)

- Tham số mới: `dateFrom`, `dateTo` (ISO date), `shopName` (optional). Bỏ tham số `period`.
- Không truyền tham số → mặc định year-to-date, tất cả cửa hàng.
- Quyền: giữ nguyên `canViewCompensation || canViewFinancePage`.
- Tối ưu IO: gom về **một** `findMany` chọn các trường `claimStatus`, `carrierCompensation`, `customerCompensation`, `detectedDate`, `issueType`, `order.shopName`; tính toàn bộ summary + shops + monthlyData + issueDistribution từ một lượt dữ liệu (thay cho 5–6 query song song + raw SQL hiện tại).
- Shape response giữ 4 khối: `summary`, `shops`, `monthlyData`, `issueDistribution` (nội dung field theo định nghĩa mới).

### `GET /api/claims/compensation/details` (mới)

- Tham số: `shopName` (bắt buộc), `dateFrom`, `dateTo`, `page`, `pageSize` (mặc định 20).
- Quyền: `canViewCompensation || canViewFinancePage` (không dùng `canViewClaims`).
- Trả: danh sách claim của cửa hàng trong kỳ (requestCode, detectedDate, issueType, claimStatus, carrierCompensation, customerCompensation) + `pagination` (page, pageSize, total).

## Testing

- Cập nhật `src/__tests__/app/api/claims-compensation-route.test.ts` theo tham số và định nghĩa mới.
- Test mới cho route `details`: quyền hạn, lọc theo shop + khoảng ngày, phân trang.
- Test unit cho helper phân loại trạng thái (đang xử lý / đã ĐB / từ chối / chờ ĐB) và helper gộp số liệu theo shop.
- Cập nhật `src/__tests__/components/claimsCompensationResponsive.test.tsx` theo layout mới.
