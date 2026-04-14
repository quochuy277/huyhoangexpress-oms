import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("phase 5 hardening source guards", () => {
  it("removes render-time cache mutation from useTodoUsers", () => {
    const source = readSource("src/hooks/useTodoUsers.ts");

    expect(source).not.toContain("cachedUsers = initialUsers");
  });

  it("removes sync setState-in-effect mirrors for search inputs", () => {
    expect(readSource("src/components/todos/TodosClient.tsx")).not.toContain("setSearchInput(filters.search);");
    expect(readSource("src/hooks/useClaimsFilters.ts")).not.toContain("setSearchInput(filters.search);");
  });

  it("avoids impure Date.now initialization inside IdleLogoutProvider render", () => {
    expect(readSource("src/components/attendance/IdleLogoutProvider.tsx")).not.toContain("useRef(Date.now())");
  });

  it("does not define JSX-returning table helpers inline in hot table components", () => {
    expect(readSource("src/app/(dashboard)/admin/users/page.tsx")).not.toContain("const TabBtn =");
    expect(readSource("src/components/delayed/DelayedOrderTable.tsx")).not.toContain("const HeaderCell =");
    expect(readSource("src/components/delayed/DelayedTable.tsx")).not.toContain("const SortIcon =");
    expect(readSource("src/components/returns/PartialReturnTab.tsx")).not.toContain("const SortHead =");
    expect(readSource("src/components/returns/FullReturnTab.tsx")).not.toContain("const SortHead =");
    expect(readSource("src/components/returns/WaitingReturnTab.tsx")).not.toContain("const SortHead =");
    expect(readSource("src/components/returns/WaitingReturnTab.tsx")).not.toContain("const getStatusBadge =");
  });

  it("avoids common React compiler footguns still left in hot client components", () => {
    expect(readSource("src/components/layout/Sidebar.tsx")).not.toContain("setMounted(true);");
    expect(readSource("src/components/orders/OrderTable.tsx")).not.toContain(
      "initialDataUpdatedAt: initialData ? Date.now() : undefined,",
    );
    expect(readSource("src/hooks/useTodoUsers.ts")).not.toContain("setUsers(initialUsers);");
  });
});
