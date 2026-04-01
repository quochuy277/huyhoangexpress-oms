import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("server-backed search uses explicit submit flows", () => {
  it("removes timer-driven search from claims and orders filters", () => {
    expect(readSource("src/components/claims/ClaimsClient.tsx")).not.toContain("searchTimerRef");
    expect(readSource("src/components/orders/OrderFilters.tsx")).not.toContain("__searchTimeout");
  });

  it("removes debounce-driven search from todos and delayed pages", () => {
    expect(readSource("src/components/todos/TodosClient.tsx")).not.toContain(
      "useDebounce(filters.search",
    );
    expect(readSource("src/components/delayed/DelayedClient.tsx")).not.toContain(
      "useDebounce(filters.searchTerm",
    );
  });

  it("keeps explicit submit state for the remaining server-backed search screens", () => {
    expect(readSource("src/components/claims/ClaimsToolsTab.tsx")).toContain("historySearchInput");
    expect(readSource("src/components/crm/ShopManagementTab.tsx")).toContain("searchInput");
    expect(readSource("src/components/crm/ProspectPipelineTab.tsx")).toContain("appliedSearch");
    expect(readSource("src/components/orders/OrderChangesTab.tsx")).toContain("searchInput");
    expect(readSource("src/components/finance/AnalysisTab.tsx")).toContain("shopSearchInput");
    expect(readSource("src/components/finance/CashbookTab.tsx")).toContain("searchInput");
  });
});
