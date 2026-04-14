import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const MOJIBAKE_PATTERN = /Ãƒ|Ã‚|Ã¢â‚¬|Ã¡Âº|Ã¡Â»|Ã†Â°|Ã†Â¡|Ä|Ä‘|ðŸ|�/;

const FILE_EXPECTATIONS: Array<{ path: string; phrases: string[] }> = [
  {
    path: "src/components/layout/Header.tsx",
    phrases: [
      "Quản trị viên",
      "Quản lý",
      "Nhân viên",
      "Mở menu",
      "Mở thông báo",
      "Thông tin cá nhân",
      "Đăng xuất",
    ],
  },
  {
    path: "src/components/layout/Sidebar.tsx",
    phrases: [
      "Tổng Quan",
      "Quản Lý Đơn Hàng",
      "Chăm Sóc Đơn Hoãn",
      "Theo Dõi Đơn Hoàn",
      "Bồi Hoàn / Khiếu Nại",
      "Quản lý vận chuyển",
    ],
  },
];

describe("dashboard shell text encoding", () => {
  it.each(FILE_EXPECTATIONS)("keeps Vietnamese labels readable in $path", ({ path: relativePath, phrases }) => {
    const absolutePath = path.join(process.cwd(), relativePath);
    const content = readFileSync(absolutePath, "utf8");

    expect(content).not.toMatch(MOJIBAKE_PATTERN);
    for (const phrase of phrases) {
      expect(content).toContain(phrase);
    }
  });
});

