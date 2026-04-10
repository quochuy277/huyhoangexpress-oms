import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Orders layout source", () => {
  it("lets the Orders page grow with document scroll instead of viewport locks", () => {
    const source = readSource("src/components/orders/OrdersClient.tsx");

    expect(source).not.toContain("h-[calc(100vh-6.5rem)]");
    expect(source).not.toContain("sm:h-[calc(100vh-8rem)]");
    expect(source).not.toContain("relative min-h-0 flex-1");
    expect(source).not.toContain("absolute inset-0 animate-pulse");
  });

  it("removes nested vertical scrolling from the orders table card", () => {
    const source = readSource("src/components/orders/OrderTable.tsx");

    expect(source).not.toContain("overflow-hidden flex flex-col h-full");
    expect(source).not.toContain("block sm:hidden flex-1 overflow-y-auto");
    expect(source).not.toContain("overflow-x-auto flex-1 hidden sm:block");
    expect(source).toContain("hidden sm:block overflow-x-auto");
  });

  it("keeps the changes tab using page scroll instead of an internal scroll region", () => {
    const source = readSource("src/components/orders/OrderChangesTab.tsx");

    expect(source).not.toContain("space-y-3 flex flex-col flex-1 min-h-0");
    expect(source).not.toContain("block sm:hidden divide-y divide-slate-100 flex-1 overflow-y-auto");
    expect(source).not.toContain("hidden sm:block overflow-x-auto flex-1");
    expect(source).toContain("hidden sm:block overflow-x-auto");
  });
});
