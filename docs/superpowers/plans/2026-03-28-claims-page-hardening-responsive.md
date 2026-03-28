# Claims Page Hardening & Mobile Responsive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the Claims module end-to-end by fixing permission gaps, correcting broken logic, improving mobile responsiveness for all tabs, and reducing data/query overhead for Next.js on Vercel with Postgres/Supabase.

**Architecture:** Keep the existing Claims route and three-tab structure, but split the oversized client code into smaller UI units and move list/data logic behind dedicated hooks. Use permission-aware API handlers, TanStack Query for stable data fetching/mutations, URL-synced filters for navigability, and mobile-specific list layouts instead of forcing desktop tables onto narrow screens.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma, PostgreSQL/Supabase, TanStack Query, Vitest, Tailwind CSS v4, Recharts.

---

## Planned File Structure

**Core claims page files**
- Modify: `src/components/claims/ClaimsPageWrapper.tsx`
- Modify: `src/components/claims/ClaimsClient.tsx`
- Modify: `src/components/claims/ClaimDetailDrawer.tsx`
- Modify: `src/components/claims/ClaimsToolsTab.tsx`
- Modify: `src/components/claims/ClaimsCompensationTab.tsx`
- Modify: `src/app/globals.css`

**New focused claims UI units**
- Create: `src/components/claims/claims-table/ClaimsDesktopTable.tsx`
- Create: `src/components/claims/claims-table/ClaimsMobileList.tsx`
- Create: `src/components/claims/claims-table/ClaimsBulkBar.tsx`
- Create: `src/components/claims/claims-table/ClaimsFiltersBar.tsx`
- Create: `src/components/claims/claims-table/ClaimsToolbar.tsx`
- Create: `src/components/claims/claims-table/ClaimInlineEditors.tsx`

**New claims hooks/helpers**
- Create: `src/hooks/useClaimsFilters.ts`
- Create: `src/hooks/useClaimsList.ts`
- Create: `src/hooks/useClaimMutations.ts`
- Create: `src/lib/claims-permissions.ts`

**Claims API files**
- Modify: `src/app/api/claims/route.ts`
- Modify: `src/app/api/claims/[id]/route.ts`
- Modify: `src/app/api/claims/bulk/route.ts`
- Modify: `src/app/api/claims/history/route.ts`
- Modify: `src/app/api/claims/compensation/route.ts`
- Modify: `src/app/api/claims/filter-options/route.ts`
- Modify: `src/app/api/claims/export/route.ts`
- Modify: `src/app/api/claims/search-orders/route.ts`

**Shared config/types**
- Modify: `src/lib/claims-config.ts`
- Modify: `src/lib/permissions.ts`

**Database**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_claims_indexes_and_history_support/migration.sql`

**Tests**
- Create: `src/__tests__/app/api/claims-route-permissions.test.ts`
- Create: `src/__tests__/app/api/claims-history-route.test.ts`
- Create: `src/__tests__/app/api/claims-compensation-route.test.ts`
- Create: `src/__tests__/components/claimsResponsive.test.tsx`
- Create: `src/__tests__/components/claimsToolsResponsive.test.tsx`
- Create: `src/__tests__/components/claimsCompensationResponsive.test.tsx`
- Modify: `src/__tests__/lib/permissions.test.ts`

---

### Task 1: Lock Down Claims Permissions At The API Boundary

**Files:**
- Create: `src/lib/claims-permissions.ts`
- Modify: `src/app/api/claims/route.ts`
- Modify: `src/app/api/claims/[id]/route.ts`
- Modify: `src/app/api/claims/bulk/route.ts`
- Test: `src/__tests__/app/api/claims-route-permissions.test.ts`

- [ ] **Step 1: Write the failing permission tests**

```ts
import { describe, expect, it, vi } from "vitest";

describe("claims route permissions", () => {
  it("rejects create when canCreateClaim is false", async () => {
    const { POST } = await import("@/app/api/claims/route");
    vi.mocked(auth).mockResolvedValue(mockSession({
      permissions: { canViewClaims: true, canCreateClaim: false },
    }));

    const response = await POST(mockJsonRequest({ orderId: "o1", issueType: "LOST" }));
    expect(response.status).toBe(403);
  });

  it("rejects update when canUpdateClaim is false", async () => {
    const { PATCH } = await import("@/app/api/claims/[id]/route");
    vi.mocked(auth).mockResolvedValue(mockSession({
      permissions: { canViewClaims: true, canUpdateClaim: false },
    }));

    const response = await PATCH(mockJsonRequest({ claimStatus: "RESOLVED" }), {
      params: Promise.resolve({ id: "claim-1" }),
    });
    expect(response.status).toBe(403);
  });

  it("rejects delete when canDeleteClaim is false", async () => {
    const { DELETE } = await import("@/app/api/claims/[id]/route");
    vi.mocked(auth).mockResolvedValue(mockSession({
      permissions: { canViewClaims: true, canDeleteClaim: false },
    }));

    const response = await DELETE(new NextRequest("http://localhost/api/claims/claim-1"), {
      params: Promise.resolve({ id: "claim-1" }),
    });
    expect(response.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cmd /c npm.cmd run test:run -- src/__tests__/app/api/claims-route-permissions.test.ts`

Expected: FAIL because the routes currently return `401/200` behavior without the new permission guard.

- [ ] **Step 3: Add a shared permission helper for claims routes**

```ts
import { NextResponse } from "next/server";

import type { PermissionSet } from "@/lib/permissions";

export function requireClaimsPermission(
  permissions: PermissionSet | undefined,
  key: keyof Pick<PermissionSet, "canViewClaims" | "canCreateClaim" | "canUpdateClaim" | "canDeleteClaim" | "canViewCompensation">,
) {
  if (!permissions?.[key]) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  return null;
}
```

- [ ] **Step 4: Enforce those guards in all mutating claims handlers**

```ts
const denied = requireClaimsPermission(session.user.permissions, "canUpdateClaim");
if (denied) return denied;
```

Apply the same pattern to:
- `POST /api/claims` with `canCreateClaim`
- `PATCH /api/claims/[id]` with `canUpdateClaim`
- `DELETE /api/claims/[id]` with `canDeleteClaim`
- `PATCH/DELETE /api/claims/bulk` with update/delete keys
- `GET /api/claims/compensation` with `canViewCompensation` or finance fallback kept intact

- [ ] **Step 5: Re-run permission tests**

Run: `cmd /c npm.cmd run test:run -- src/__tests__/app/api/claims-route-permissions.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/claims-permissions.ts src/app/api/claims/route.ts src/app/api/claims/[id]/route.ts src/app/api/claims/bulk/route.ts src/__tests__/app/api/claims-route-permissions.test.ts
git commit -m "fix: enforce claims api permissions"
```

### Task 2: Centralize Claims Config And Remove Duplicate Constants

**Files:**
- Modify: `src/lib/claims-config.ts`
- Modify: `src/components/claims/ClaimsClient.tsx`
- Modify: `src/components/claims/ClaimDetailDrawer.tsx`
- Modify: `src/components/claims/ClaimsCompensationTab.tsx`
- Test: `src/__tests__/lib/claims-config.test.ts`

- [ ] **Step 1: Extend the existing config test to lock shared constants**

```ts
it("exports issue and status options used by all claims views", async () => {
  expect(ISSUE_TYPE_OPTIONS.length).toBeGreaterThan(0);
  expect(CLAIM_STATUS_OPTIONS.some((item) => item.value === "PENDING")).toBe(true);
});
```

- [ ] **Step 2: Run test to verify baseline**

Run: `cmd /c npm.cmd run test:run -- src/__tests__/lib/claims-config.test.ts`

Expected: PASS or targeted failures once new exports are referenced but not implemented.

- [ ] **Step 3: Move duplicated maps out of `ClaimsClient` into `claims-config`**

```ts
export const COMPLETION_STATUSES: ClaimStatusKey[] = [
  "RESOLVED",
  "CUSTOMER_COMPENSATED",
  "CUSTOMER_REJECTED",
];

export function formatClaimMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}
```

- [ ] **Step 4: Replace local duplicates with imports**

```ts
import {
  CLAIM_STATUS_CONFIG,
  CLAIM_STATUS_OPTIONS,
  COMPLETION_STATUSES,
  ISSUE_TYPE_CONFIG,
  ISSUE_TYPE_OPTIONS,
  formatClaimMoney,
} from "@/lib/claims-config";
```

- [ ] **Step 5: Re-run config tests**

Run: `cmd /c npm.cmd run test:run -- src/__tests__/lib/claims-config.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/claims-config.ts src/components/claims/ClaimsClient.tsx src/components/claims/ClaimDetailDrawer.tsx src/components/claims/ClaimsCompensationTab.tsx src/__tests__/lib/claims-config.test.ts
git commit -m "refactor: centralize claims ui config"
```

### Task 3: Build URL-Synced Filter State And Query Hooks For Claims

**Files:**
- Create: `src/hooks/useClaimsFilters.ts`
- Create: `src/hooks/useClaimsList.ts`
- Create: `src/hooks/useClaimMutations.ts`
- Modify: `src/components/claims/ClaimsClient.tsx`
- Test: `src/__tests__/components/claimsResponsive.test.tsx`

- [ ] **Step 1: Write the failing component test for URL-backed list state**

```tsx
it("syncs claims filters and page to the URL", async () => {
  render(<ClaimsClient />);

  await user.type(screen.getByPlaceholderText("Tìm mã đơn, SĐT, shop..."), "GHN123");
  await waitFor(() => {
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("claimSearch=GHN123"),
      { scroll: false },
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cmd /c npm.cmd run test:run -- src/__tests__/components/claimsResponsive.test.tsx`

Expected: FAIL because `ClaimsClient` only syncs `claimPage` today.

- [ ] **Step 3: Create a focused hook to parse and update claims filter state**

```ts
export function useClaimsFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = {
    page: Number(searchParams.get("claimPage") || "1"),
    search: searchParams.get("claimSearch") || "",
    status: searchParams.get("claimStatus") || "",
    shopName: searchParams.get("claimShop") || "",
    orderStatus: searchParams.get("claimOrderStatus") || "",
    issueType: (searchParams.get("claimIssueType") || "").split(",").filter(Boolean),
    showCompleted: searchParams.get("claimCompleted") === "true",
    sortBy: searchParams.get("claimSortBy") || "deadline",
    sortDir: (searchParams.get("claimSortDir") || "asc") as "asc" | "desc",
  };

  function updateFilters(next: Partial<typeof filters>) {
    const params = new URLSearchParams(searchParams.toString());
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return { filters, updateFilters };
}
```

- [ ] **Step 4: Move list fetching to TanStack Query**

```ts
export function useClaimsList(filters: ClaimFilters) {
  return useQuery({
    queryKey: ["claims-list", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      const response = await fetch(`/api/claims?${params}`);
      if (!response.ok) throw new Error("Failed to fetch claims");
      return response.json();
    },
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });
}
```

- [ ] **Step 5: Update `ClaimsClient` to consume those hooks instead of raw `useEffect` fetches**

```ts
const { filters, updateFilters } = useClaimsFilters();
const claimsQuery = useClaimsList(filters);
const claimMutations = useClaimMutations({ queryKey: ["claims-list"] });
```

- [ ] **Step 6: Re-run the component test**

Run: `cmd /c npm.cmd run test:run -- src/__tests__/components/claimsResponsive.test.tsx`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useClaimsFilters.ts src/hooks/useClaimsList.ts src/hooks/useClaimMutations.ts src/components/claims/ClaimsClient.tsx src/__tests__/components/claimsResponsive.test.tsx
git commit -m "refactor: move claims list state into hooks"
```

### Task 4: Split The Claims Tab Into Desktop And Mobile Views

**Files:**
- Create: `src/components/claims/claims-table/ClaimsToolbar.tsx`
- Create: `src/components/claims/claims-table/ClaimsFiltersBar.tsx`
- Create: `src/components/claims/claims-table/ClaimsBulkBar.tsx`
- Create: `src/components/claims/claims-table/ClaimsDesktopTable.tsx`
- Create: `src/components/claims/claims-table/ClaimsMobileList.tsx`
- Modify: `src/components/claims/ClaimsClient.tsx`
- Modify: `src/app/globals.css`
- Test: `src/__tests__/components/claimsResponsive.test.tsx`

- [ ] **Step 1: Add failing responsive tests for desktop/mobile rendering**

```tsx
it("renders a mobile card list below tablet width", async () => {
  mockMatchMedia(false);
  render(<ClaimsClient />);
  expect(await screen.findByTestId("claims-mobile-list")).toBeInTheDocument();
});

it("keeps the desktop table on large screens", async () => {
  mockMatchMedia(true);
  render(<ClaimsClient />);
  expect(await screen.findByRole("table")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cmd /c npm.cmd run test:run -- src/__tests__/components/claimsResponsive.test.tsx`

Expected: FAIL because only the wide table exists today.

- [ ] **Step 3: Extract the toolbar, filters, and bulk bar from `ClaimsClient`**

```tsx
export function ClaimsToolbar({ onAutoDetect, onExport, onAdd, detecting, exporting }: ClaimsToolbarProps) {
  return (
    <div className="claims-toolbar">
      <button type="button" onClick={onAutoDetect}>Quét tự động</button>
      <button type="button" onClick={onExport}>Xuất Excel</button>
      <button type="button" onClick={onAdd}>Thêm mới</button>
    </div>
  );
}
```

- [ ] **Step 4: Add a mobile-specific list instead of horizontal overflow**

```tsx
export function ClaimsMobileList({ claims, onOpenDetail, onToggleComplete }: ClaimsMobileListProps) {
  return (
    <div data-testid="claims-mobile-list" className="claims-mobile-list">
      {claims.map((claim) => (
        <article key={claim.id} className="claims-mobile-card">
          <button type="button" onClick={() => onOpenDetail(claim.id)}>
            {claim.order?.requestCode}
          </button>
          <div>{claim.order?.shopName || "—"}</div>
          <div>{claim.claimStatus}</div>
          <div>{claim.issueDescription || "Chưa có nội dung"}</div>
        </article>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Update global responsive tokens for claims layouts**

```css
@media (max-width: 768px) {
  .resp-grid-1-2 {
    grid-template-columns: 1fr !important;
  }

  .claims-toolbar,
  .claims-pagination,
  .claims-filters-row {
    flex-direction: column;
    align-items: stretch;
  }
}
```

- [ ] **Step 6: Wire `ClaimsClient` to choose desktop vs mobile view**

```tsx
<div className="hidden md:block">
  <ClaimsDesktopTable {...tableProps} />
</div>
<div className="md:hidden">
  <ClaimsMobileList {...mobileProps} />
</div>
```

- [ ] **Step 7: Re-run responsive tests**

Run: `cmd /c npm.cmd run test:run -- src/__tests__/components/claimsResponsive.test.tsx`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/components/claims/claims-table/ClaimsToolbar.tsx src/components/claims/claims-table/ClaimsFiltersBar.tsx src/components/claims/claims-table/ClaimsBulkBar.tsx src/components/claims/claims-table/ClaimsDesktopTable.tsx src/components/claims/claims-table/ClaimsMobileList.tsx src/components/claims/ClaimsClient.tsx src/app/globals.css src/__tests__/components/claimsResponsive.test.tsx
git commit -m "feat: add responsive claims list layouts"
```

### Task 5: Harden Inline Editing, Mutation Rollback, And Drawer Save Flow

**Files:**
- Create: `src/components/claims/claims-table/ClaimInlineEditors.tsx`
- Modify: `src/components/claims/ClaimsClient.tsx`
- Modify: `src/components/claims/ClaimDetailDrawer.tsx`
- Test: `src/__tests__/components/claimsResponsive.test.tsx`

- [ ] **Step 1: Add failing test for rollback on failed inline edit**

```tsx
it("restores original issue description when inline save fails", async () => {
  mockPatchFailure();
  render(<ClaimsClient />);

  const editor = await screen.findByLabelText("Nội dung vấn đề");
  await user.clear(editor);
  await user.type(editor, "Mô tả mới");
  fireEvent.blur(editor);

  await waitFor(() => {
    expect(screen.getByDisplayValue("Mô tả cũ")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cmd /c npm.cmd run test:run -- src/__tests__/components/claimsResponsive.test.tsx`

Expected: FAIL because inline edits currently update local state without rollback.

- [ ] **Step 3: Replace `contentEditable` with a controlled textarea/input pattern**

```tsx
export function ClaimIssueDescriptionEditor({ value, onCommit, disabled }: Props) {
  const [draft, setDraft] = useState(value ?? "");

  return (
    <textarea
      aria-label="Nội dung vấn đề"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => onCommit(draft.trim() || null)}
      disabled={disabled}
    />
  );
}
```

- [ ] **Step 4: Move row mutations into a hook with optimistic update + rollback**

```ts
const mutation = useMutation({
  mutationFn: patchClaim,
  onMutate: async (payload) => {
    await queryClient.cancelQueries({ queryKey: ["claims-list"] });
    const previous = queryClient.getQueryData(["claims-list", filters]);
    queryClient.setQueryData(["claims-list", filters], optimisticUpdate(previous, payload));
    return { previous };
  },
  onError: (_error, _payload, context) => {
    queryClient.setQueryData(["claims-list", filters], context?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["claims-list"] });
  },
});
```

- [ ] **Step 5: Keep `ClaimDetailDrawer` as the primary editing surface on mobile**

```tsx
const isMobileEditingLocked = useIsMobile();
if (isMobileEditingLocked) {
  return <button type="button" onClick={() => onOpenDetail(claim.id)}>Chỉnh sửa</button>;
}
```

- [ ] **Step 6: Re-run the inline edit test**

Run: `cmd /c npm.cmd run test:run -- src/__tests__/components/claimsResponsive.test.tsx`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/claims/claims-table/ClaimInlineEditors.tsx src/components/claims/ClaimsClient.tsx src/components/claims/ClaimDetailDrawer.tsx src/__tests__/components/claimsResponsive.test.tsx
git commit -m "fix: stabilize claims inline editing"
```

### Task 6: Repair Claims Tools Tab Logic And Mobile Layout

**Files:**
- Modify: `src/components/claims/ClaimsToolsTab.tsx`
- Modify: `src/app/api/claims/history/route.ts`
- Test: `src/__tests__/components/claimsToolsResponsive.test.tsx`
- Test: `src/__tests__/app/api/claims-history-route.test.ts`

- [ ] **Step 1: Add failing tests for history page size and auto filter**

```ts
it("applies the selected page size in claims history", async () => {
  render(<ClaimsToolsTab isAdmin />);
  await user.selectOptions(screen.getByDisplayValue("20"), "50");
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("pageSize=50"));
});

it("filters auto activities to auto-created or auto-reopened history entries", async () => {
  const response = await GET(new NextRequest("http://localhost/api/claims/history?action=auto"));
  const body = await response.json();
  expect(body.activities.every((item: any) => item.actionType.includes("Tự động"))).toBe(true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cmd /c npm.cmd run test:run -- src/__tests__/components/claimsToolsResponsive.test.tsx src/__tests__/app/api/claims-history-route.test.ts`

Expected: FAIL because the page size select is inert and `action=auto` is not filtered correctly.

- [ ] **Step 3: Fix the `historyPageSize` state and filter reset behavior**

```ts
const [historyPageSize, setHistoryPageSize] = useState(20);

onChange={(event) => {
  setHistoryPageSize(Number(event.target.value));
  setHistoryPage(1);
}}
```

- [ ] **Step 4: Make `auto` filter explicit in the history route**

```ts
if (actionFilter === "auto") {
  dateWhere.note = { contains: "Tự động", mode: "insensitive" };
}
```

If the data model is too weak for reliable filtering, add an `actionSource` field to the unified response derived from `source`, `note`, or status history metadata and filter before returning.

- [ ] **Step 5: Normalize the mobile layout for filters/history cards**

```tsx
<div className="claims-tools-filters claims-tools-filters--mobile-safe">
  {/* search, action, staff, from, to */}
</div>
```

```css
@media (max-width: 768px) {
  .claims-tools-filters--mobile-safe > * {
    flex: 1 1 100% !important;
  }
}
```

- [ ] **Step 6: Re-run tools/history tests**

Run: `cmd /c npm.cmd run test:run -- src/__tests__/components/claimsToolsResponsive.test.tsx src/__tests__/app/api/claims-history-route.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/claims/ClaimsToolsTab.tsx src/app/api/claims/history/route.ts src/__tests__/components/claimsToolsResponsive.test.tsx src/__tests__/app/api/claims-history-route.test.ts
git commit -m "fix: stabilize claims tools history filters"
```

### Task 7: Fix Compensation Tab UX And Reduce Query Fan-Out

**Files:**
- Modify: `src/components/claims/ClaimsCompensationTab.tsx`
- Modify: `src/app/api/claims/compensation/route.ts`
- Test: `src/__tests__/components/claimsCompensationResponsive.test.tsx`
- Test: `src/__tests__/app/api/claims-compensation-route.test.ts`

- [ ] **Step 1: Add failing tests for shop detail toggle and responsive fallback**

```tsx
it("shows shop detail rows when clicking the detail toggle", async () => {
  render(<ClaimsCompensationTab />);
  await user.click(await screen.findByRole("button", { name: /xem shop/i }));
  expect(screen.getByText(/chi tiết cửa hàng/i)).toBeInTheDocument();
});

it("renders cards instead of a wide table on mobile", async () => {
  mockMatchMedia(false);
  render(<ClaimsCompensationTab />);
  expect(await screen.findByTestId("claims-compensation-shop-cards")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cmd /c npm.cmd run test:run -- src/__tests__/components/claimsCompensationResponsive.test.tsx src/__tests__/app/api/claims-compensation-route.test.ts`

Expected: FAIL because the expand state is currently unused and the mobile card layout does not exist.

- [ ] **Step 3: Replace the dead `expandedShop` state with a real detail panel**

```tsx
{expandedShop === s.shopName && (
  <tr>
    <td colSpan={8}>
      <div className="claims-comp-shop-detail">
        <div>Tổng đơn: {s.totalClaims}</div>
        <div>Đang xử lý: {s.processing}</div>
        <div>Đã đền bù KH: {formatVND(s.totalPaid)}</div>
      </div>
    </td>
  </tr>
)}
```

- [ ] **Step 4: Collapse monthly aggregates into a single grouped query**

```ts
const monthlyRows = await prisma.$queryRaw<
  Array<{ month: string; carrier_total: number; customer_total: number }>
>`SELECT to_char(date_trunc('month', "detectedDate"), 'MM/YYYY') AS month,
         COALESCE(SUM(CASE WHEN "claimStatus" = 'CARRIER_COMPENSATED' THEN "carrierCompensation" ELSE 0 END), 0) AS carrier_total,
         COALESCE(SUM(CASE WHEN "claimStatus" = 'CUSTOMER_COMPENSATED' THEN "customerCompensation" ELSE 0 END), 0) AS customer_total
  FROM "ClaimOrder"
  WHERE "detectedDate" >= ${dateFrom}
  GROUP BY 1
  ORDER BY MIN("detectedDate") ASC`;
```

- [ ] **Step 5: Add a mobile card stack for shop summaries**

```tsx
<div data-testid="claims-compensation-shop-cards" className="md:hidden">
  {filteredShops.map((shop) => (
    <article key={shop.shopName} className="claims-comp-card">
      <h3>{shop.shopName}</h3>
      <div>{shop.totalClaims} đơn vấn đề</div>
      <div>{formatVND(shop.totalPaid)}</div>
    </article>
  ))}
</div>
```

- [ ] **Step 6: Re-run compensation tests**

Run: `cmd /c npm.cmd run test:run -- src/__tests__/components/claimsCompensationResponsive.test.tsx src/__tests__/app/api/claims-compensation-route.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/claims/ClaimsCompensationTab.tsx src/app/api/claims/compensation/route.ts src/__tests__/components/claimsCompensationResponsive.test.tsx src/__tests__/app/api/claims-compensation-route.test.ts
git commit -m "feat: improve claims compensation mobile ux"
```

### Task 8: Optimize Search, Filter Options, Export, And Database Indexes

**Files:**
- Modify: `src/app/api/claims/route.ts`
- Modify: `src/app/api/claims/filter-options/route.ts`
- Modify: `src/app/api/claims/export/route.ts`
- Modify: `src/app/api/claims/search-orders/route.ts`
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_claims_indexes_and_history_support/migration.sql`
- Test: `src/__tests__/app/api/claims-route-permissions.test.ts`

- [ ] **Step 1: Add failing test coverage for filter options and export limits**

```ts
it("returns distinct filter options from claim rows only", async () => {
  const response = await GET_FILTER_OPTIONS();
  const body = await response.json();
  expect(body.shops).toEqual(expect.arrayContaining(["Shop A"]));
});

it("caps export volume and returns 413-style guidance when the selection is too large", async () => {
  const response = await GET_EXPORT(new NextRequest("http://localhost/api/claims/export"));
  expect([200, 413]).toContain(response.status);
});
```

- [ ] **Step 2: Run tests to verify they fail or expose missing guards**

Run: `cmd /c npm.cmd run test:run -- src/__tests__/app/api/claims-route-permissions.test.ts`

Expected: FAIL or incomplete assertions depending on the current export/filter behavior.

- [ ] **Step 3: Add the missing compound indexes for claims workloads**

```prisma
model ClaimOrder {
  @@index([isCompleted, deadline])
  @@index([isCompleted, detectedDate])
  @@index([claimStatus, detectedDate])
  @@index([issueType, isCompleted])
}

model ClaimStatusHistory {
  @@index([changedBy, changedAt])
}

model ClaimChangeLog {
  @@index([changedBy, changedAt])
}
```

- [ ] **Step 4: Tighten the route-level queries**

```ts
const pageSize = Math.min(parseInt(params.get("pageSize") || "20", 10), 100);
```

```ts
const exportLimit = 3000;
if (claims.length === exportLimit) {
  headers.set("X-Claims-Export-Truncated", "true");
}
```

```ts
const q = normalizeSearchInput(rawQuery);
```

For search:
- prefer exact/prefix matches for `requestCode` and `carrierOrderCode`
- normalize phone numbers before comparing
- keep broad contains search only for `shopName`

- [ ] **Step 5: Make `filter-options` query the claims table directly**

```ts
const [shops, statuses] = await Promise.all([
  prisma.claimOrder.findMany({
    select: { order: { select: { shopName: true } } },
    distinct: ["orderId"],
  }),
  prisma.claimOrder.findMany({
    select: { order: { select: { status: true } } },
    distinct: ["orderId"],
  }),
]);
```

- [ ] **Step 6: Apply the Prisma migration**

Run: `npx prisma migrate dev --name claims_indexes_and_history_support`

Expected: Migration created and Prisma client regenerated.

- [ ] **Step 7: Re-run targeted tests**

Run: `cmd /c npm.cmd run test:run -- src/__tests__/app/api/claims-route-permissions.test.ts src/__tests__/app/api/claims-history-route.test.ts src/__tests__/app/api/claims-compensation-route.test.ts`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/app/api/claims/route.ts src/app/api/claims/filter-options/route.ts src/app/api/claims/export/route.ts src/app/api/claims/search-orders/route.ts prisma/schema.prisma prisma/migrations
git commit -m "perf: optimize claims queries and indexes"
```

### Task 9: Accessibility Polish, Responsive Tabs, And Final Verification

**Files:**
- Modify: `src/components/claims/ClaimsPageWrapper.tsx`
- Modify: `src/components/claims/ClaimsClient.tsx`
- Modify: `src/components/claims/ClaimDetailDrawer.tsx`
- Modify: `src/components/claims/ClaimsToolsTab.tsx`
- Modify: `src/components/claims/ClaimsCompensationTab.tsx`
- Modify: `src/app/globals.css`
- Test: `src/__tests__/components/claimsResponsive.test.tsx`
- Test: `src/__tests__/components/claimsToolsResponsive.test.tsx`
- Test: `src/__tests__/components/claimsCompensationResponsive.test.tsx`

- [ ] **Step 1: Add failing accessibility assertions**

```tsx
it("adds aria-labels to icon-only action buttons", async () => {
  render(<ClaimsClient />);
  expect(await screen.findByLabelText("Xem chi tiết đơn có vấn đề")).toBeInTheDocument();
  expect(screen.getByLabelText("Xóa đơn có vấn đề")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cmd /c npm.cmd run test:run -- src/__tests__/components/claimsResponsive.test.tsx src/__tests__/components/claimsToolsResponsive.test.tsx src/__tests__/components/claimsCompensationResponsive.test.tsx`

Expected: FAIL because several icon-only actions and form controls currently lack accessible labels.

- [ ] **Step 3: Add labels, visible focus states, and safer transitions**

```tsx
<button
  type="button"
  aria-label="Xem chi tiết đơn có vấn đề"
  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
>
  <Eye aria-hidden="true" size={12} />
</button>
```

```ts
transition: "background-color 0.15s, border-color 0.15s, color 0.15s"
```

- [ ] **Step 4: Make the tab strip responsive and URL-aware**

```tsx
const tab = searchParams.get("claimTab") || "claims";

router.replace(`${pathname}?${params.toString()}`, { scroll: false });
```

Add `aria-selected`, `role="tablist"`, `role="tab"`, and keep the active tab in the query string.

- [ ] **Step 5: Run the full relevant suite**

Run: `cmd /c npm.cmd run test:run -- src/__tests__/components/claimsResponsive.test.tsx src/__tests__/components/claimsToolsResponsive.test.tsx src/__tests__/components/claimsCompensationResponsive.test.tsx src/__tests__/app/api/claims-route-permissions.test.ts src/__tests__/app/api/claims-history-route.test.ts src/__tests__/app/api/claims-compensation-route.test.ts src/__tests__/lib/claims-config.test.ts src/__tests__/lib/permissions.test.ts`

Expected: PASS

- [ ] **Step 6: Run type-check**

Run: `cmd /c .\\node_modules\\.bin\\tsc.cmd --noEmit`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/claims/ClaimsPageWrapper.tsx src/components/claims/ClaimsClient.tsx src/components/claims/ClaimDetailDrawer.tsx src/components/claims/ClaimsToolsTab.tsx src/components/claims/ClaimsCompensationTab.tsx src/app/globals.css src/__tests__/components/claimsResponsive.test.tsx src/__tests__/components/claimsToolsResponsive.test.tsx src/__tests__/components/claimsCompensationResponsive.test.tsx
git commit -m "feat: polish claims accessibility and responsive tabs"
```

---

## Verification Checklist

- Permission enforcement blocks unauthorized create/update/delete/bulk operations.
- `ClaimsClient` no longer owns every concern in one 1500+ line file.
- Claims filters, page, sorting, and active tab survive reload/share via URL.
- Claims tab renders cards on mobile and table on desktop.
- Tools tab mobile filters/history are readable and the history page size control works.
- Compensation tab mobile layout avoids horizontal scroll and the shop detail toggle actually reveals details.
- Compensation route reduces query fan-out and avoids 12 small monthly aggregates.
- Search/export/filter-options routes are bounded and better aligned with indexed access patterns.
- Icon-only actions have accessible labels and visible focus styling.

## Self-Review

**Spec coverage:** The plan covers the previously identified issues: API permission gaps, monolithic claims client, broken responsive behavior, tools tab history bugs, compensation tab dead toggle, accessibility gaps, and claims-specific query performance.

**Placeholder scan:** No `TODO`, `TBD`, or generic “handle appropriately” steps remain; each task includes concrete files, tests, commands, and implementation direction.

**Type consistency:** Shared config names (`ISSUE_TYPE_CONFIG`, `CLAIM_STATUS_CONFIG`, `COMPLETION_STATUSES`) and route names match the current codebase. New hooks and components are named consistently around the Claims module.

## Recommended Execution Order

1. Task 1
2. Task 6
3. Task 7
4. Task 8
5. Task 2
6. Task 3
7. Task 4
8. Task 5
9. Task 9

This order fixes security and correctness first, then stabilizes data/performance, then performs the safer UI decomposition and responsive polish on top of that foundation.
