# Orders Page — Mobile Responsive Optimization

**Date:** 2026-03-27
**Approach:** Hybrid — fix critical issues + mobile card views for tables + filter drawer
**Target users:** Both employees and admin/managers on mobile
**Performance constraint:** Zero new API calls, zero new dependencies, zero new Supabase queries. All changes are CSS/layout only.

---

## 1. Touch Targets (minimum 36-40px tap area)

### Files: OrderTable.tsx, OrderFilters.tsx, OrderChangesTab.tsx, DeleteOrdersDialog.tsx, TrackingPopup.tsx, UploadHistoryDialog.tsx

| Element | Current | Target |
|---------|---------|--------|
| Action buttons (Todo/Claim/Track) | `p-1.5` (28px) | `p-2.5` (36px+) |
| Pagination nav buttons | `p-1.5` (28px) | `p-2` (32px+) |
| Page size select | `h-7` (28px) | `h-9` (36px) |
| Filter dropdowns | `py-1.5` (24px) | `py-2` (32px) |
| Search input | `py-2` (28px) | `py-2.5` (36px) |
| Reset button | `py-1` (20px) | `py-2` (32px) |
| Advanced filter selects | `py-1.5` (28px) | `py-2` |
| Dialog buttons (Delete, Tracking) | `padding: 8px` | `padding: 10px 16px` |
| Upload history pagination | `py-1.5` (28px) | `py-2.5` |

**Performance:** Pure CSS, zero runtime cost.

## 2. Font Sizes (minimum 11px on mobile)

| Element | Current | Target |
|---------|---------|--------|
| Advanced filter labels | `text-[10px]` | `text-[11px]` |
| Upload history table headers | `text-[11px]` | `text-xs` (12px) |
| OrderDetail field labels | `fontSize: 10px` | `fontSize: 11px` |
| Stat card labels (Changes) | `text-[11px]` | `text-xs` on mobile |

## 3. OrderTable — Mobile Card View

### File: OrderTable.tsx

**Current:** `min-w-[1000px]` table forces horizontal scroll on all mobile.

**Solution:** Dual rendering — card view on mobile, table on desktop.
- Mobile (`block sm:hidden`): Card stack layout per order
  - Each card shows: checkbox, requestCode (link), receiverName, deliveryStatus badge, COD amount, carrier, action buttons
  - Cards are compact with essential info, tap to expand via OrderDetailDialog
  - Selection checkbox integrated in card header
- Desktop (`hidden sm:block`): Keep existing table unchanged

**Card layout:**
```
┌────────────────────────────────┐
│ ☐  RQS-2024-001    [Đang VC]  │
│    Nguyễn Văn A                │
│    COD: 350,000đ   GHN        │
│    [📋] [⚠️] [🚚]             │
└────────────────────────────────┘
```

**Performance:** Same data, different render. No additional fetch.

## 4. OrderChangesTab — Mobile Card View + Stat Cards

### File: OrderChangesTab.tsx

**Stat cards grid:**
- Current: inline `repeat(row.length, 1fr)` — 6 cols on mobile = unusable
- Fix: `grid-cols-3` on mobile for all rows, `sm:grid-cols-5`/`sm:grid-cols-6` on desktop

**Changes table:**
- Current: `min-w-[900px]` forces horizontal scroll
- Fix: Same dual rendering pattern — card view mobile, table desktop
- Card shows: change type badge, requestCode, change content summary, timestamp

## 5. OrderFilters — Mobile Filter Drawer

### File: OrderFilters.tsx

**Current:** Quick filters `hidden lg:flex`, advanced filters grid jumps from 1 to 5 cols.

**Solution:**
- Mobile filter toggle button (`sm:hidden`) with active filter count badge
- Expand/collapse section with all filters stacked vertically
- CSS transition for smooth open/close
- Desktop layout unchanged
- Quick filters: show as wrapped pills on mobile instead of hiding
- Advanced grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5`

## 6. OrderDetailDialog — Responsive Grid

### File: OrderDetailDialog.tsx (shared)

**Current:** `gridTemplateColumns: "1fr 1fr"` on all sizes, padding 20px, label 10px.

**Solution:**
- Add `<style>` tag with media query for `.resp-grid-1-2`:
  - Below 640px: `grid-template-columns: 1fr`
  - Above 640px: `grid-template-columns: 1fr 1fr`
- Add `.resp-hide-mobile`: `display: none` below 640px
- Padding: 20px → 12px on mobile via media query
- Label font: 10px → 11px
- Action buttons: increase padding to 8px 14px

## 7. DeleteOrdersDialog — Responsive Width

### File: DeleteOrdersDialog.tsx

**Current:** Fixed `width: 480px` overflows mobile.

**Solution:**
- Width: `min(480px, calc(100vw - 32px))`
- Button padding: `8px` → `10px 16px`
- Max-height for code list: responsive

## 8. TrackingPopup — Mobile Padding & Buttons

### File: TrackingPopup.tsx

**Current:** Already uses `min(520px, calc(100vw-32px))` — width OK.

**Solution:**
- Content/header/footer padding: 20px → 14px on mobile
- Button touch targets: `7px 14px` → `9px 14px`

## 9. UploadHistoryDialog — Responsive Layout

### File: UploadHistoryDialog.tsx

**Solution:**
- Header/footer padding: `px-6` → `px-4 sm:px-6`
- Table header font: `text-[11px]` → `text-xs`
- Pagination buttons: `py-1.5` → `py-2.5`
- Pagination layout: `flex-col sm:flex-row` on mobile

## 10. ExcelUpload — Mobile Drop Zone

### File: ExcelUpload.tsx

**Solution:**
- Drop zone padding: `p-8` → `p-5 sm:p-8`
- Error table: `max-h-48` → `max-h-64 sm:max-h-48`
- Help text: ensure wrapping on small screens

## 11. OrdersClient — Toast & Layout

### File: OrdersClient.tsx

**Solution:**
- Toast: mobile bottom center full-width instead of fixed bottom-right
- Button padding consistency with other components

## 12. Order Detail Page — Server Component

### File: src/app/(dashboard)/orders/[requestCode]/page.tsx

**Solution:**
- Add responsive CSS for grid sections: 1 col mobile, 2 col desktop
- Consistent with OrderDetailDialog pattern

---

## Performance Principles

1. **Zero new API calls** — card views use same fetched data
2. **Zero new dependencies** — all Tailwind + inline styles
3. **No new state** — only 1 boolean for filter drawer (in OrderFilters)
4. **No Supabase query changes** — all server routes untouched
5. **No Vercel config changes** — all client-side rendering changes
6. **File upload unchanged** — only drop zone UI styling modified
7. **React Query cache unaffected** — same query keys, same data shape

## Files to Modify (11 files)

1. `src/components/orders/OrderTable.tsx` — mobile card view, touch targets, pagination
2. `src/components/orders/OrderChangesTab.tsx` — mobile card view, stat cards grid
3. `src/components/orders/OrderFilters.tsx` — mobile filter drawer
4. `src/components/orders/OrdersClient.tsx` — toast positioning, button padding
5. `src/components/orders/ExcelUpload.tsx` — drop zone padding, error table
6. `src/components/orders/UploadHistoryDialog.tsx` — responsive padding, pagination
7. `src/components/orders/DeleteOrdersDialog.tsx` — responsive width, button sizes
8. `src/components/shared/OrderDetailDialog.tsx` — responsive grid, padding, fonts
9. `src/components/tracking/TrackingPopup.tsx` — padding, button sizes
10. `src/app/(dashboard)/orders/[requestCode]/page.tsx` — responsive grid
11. `src/app/(dashboard)/orders/loading.tsx` — responsive skeleton (if needed)
