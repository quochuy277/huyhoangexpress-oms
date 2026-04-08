# Performance Baseline 2026-04-08

## Scope

- F5 on dashboard routes
- Client navigation between dashboard routes
- First-load shell requests
- UTF-8 and mobile QA checkpoints

## Initial Baseline

- Worktree branch: `perf/mobile-hardening`
- Starting git status: clean
- Known hot paths from code review:
  - Duplicate auth across middleware, dashboard layout, and many pages
  - Header badge requests on shell mount
  - Immediate heartbeat request on shell mount
  - Immediate attendance settings fetch in idle provider
  - Client-first route entry for `claims`, `attendance`, `todos`, `returns`, `delayed`, and parts of `finance`/`crm`

## Routes To Compare Before vs After

- `overview`
- `claims`
- `attendance`
- `todos`
- `returns`
- `delayed`
- `finance`
- `crm`

## Metrics To Capture During Verification

- Request count before first meaningful content
- Request count triggered by shell alone
- Number of auth-dependent server calls on initial route entry
- Presence or absence of client waterfall on route default tabs
- Mobile layout issues at `360px`, `375px`, `390px`, `768px`

## Phase Status

- Phase 0: completed
- Phase 1: completed
- Phase 2A: completed
- Phase 2B: completed
- Phase 3: completed

## Implemented In Phase 1

- Added `getCachedSession()` helper and switched dashboard layout/pages to use it.
- Scoped React Query provider to dashboard routes instead of the entire app.
- Removed middleware handling for all `/api/*` routes so API auth runs in route handlers only.
- Moved `auto-import` API key protection into `src/app/api/orders/auto-import/route.ts`.
- Added delayed shell bootstrap query policy and combined header count fetch into one endpoint.
- Delayed initial heartbeat request and delayed attendance settings fetch in the shell.
- Lazy-loaded the user profile dialog in the header.

## Implemented In Phase 2A

- Added server-prefetch for `/delayed` via `getDelayedPageData()` and passed `initialData` into `DelayedClient`.
- Prevented redundant `router.replace()` on delayed page mount when the query string already matches.
- Added server bootstrap for `/claims` default tab via `getClaimsBootstrapData()`.
- Passed initial claims list and filter options into the client so the default claims tab no longer fires both bootstrap requests immediately after hydration.
- Removed `ssr: false` from the main claims tab entry path.

## Implemented In Phase 2B

- Added server bootstrap for `/attendance` default tab via `getAttendanceBootstrapData()`.
- Passed `initialMyTabData` into attendance client components and skipped the first client fetch when bootstrap data exists.
- Made the attendance tab bar scroll safely on mobile.
- Added server bootstrap for `/todos` via `getTodosBootstrapData()`.
- Passed bootstrap payload into `TodosClient`, `useTodos`, `useTodoStats`, `useTodoUsers`, and `TodoReminderBanner` so the default page no longer fires list, stats, users, and reminders immediately after hydration.
- Converted `/returns` to a server entry route and moved the previous client page into `ReturnsPageClient`.
- Prefetched returns summary and the active tab on the server and reused the same helper logic in API routes.
- Added server-side summary prefetch for `/overview` and passed it into `AlertCardsRow`, `FinanceCardsRow`, and `ActivityAndRatesRow` using React Query `initialData`.

## Implemented In Phase 3

- Added active-tab prefetch for `/finance`:
  - `analysis` now receives server-loaded initial data for the direct route entry path.
  - `cashbook` now receives server-loaded initial data for the direct route entry path.
  - Removed `ssr: false` from the `analysis` and `cashbook` tab entry components.
- Added active-tab prefetch for `/crm`:
  - `prospects` receives initial stats + list data from the server.
  - `shops` receives initial dashboard + list data from the server.
  - Removed `ssr: false` from the prospect tab entry component.
- Added UTF-8 regression coverage for `crm`, `attendance`, and `returns`.
- Added mobile-friendly tab overflow handling on CRM and attendance tab navigation.

## Verification Completed

- Focused regression tests passed:
  - `src/__tests__/app/dashboard-orders-page.test.tsx`
  - `src/__tests__/lib/cached-session.test.ts`
  - `src/__tests__/lib/header-query-policy.test.ts`
  - `src/__tests__/app/api/orders-import-route.test.ts`
  - `src/__tests__/app/delayed-page.test.tsx`
  - `src/__tests__/app/claims-page.test.tsx`
  - `src/__tests__/app/api/claims-route-permissions.test.ts`
  - `src/__tests__/app/api/claims-search-orders-route.test.ts`
  - `src/__tests__/app/api/claims-history-route.test.ts`
  - `src/__tests__/app/api/claims-compensation-route.test.ts`
- `npm run build` passed after Phase 2A changes.
- Additional focused regression tests passed for Phase 2B:
  - `src/__tests__/app/attendance-page.test.tsx`
  - `src/__tests__/lib/attendance-bootstrap-state.test.ts`
  - `src/__tests__/app/todos-page.test.tsx`
  - `src/__tests__/lib/todo-bootstrap-state.test.ts`
  - `src/__tests__/app/returns-page.test.tsx`
  - `src/__tests__/lib/returns-tab-data.test.ts`
  - `src/__tests__/app/overview-page.test.tsx`
- Combined regression run through Phase 2B passed with `17` files and `40` tests green.
- `npm run build` passed after Phase 2B changes.
- Additional Phase 3 checks passed:
  - `src/__tests__/app/finance-page.test.tsx`
  - `src/__tests__/app/crm-page.test.tsx`
  - `src/__tests__/lib/crm-text-encoding.test.ts`
  - `src/__tests__/lib/attendance-text-encoding.test.ts`
  - `src/__tests__/lib/returns-text-encoding.test.ts`


## UTF-8 Notes

- Kept Vietnamese UI strings with full accents in all touched UI files.
- Corrected delayed page metadata title to `Chăm Sóc Đơn Hoãn`.
