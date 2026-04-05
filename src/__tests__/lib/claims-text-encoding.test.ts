import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const MOJIBAKE_PATTERN = /Ãƒ|Ã‚|Ã¢â‚¬|Ã¡Âº|Ã¡Â»|Ã†Â°|Ã†Â¡/;

const FILE_EXPECTATIONS: Array<{ path: string; phrases: string[] }> = [
  {
    path: "src/hooks/useClaimsList.ts",
    phrases: ["Không thể tải danh sách claims", "Không thể tải bộ lọc claims"],
  },
  {
    path: "src/hooks/useClaimMutations.ts",
    phrases: [
      "File export chỉ bao gồm",
      "Lỗi khi xuất file Excel. Vui lòng thử lại.",
      "Cập nhật thất bại. Dữ liệu đã được khôi phục.",
    ],
  },
  {
    path: "src/components/claims/ClaimsClient.tsx",
    phrases: [
      "Tìm mã yêu cầu, mã đối tác, SĐT hoặc 4 số cuối SĐT...",
      "Mặc định chỉ tìm trong 30 ngày gần nhất.",
      "Đã có trong Đơn có vấn đề",
      "Không tìm thấy đơn hàng nào",
    ],
  },
  {
    path: "src/components/shared/AddClaimFromPageDialog.tsx",
    phrases: ["Chuyển vào Đơn Có Vấn Đề", "Vui lòng chọn Loại Vấn Đề", "Lỗi kết nối"],
  },
  {
    path: "src/app/api/claims/route.ts",
    phrases: ["Chưa đăng nhập", "Thiếu thông tin bắt buộc", "Đơn đã có trong Đơn có vấn đề"],
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
    phrases: ["Đơn đã có trong Đơn có vấn đề", "Mở chi tiết để sửa", "Thoát không lưu"],
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
