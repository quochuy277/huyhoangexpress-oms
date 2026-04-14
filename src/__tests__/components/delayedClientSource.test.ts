import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Delayed client source", () => {
  it("syncs browser history without App Router navigation on filter changes", () => {
    const source = readSource("src/components/delayed/DelayedClient.tsx");

    expect(source).not.toContain("router.replace(");
    expect(source).toContain("window.history.pushState");
    expect(source).toContain("window.addEventListener(\"popstate\"");
    expect(source).toContain("getDelayedQueryBootstrap");
    expect(source).toContain("const [initialQueryString] = useState");
  });

  it("adds inline loading feedback while delayed filters are being applied", () => {
    const filterPanelSource = readSource("src/components/delayed/DelayedFilterPanel.tsx");
    const tableSource = readSource("src/components/delayed/DelayedOrderTable.tsx");

    expect(filterPanelSource).toContain("Đang áp dụng bộ lọc...");
    expect(filterPanelSource).toContain("aria-live=\"polite\"");
    expect(tableSource).toContain("Đang cập nhật...");
  });

  it("lazy-loads delayed dialogs and popups to keep the initial table bundle lighter", () => {
    const source = readSource("src/components/delayed/DelayedOrderTable.tsx");

    expect(source).toContain("dynamic(");
    expect(source).toContain("AddTodoDialog");
    expect(source).toContain("AddClaimFromPageDialog");
    expect(source).toContain("TrackingPopup");
    expect(source).toContain("OrderDetailDialog");
  });
});
