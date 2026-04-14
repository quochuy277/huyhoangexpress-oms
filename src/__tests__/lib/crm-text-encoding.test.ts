import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const CRM_FILES = [
  {
    path: "src/components/crm/CrmClient.tsx",
    phrases: ["Quản Lý Khách Hàng", "Quản lý Shop", "Shop Tiềm Năng"],
  },
  {
    path: "src/components/crm/ProspectPipelineTab.tsx",
    phrases: ["Mới phát hiện", "Đã tiếp cận", "Đang thương lượng", "Đã chuyển đổi"],
  },
  {
    path: "src/components/crm/ShopManagementTab.tsx",
    phrases: ["Đang hoạt động", "Shop VIP", "Shop mới", "Cần chăm sóc gấp"],
  },
];

const MOJIBAKE_PATTERN = /Ã|âœ|â|ðŸ|áº|á»|Æ°|Ä‘|Ä|Quáº|KhÃ|Tiá»/;

describe("crm text encoding", () => {
  it.each(CRM_FILES)("keeps Vietnamese labels readable in $path", ({ path: relativePath, phrases }) => {
    const absolutePath = path.join(process.cwd(), relativePath);
    const content = readFileSync(absolutePath, "utf8");

    expect(content).not.toMatch(MOJIBAKE_PATTERN);
    for (const phrase of phrases) {
      expect(content).toContain(phrase);
    }
  });
});

