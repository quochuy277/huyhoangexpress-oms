import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const MOJIBAKE_PATTERN =
  /ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢|ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡|ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬|ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âº|ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»|ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°|ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡/;

function decodeUnicodeEscapes(input: string) {
  return input.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}

const FILE_EXPECTATIONS: Array<{ path: string; phrases: string[] }> = [
  {
    path: "src/components/delayed/DelayedClient.tsx",
    phrases: ["Chăm Sóc Đơn Hoàn", "Theo dõi đơn hoàn", "Đang tải delayed orders..."],
  },
  {
    path: "src/components/delayed/DelayedFilterPanel.tsx",
    phrases: ["Tìm kiếm và lọc delayed", "Tất cả cửa hàng", "Bộ lọc delayed", "Áp dụng"],
  },
  {
    path: "src/components/delayed/DelayedOrderTable.tsx",
    phrases: ["Mã Yêu Cầu", "Không tìm thấy đơn hàng delayed", "Chi tiết", "Người nhận"],
  },
  {
    path: "src/components/delayed/DelayedStatsCards.tsx",
    phrases: ["Tổng đơn hoãn", "Nguy cơ cao", "Cảnh báo", "Nguy cơ thấp"],
  },
  {
    path: "src/components/delayed/DelayDistributionChart.tsx",
    phrases: ["Phân bố số lần hoãn giao", "Chưa có dữ liệu", "Số lượng"],
  },
  {
    path: "src/components/delayed/DelayReasonChart.tsx",
    phrases: ["Top lý do hoãn giao", "Chưa có dữ liệu", "Tần suất"],
  },
  {
    path: "src/components/shared/InlineStaffNote.tsx",
    phrases: ["Không thể lưu ghi chú", "Đang lưu...", "Click để sửa ghi chú", "Ghi chú..."],
  },
  {
    path: "src/components/shared/AddTodoDialog.tsx",
    phrases: [
      "Th\u00eam v\u00e0o C\u00f4ng Vi\u1ec7c",
      "Ti\u00eau \u0111\u1ec1 c\u00f4ng vi\u1ec7c",
      "\u0110\u00e3 t\u1ea1o c\u00f4ng vi\u1ec7c th\u00e0nh c\u00f4ng",
    ],
  },
  {
    path: "src/components/shared/AddClaimFromPageDialog.tsx",
    phrases: ["Chuyển vào Đơn Có Vấn Đề", "Loại Vấn Đề", "Nội Dung Vấn Đề"],
  },
  {
    path: "src/components/tracking/TrackingPopup.tsx",
    phrases: ["Hành trình đơn hàng", "Làm mới", "Đóng"],
  },
  {
    path: "src/components/todos/TodoDetailPanel.tsx",
    phrases: ["Chi tiết công việc", "Mô tả", "Hoàn thành"],
  },
];

describe("delayed text encoding", () => {
  it.each(FILE_EXPECTATIONS)("keeps Vietnamese text readable in $path", ({ path: relativePath, phrases }) => {
    const absolutePath = path.join(process.cwd(), relativePath);
    const content = readFileSync(absolutePath, "utf8");
    const readableContent = decodeUnicodeEscapes(content);

    expect(readableContent).not.toMatch(MOJIBAKE_PATTERN);
    for (const phrase of phrases) {
      expect(readableContent).toContain(phrase);
    }
  });
});
