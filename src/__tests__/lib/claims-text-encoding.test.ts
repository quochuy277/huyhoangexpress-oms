import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const MOJIBAKE_PATTERN = /Ãƒ|Ã‚|Ã¢â‚¬|Ã¡Âº|Ã¡Â»|Ã†Â°|Ã†Â¡|Ä|Ä‘|ðŸ|�/;

const FILE_EXPECTATIONS: Array<{ path: string; phrases: string[] }> = [
  {
    path: "src/hooks/useClaimsList.ts",
    phrases: ["Không thể tải danh sách đơn có vấn đề", "Không thể tải bộ lọc đơn có vấn đề"],
  },
  {
    path: "src/hooks/useClaimMutations.ts",
    phrases: [
      "File export chỉ bao gồm",
      // Sprint 2 (2026-04): claims export switched from XLSX to streamed CSV;
      // the user-visible error copy was simplified to "Lỗi khi xuất file".
      "Lỗi khi xuất file. Vui lòng thử lại.",
      "Cập nhật thất bại. Dữ liệu đã được khôi phục.",
    ],
  },
  {
    path: "src/components/claims/ClaimsPageWrapper.tsx",
    phrases: ["Đơn có vấn đề", "Công cụ", "Tổng hợp đền bù", "Các tab đơn có vấn đề", "Đang chuẩn bị danh sách đơn có vấn đề..."],
  },
  {
    path: "src/components/claims/ClaimsClient.tsx",
    phrases: [
      "Cập nhật trạng thái khiếu nại",
      "Chọn tất cả đơn khiếu nại",
      "Cập nhật loại vấn đề",
      "Nội dung vấn đề",
      "Cập nhật nội dung xử lý",
      "Cập nhật thời hạn",
      "Tra cứu",
      "Thời hạn",
    ],
  },
  {
    path: "src/components/claims/AddClaimDialog.tsx",
    phrases: [
      "Tìm đơn hàng",
      "Thêm vào Đơn có vấn đề",
      "Không tìm thấy đơn hàng nào",
      "Tìm đơn hàng để thêm vào đơn có vấn đề",
      "Loại vấn đề của đơn",
      "Trạng thái xử lý đơn có vấn đề",
      "Nội dung vấn đề của đơn",
      "Thời hạn xử lý đơn có vấn đề",
    ],
  },
  {
    path: "src/components/claims/claims-table/ClaimsToolbar.tsx",
    phrases: [
      "Đơn có vấn đề",
      "Quét tự động đơn có vấn đề",
      "Thêm mới đơn có vấn đề",
    ],
  },
  {
    path: "src/components/claims/claims-table/ClaimsFiltersBar.tsx",
    phrases: [
      "Tìm mã đơn, SĐT, shop...",
      "Tìm kiếm đơn có vấn đề",
      "Tất cả TT xử lý",
      "Chưa hoàn tất",
      "Đã hoàn tất",
    ],
  },
  {
    path: "src/components/claims/ClaimsToolsTab.tsx",
    phrases: [
      "Tìm kiếm lịch sử đơn có vấn đề",
      "Lọc hành động đơn có vấn đề",
      "Lọc nhân viên xử lý đơn có vấn đề",
      "Từ ngày lịch sử đơn có vấn đề",
      "Đến ngày lịch sử đơn có vấn đề",
    ],
  },
  {
    path: "src/app/api/claims/route.ts",
    phrases: ["Chưa đăng nhập", "Thiếu thông tin bắt buộc", "Đơn đã có trong Đơn có vấn đề"],
  },
  {
    path: "src/app/api/claims/filter-options/route.ts",
    phrases: ["Chưa đăng nhập", "Lỗi hệ thống"],
  },
  {
    path: "src/app/api/claims/search-orders/route.ts",
    phrases: ["Chưa đăng nhập", "Lỗi hệ thống"],
  },
  {
    path: "src/lib/claims-permissions.ts",
    phrases: ["Không có quyền"],
  },
  {
    path: "src/lib/confirm-dialog.ts",
    phrases: ["Đơn đã có trong Đơn có vấn đề", "Mở chi tiết để sửa", "Thoát không lưu", "Xóa nhiều đơn có vấn đề"],
  },
];

describe("claims text encoding", () => {
  it.each(FILE_EXPECTATIONS)("keeps Vietnamese labels readable in $path", ({ path: relativePath, phrases }) => {
    const absolutePath = path.join(process.cwd(), relativePath);
    const content = readFileSync(absolutePath, "utf8");

    expect(content).not.toMatch(MOJIBAKE_PATTERN);
    for (const phrase of phrases) {
      expect(content).toContain(phrase);
    }
  });
});

