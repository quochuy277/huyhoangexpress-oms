import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MOJIBAKE_PATTERN = /Ãƒ|Ã‚|Ã¢â‚¬|Ã¡Âº|Ã¡Â»|Ã†Â°|Ã†Â¡/;

const FILE_EXPECTATIONS: Array<{ path: string; phrases: string[] }> = [
  {
    path: "src/components/delayed/DelayedClient.tsx",
    phrases: ["Chăm Sóc Đơn Hoãn", "Theo dõi đơn hoãn", "Đang tải delayed orders..."],
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
];

describe("delayed text encoding", () => {
  it.each(FILE_EXPECTATIONS)("keeps Vietnamese text readable in $path", ({ path: relativePath, phrases }) => {
    const absolutePath = path.join(process.cwd(), relativePath);
    const content = readFileSync(absolutePath, "utf8");

    expect(content).not.toMatch(MOJIBAKE_PATTERN);
    for (const phrase of phrases) {
      expect(content).toContain(phrase);
    }
  });
});
