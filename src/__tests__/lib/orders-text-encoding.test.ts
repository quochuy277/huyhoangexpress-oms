import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const MOJIBAKE_PATTERN = /ÃƒÂ¡|ÃƒÂ¢|ÃƒÂ£|ÃƒÂ¨|ÃƒÂ©|ÃƒÂª|ÃƒÂ¬|ÃƒÂ­|ÃƒÂ²|ÃƒÂ³|ÃƒÂ´|ÃƒÂµ|ÃƒÂ¹|ÃƒÂº|ÃƒÂ½|Ã„Â|Ã„â€˜|Ã†Â°|Ã†Â¡|Ã¡Âº|Ã¡Â»|Ã¢â‚¬|Ã¢â€ |Ã°Å¸|Ã¯Â¿Â½|ï¿½/;

const FILE_EXPECTATIONS: Array<{ path: string; phrases: string[] }> = [
  {
    path: "src/app/(dashboard)/orders/page.tsx",
    phrases: ["Quản Lý Đơn Hàng"],
  },
  {
    path: "src/components/orders/OrdersClient.tsx",
    phrases: ["Quản Lý Đơn Hàng", "Tìm kiếm, lọc và quản lý toàn bộ đơn hàng", "Đang tải tab..."],
  },
  {
    path: "src/components/orders/OrderTable.tsx",
    phrases: [
      "Mã yêu cầu",
      "Mã đơn đối tác",
      "Thông tin người nhận",
      "Không tìm thấy đơn hàng nào",
      "Đang cập nhật...",
    ],
  },
  {
    path: "src/components/orders/OrderStaffNoteDialog.tsx",
    phrases: ["Ghi chú nội bộ", "Lưu ghi chú", "Đóng"],
  },
  {
    path: "src/components/orders/OrderFilters.tsx",
    phrases: [
      "Nhập mã yêu cầu, mã đối tác, SĐT... (Shift+Enter thêm dòng, tối đa 50 mã)",
      "Mặc định chỉ hiển thị đơn trong 30 ngày gần nhất.",
      "Tất cả trạng thái",
      "Tất cả cửa hàng",
      "Nâng cao",
    ],
  },
  {
    path: "src/app/api/orders/route.ts",
    phrases: ["Chưa đăng nhập", "Bạn không có quyền xem đơn hàng", "Tham số không hợp lệ"],
  },
  {
    path: "src/app/api/orders/auto-import/route.ts",
    phrases: [
      "Thiếu file trong form data",
      "File quá lớn. Kích thước tối đa: 10MB",
      "Định dạng file không hỗ trợ. Chỉ chấp nhận .xlsx và .xls",
    ],
  },
  {
    path: "src/components/orders/ExcelUpload.tsx",
    phrases: [
      "Tải lên hoàn tất một phần",
      "Tải lên thành công!",
      "Tải lên thất bại",
      "Đang xử lý file Excel...",
    ],
  },
];

describe("orders text encoding", () => {
  it.each(FILE_EXPECTATIONS)("keeps Vietnamese text readable in $path", ({ path: relativePath, phrases }) => {
    const absolutePath = path.join(process.cwd(), relativePath);
    const content = readFileSync(absolutePath, "utf8");

    expect(content).not.toMatch(MOJIBAKE_PATTERN);
    for (const phrase of phrases) {
      expect(content).toContain(phrase);
    }
  });
});
