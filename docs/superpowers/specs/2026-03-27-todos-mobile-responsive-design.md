# Todos Page — Mobile Responsive Optimization

**Date:** 2026-03-27
**Approach:** Hybrid — fix critical issues + targeted UX improvements
**Target users:** Both employees and admin/managers on mobile
**Performance constraint:** No additional API calls, no new dependencies, no layout shifts. Must maintain fast interaction with Supabase (backend) and Vercel (hosting).

---

## 1. Touch Targets (minimum 40-44px tap area)

### Files: TodoListView.tsx, TodoQuickAdd.tsx, TodoFilters.tsx, TodosClient.tsx

| Element | Current | Target |
|---------|---------|--------|
| Checkbox (mobile card) | `w-4 h-4` (16px) | Visual 18px, wrap in 40px tap zone via padding |
| Edit/Delete buttons (mobile) | `p-1.5` + 12px icon | `p-2.5` + 16px icon, min 36px |
| Priority dots (QuickAdd) | `w-3.5 h-3.5` (14px) | `w-8 h-8` (32px) with centered dot |
| View toggle buttons | `px-3 py-1.5` | `px-4 py-2.5` on mobile |
| Filter reset button | `px-3 py-[7px]` | `px-4 py-2` |
| Pagination buttons | `p-1.5` + 14px icon (~28px) | `p-2` + 16px icon, min 36px |
| "Ẩn hoàn thành" checkbox | bare `<input>` (16px) | Wrap in label with `py-2 px-2` tap zone |
| Scope selector | `py-[7px]` | `py-2` on mobile |
| "Thêm mới" button | `py-[7px]` | `py-2` on mobile |

**Performance note:** Pure CSS changes, zero runtime cost.

**Note on priority dots:** 32px is intentional exception — 4 dots grouped tightly in a row, 40px would cause overlap. 32px is adequate for grouped controls.

## 2. Font Sizes (minimum 11px on mobile)

### Files: TodoListView.tsx, TodoKanbanView.tsx

| Element | Current | Target |
|---------|---------|--------|
| Badges (priority/status/source) mobile | `text-[10px]` | `text-[11px]` |
| Timestamps mobile | `text-[11px]` | `text-xs` (12px) |
| Kanban card secondary info | `text-[10px]` | `text-[11px]` |
| "Giao bởi" indicator | `text-[10px]` | `text-[11px]` |

**Performance note:** Pure CSS changes.

## 3. Mobile Filter Drawer

### File: TodoFilters.tsx

**Current:** Source and Due filters use `hidden sm:block` — invisible on mobile.

**Solution:** Add expandable filter section on mobile only.
- A "Bộ lọc" button visible only on mobile (`sm:hidden`)
- Toggle state shows/hides filter selects stacked vertically
- Badge shows count of active filters
- Desktop layout unchanged (inline filters)

**Performance note:**
- Single boolean state toggle, no API calls
- Filters already exist in parent state — just making them visible
- No lazy loading needed (3 small `<select>` elements)
- Add CSS transition (`max-height` + `overflow-hidden`) for smooth expand/collapse, no layout jump

## 4. Kanban Mobile — Drag Handle

### File: TodoKanbanView.tsx

**Current:** Entire card is drag handle → conflicts with scroll, no visual cue.

**Solution:**
- Add `GripVertical` icon (from lucide-react, already installed) as explicit drag handle
- Move `dragHandleProps` from card div to handle icon only
- Card body remains clickable for `onSelect`
- Handle styled `text-gray-300` default, visible on both mobile and desktop
- Drag handle minimum tap area: `p-1.5` making ~36px effective size (adequate as it's a vertical strip)

**Performance note:**
- No new dependency (lucide-react already used)
- `@hello-pangea/dnd` already supports separate drag handles natively
- No additional event listeners needed

## 5. AddTodoDialog — Scroll on Small Screens

### File: AddTodoDialog.tsx (shared)

**Current:** No max-height, form overflows on small screens.

**Solution:**
- Replace `fixed top-1/2 left-1/2 -translate-x/y` centering with flexbox wrapper: `fixed inset-0 flex items-center justify-center z-[9999]`
- Dialog inner container: `max-h-[calc(100vh-32px)]` + `flex flex-col`
- Form content area: `overflow-y-auto flex-1` (scrollable)
- Header and footer: `shrink-0` (always visible)

**Performance note:** Pure CSS, no layout recalculation. Flexbox centering is more reliable than transform centering for scroll-constrained modals.

## 6. DetailPanel — Mobile Layout

### File: TodoDetailPanel.tsx

**Current:** Linked order info grid always 2 columns, cramped on mobile.

**Solution:**
- Linked order grid: `grid-cols-1 sm:grid-cols-2` instead of `grid-cols-2`

**Performance note:** Single Tailwind class change.

## 7. QuickAdd Padding

### File: TodoQuickAdd.tsx

**Current:** `py-1.5` (6px) — too cramped for mobile.

**Solution:** `py-2.5` on mobile for better tap comfort.

## 8. Summary Cards Breakpoint

### File: TodoSummaryCards.tsx

**Current:** `grid-cols-2 lg:grid-cols-4` — jumps from 2→4 at 1024px.

**Solution:** `grid-cols-2 sm:grid-cols-4` — 4 columns from 640px (tablets).

---

## Performance Principles

1. **Zero new API calls** — all changes are CSS/layout, no additional Supabase queries
2. **Zero new dependencies** — uses existing lucide-react icons and Tailwind classes
3. **No new state** — only 1 boolean for filter drawer toggle (in TodoFilters)
4. **No lazy loading overhead** — filter selects are lightweight DOM elements
5. **No layout shifts** — all responsive changes use Tailwind breakpoints, resolved at CSS level
6. **Vercel edge compatibility** — no server-side changes, all client components

## Files to Modify (8 files)

1. `src/components/todos/TodoListView.tsx` — touch targets, fonts, timestamps
2. `src/components/todos/TodoKanbanView.tsx` — drag handle, fonts
3. `src/components/todos/TodoFilters.tsx` — mobile filter drawer
4. `src/components/todos/TodoQuickAdd.tsx` — padding, priority dot sizes
5. `src/components/todos/TodoSummaryCards.tsx` — grid breakpoint
6. `src/components/todos/TodoDetailPanel.tsx` — linked order grid
7. `src/components/shared/AddTodoDialog.tsx` — scroll constraint
8. `src/components/todos/TodosClient.tsx` — view toggle button sizes
