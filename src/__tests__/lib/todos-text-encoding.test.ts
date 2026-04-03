import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function decodeUnicodeEscapes(input: string) {
  return input.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}

const TODO_FILES: Array<{ path: string; phrases: string[] }> = [
  {
    path: "src/components/todos/TodoQuickAdd.tsx",
    phrases: ["Thêm việc nhanh... (Enter)"],
  },
  {
    path: "src/components/todos/TodosClient.tsx",
    phrases: ["Công việc", "Quản lý và theo dõi công việc", "Của tôi", "Tất cả", "Thêm mới"],
  },
  {
    path: "src/components/todos/TodoFilters.tsx",
    phrases: ["Tìm kiếm...", "Bộ lọc", "Nguồn: Tất cả", "Ưu tiên: Tất cả", "Đặt lại", "Ẩn hoàn thành"],
  },
  {
    path: "src/components/todos/TodoSummaryCards.tsx",
    phrases: ["Tổng việc hôm nay", "Quá hạn", "Đang làm", "Hoàn thành tuần này"],
  },
  {
    path: "src/components/todos/TodoReminderBanner.tsx",
    phrases: ["quá hạn", "đến hạn hôm nay"],
  },
  {
    path: "src/components/todos/constants.ts",
    phrases: ["Khẩn cấp", "Trung bình", "Cần làm", "Thủ công", "Đơn hoàn", "Khiếu nại", "Tất cả", "Không có thời hạn"],
  },
  {
    path: "src/components/todos/DeleteConfirmDialog.tsx",
    phrases: ["Xóa công việc?", "Hủy", "Đang xóa..."],
  },
  {
    path: "src/components/todos/TodoDetailPanel.tsx",
    phrases: [
      "Chi tiết công việc",
      "Mô tả",
      "Mức ưu tiên",
      "Trạng thái",
      "Thời hạn",
      "Người phụ trách",
      "Đơn hàng liên kết",
      "Ghi chú",
      "Mở lại",
    ],
  },
  {
    path: "src/components/todos/TodoListView.tsx",
    phrases: ["Chưa có công việc nào", "Tiêu đề", "Mã đơn", "Ưu tiên", "Trạng thái", "Người PT", "Nguồn"],
  },
  {
    path: "src/components/todos/TodoKanbanView.tsx",
    phrases: ["Cần làm", "Đang làm", "Hoàn thành"],
  },
  {
    path: "src/hooks/useTodos.ts",
    phrases: ["Có lỗi xảy ra. Vui lòng thử lại."],
  },
];

const MOJIBAKE_PATTERN = /Ã|âœ|â|ðŸ|áº|á»|Æ°|Ä‘|Ä|HoÃ|ThÃ|QuÃ|Nguá»|Bá»|kiáº/;
const UNICODE_ESCAPE_PATTERN = /\\u[0-9a-fA-F]{4}/;

describe("todos text encoding", () => {
  it.each(TODO_FILES)("keeps Vietnamese text readable in $path", ({ path: relativePath, phrases }) => {
    const absolutePath = path.join(process.cwd(), relativePath);
    const content = readFileSync(absolutePath, "utf8");
    const readableContent = decodeUnicodeEscapes(content);

    expect(readableContent).not.toMatch(MOJIBAKE_PATTERN);
    if (relativePath.startsWith("src/components/todos/")) {
      expect(content).not.toMatch(UNICODE_ESCAPE_PATTERN);
    }
    for (const phrase of phrases) {
      expect(readableContent).toContain(phrase);
    }
  });
});
