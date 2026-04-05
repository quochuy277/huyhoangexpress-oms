import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const MOJIBAKE_PATTERN = /Ã¡|Ã¢|Ã£|Ã¨|Ã©|Ãª|Ã¬|Ã­|Ã²|Ã³|Ã´|Ãµ|Ã¹|Ãº|Ã½|Ä|Ä‘|Æ°|Æ¡|áº|á»|â€|â†|ðŸ|ï¿½|�/;

const FILE_EXPECTATIONS: Array<{ path: string; phrases: string[] }> = [
  {
    path: "src/components/orders/OrdersClient.tsx",
    phrases: ["Quản Lý Đơn Hàng", "Tìm kiếm, lọc và quản lý toàn bộ đơn hàng", "Đang tải tab..."],
  },
  {
    path: "src/components/orders/OrderFilters.tsx",
    phrases: [
      "Tìm mã yêu cầu, mã đối tác, SĐT hoặc 4 số cuối SĐT...",
      "Mặc định chỉ hiển thị đơn trong 30 ngày gần nhất.",
      "Tất cả trạng thái",
      "Tất cả đối tác",
      "Nâng cao",
    ],
  },
  {
    path: "src/components/orders/OrderTable.tsx",
    phrases: ["Mã Yêu Cầu", "Mã Đơn Đối Tác", "Không tìm thấy đơn hàng nào", "Đang cập nhật..."],
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
