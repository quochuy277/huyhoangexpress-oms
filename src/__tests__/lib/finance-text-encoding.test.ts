import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const FINANCE_FILES = [
  {
    path: "src/components/finance/dashboard/DashboardPageClient.tsx",
    phrases: ["Bảng điều khiển Tài chính", "Truy cập nhanh", "Sổ quỹ"],
  },
  {
    path: "src/components/finance/shared/PeriodFilter.tsx",
    phrases: ["Tháng này", "Tùy chọn"],
  },
  {
    path: "src/components/finance/OverviewSummaryCards.tsx",
    phrases: ["Tổng doanh thu", "Lợi nhuận ròng"],
  },
  {
    path: "src/components/finance/ExpenseSection.tsx",
    phrases: ["Quản lý khoản chi"],
  },
  {
    path: "src/components/finance/BudgetSection.tsx",
    phrases: ["Ngân sách hàng tháng"],
  },
  {
    path: "src/components/finance/AnalysisTab.tsx",
    phrases: ["Phân tích", "Theo Đối tác", "Theo Cửa hàng", "Đơn doanh thu âm"],
  },
  {
    path: "src/components/finance/CashbookTab.tsx",
    phrases: ["Sổ quỹ", "Tải lên file công nợ", "Chi tiết giao dịch"],
  },
  {
    path: "src/components/finance/financeResponsive.ts",
    phrases: ["Sắp vượt", "Gần hết", "Bình thường", "Trả shop"],
  },
];

const MOJIBAKE_PATTERN = /Ãƒ|Ã‚|Ã¢â‚¬|Ã¡Âº|Ã¡Â»|Ã†Â°|Ã†Â¡|Ä|Ä‘|á»|ðŸ|â†’/;

describe("finance text encoding", () => {
  it.each(FINANCE_FILES)("keeps Vietnamese labels readable in $path", ({ path: relativePath, phrases }) => {
    const absolutePath = path.join(process.cwd(), relativePath);
    const content = readFileSync(absolutePath, "utf8");

    expect(content).not.toMatch(MOJIBAKE_PATTERN);
    for (const phrase of phrases) {
      expect(content).toContain(phrase);
    }
  });
});

