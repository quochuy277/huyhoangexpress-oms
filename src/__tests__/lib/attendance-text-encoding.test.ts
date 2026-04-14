import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ATTENDANCE_FILES = [
  {
    path: "src/components/attendance/AttendancePageWrapper.tsx",
    phrases: ["Chấm Công Của Tôi", "Quản Lý Chấm Công"],
  },
  {
    path: "src/components/attendance/MyAttendanceTab.tsx",
    phrases: ["Đang online", "Lịch sử đăng nhập", "Xin nghỉ phép", "Chưa có lịch sử"],
  },
  {
    path: "src/components/attendance/IdleLogoutProvider.tsx",
    phrases: ["Cảnh báo không hoạt động", "Tiếp tục làm việc", "Sắp đến giờ đăng xuất tự động"],
  },
];

const MOJIBAKE_PATTERN = /Ã|âœ|â|ðŸ|áº|á»|Æ°|Ä‘|Ä|Cháº|Ä‘Äƒ/;

describe("attendance text encoding", () => {
  it.each(ATTENDANCE_FILES)("keeps Vietnamese labels readable in $path", ({ path: relativePath, phrases }) => {
    const absolutePath = path.join(process.cwd(), relativePath);
    const content = readFileSync(absolutePath, "utf8");

    expect(content).not.toMatch(MOJIBAKE_PATTERN);
    for (const phrase of phrases) {
      expect(content).toContain(phrase);
    }
  });
});

