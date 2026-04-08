import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const RETURNS_FILES = [
  {
    path: "src/components/returns/ReturnsPageClient.tsx",
    phrases: ["Theo Dõi Đơn Hoàn", "Đang hoàn 1 phần", "Đã về kho - Chờ trả", "Xuất CSV"],
  },
  {
    path: "src/components/returns/ReturnFilterPanel.tsx",
    phrases: ["Mã đơn, người nhận, SĐT...", "Tất cả cửa hàng", "Có ghi chú"],
  },
];

const MOJIBAKE_PATTERN = /Ã|âœ|â|ðŸ|áº|á»|Æ°|Ä‘|Ä|Theo DÃµi|Ä‘Æ¡n/;

describe("returns text encoding", () => {
  it.each(RETURNS_FILES)("keeps Vietnamese labels readable in $path", ({ path: relativePath, phrases }) => {
    const absolutePath = path.join(process.cwd(), relativePath);
    const content = readFileSync(absolutePath, "utf8");

    expect(content).not.toMatch(MOJIBAKE_PATTERN);
    for (const phrase of phrases) {
      expect(content).toContain(phrase);
    }
  });
});
