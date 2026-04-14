import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const MOJIBAKE_PATTERN = /(?:Ã.|Ä.|á»|áº|â€|Â.)/;

function decodeUnicodeEscapes(input: string) {
  return input.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}

const FILE_EXPECTATIONS: Array<{ path: string; phrases: string[] }> = [
  {
    path: "src/components/delayed/DelayedClient.tsx",
    phrases: ["Chăm Sóc Đơn Hoãn", "Theo dõi đơn hoãn", "Đang tải danh sách đơn hoãn..."],
  },
  {
    path: "src/components/delayed/DelayedFilterPanel.tsx",
    phrases: [
      "Tìm kiếm và lọc đơn hoãn",
      "Tất cả cửa hàng",
      "Bộ lọc đơn hoãn",
      "Áp dụng",
      "Đang áp dụng bộ lọc...",
    ],
  },
  {
    path: "src/components/delayed/DelayedOrderTable.tsx",
    phrases: ["Mã Yêu Cầu", "Không tìm thấy đơn hàng delayed", "Chi tiết", "Người nhận", "Đang cập nhật..."],
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
    phrases: ["Không thể lưu ghi chú", "Đang lưu...", "Nhấn để sửa ghi chú", "Ghi chú..."],
  },
  {
    path: "src/components/shared/AddTodoDialog.tsx",
    phrases: ["Thêm vào Công Việc", "Tiêu đề công việc", "Đã tạo công việc thành công"],
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
    path: "src/components/shared/OrderDetailDialog.tsx",
    phrases: ["Chi Tiết Đơn Hàng", "Trạng Thái Gốc", "Ghi Chú", "Xử lý đơn"],
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

