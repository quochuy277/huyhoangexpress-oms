# HANDOFF_CURRENT_STATE.md - HuyHoang Express OMS

> Last updated: 2026-04-01
> Verification run in this repository: `npm.cmd run test:run` and `npm.cmd run build` both passed on 2026-04-01.

---

## Table of Contents

1. [Working Features](#1-working-features)
2. [Known Bugs](#2-known-bugs)
3. [Technical Debt](#3-technical-debt)
4. [Performance Concerns](#4-performance-concerns)
5. [Security Concerns](#5-security-concerns)
6. [Verification Snapshot](#6-verification-snapshot)

---

## 1. Working Features

| Area | Status | Confidence | Evidence |
|---|---|---|---|
| Authentication and login flow | Working | High | `src/lib/auth.ts`, `src/lib/auth.config.ts`, `src/app/api/auth/[...nextauth]/route.ts`, build passed |
| Dashboard `/overview` | Working | High | `src/app/(dashboard)/overview/page.tsx`, dashboard APIs compiled successfully |
| Order import, upsert, and table browsing | Working | High | `src/app/api/orders/upload/route.ts`, `src/lib/order-import-service.ts`, `src/lib/excel-parser.ts`, tests passed |
| Delayed order analysis | Working | High | `src/app/api/orders/delayed/route.ts`, `src/lib/delay-analyzer.ts`, tests passed |
| Returns tracking | Working | Medium | `src/app/(dashboard)/returns/page.tsx`, related PATCH endpoints compiled successfully |
| Claims module | Working | High | `src/components/claims/ClaimsClient.tsx`, claims APIs and tests passed |
| Todo list + Kanban | Working | Medium | `src/components/todos/TodosClient.tsx`, todo APIs compiled successfully |
| Attendance + auto logout | Working | Medium | `src/components/attendance/AttendancePageClient.tsx`, `src/components/attendance/IdleLogoutProvider.tsx` |
| Finance dashboards and cashbook | Working | Medium | `src/components/finance/FinancePageClient.tsx`, finance APIs compiled successfully |
| Employee management + permission groups | Working | Medium | `src/app/(dashboard)/admin/users/page.tsx`, admin APIs compiled successfully |
| CRM page `/crm` | Working | Medium | `src/app/(dashboard)/crm/page.tsx`, `src/components/crm/CrmClient.tsx`, CRM APIs compiled successfully |
| Public landing page `/` | Working | Medium | `src/app/(landing)/page.tsx`, `src/app/api/landing/register/route.ts` |

Notes:

- Confidence is lower on pages with large client-only components and lighter automated coverage.
- The repository is in a better state than some earlier planning prompts suggest: CRM and the public landing page already exist in code.

---

## 2. Known Bugs

### 2.1 Orders API does not enforce `canViewOrders`

- Symptoms: A logged-in user without order-view permission can still call the orders listing endpoints directly.
- Likely cause: `src/middleware.ts` only enforces authentication for `/api/*`; `src/app/api/orders/route.ts` does not check `session.user.permissions?.canViewOrders`.
- Affected files: `src/middleware.ts`, `src/app/api/orders/route.ts`, `src/app/api/orders/options/route.ts`, `src/app/api/orders/[requestCode]/detail/route.ts`
- Severity: Critical

### 2.2 Returns API does not enforce `canViewReturns`

- Symptoms: A logged-in user may reach return data through API calls even if the page is hidden in the sidebar.
- Likely cause: `src/app/api/orders/returns/route.ts` authenticates the user but does not check `canViewReturns`.
- Affected files: `src/app/api/orders/returns/route.ts`, `src/middleware.ts`
- Severity: Critical

### 2.3 Warehouse confirmation endpoint does not enforce `canConfirmReturn`

- Symptoms: Any authenticated user can mark a return as warehouse-arrived through the API.
- Likely cause: `src/app/api/orders/[requestCode]/warehouse/route.ts` lacks a permission gate.
- Affected files: `src/app/api/orders/[requestCode]/warehouse/route.ts`
- Severity: Critical

### 2.4 Todo assignment can be escalated by regular users

- Symptoms: A non-manager can create a todo assigned to another employee by sending `assigneeId` in the request body.
- Likely cause: UI hides assignment for most users, but `src/app/api/todos/route.ts` trusts incoming `assigneeId`.
- Affected files: `src/app/api/todos/route.ts`, `src/components/shared/AddTodoDialog.tsx`
- Severity: Critical

### 2.5 Finance page and finance APIs can disagree for ADMIN users

- Symptoms: An ADMIN with a restrictive custom `PermissionGroup` can enter `/finance` but receive `403` from finance APIs.
- Likely cause: `src/app/(dashboard)/finance/page.tsx` allows `role === "ADMIN"` without the permission flag, while `src/lib/finance-auth.ts` requires `canViewFinancePage` for all API calls.
- Affected files: `src/app/(dashboard)/finance/page.tsx`, `src/lib/finance-auth.ts`
- Severity: Medium

### 2.6 Tracking proxy behavior differs from earlier documentation

- Symptoms: Call volume can hit the upstream tracking API more often than expected; previous docs mention a 5-minute cache that does not exist.
- Likely cause: `src/app/api/orders/[requestCode]/tracking/route.ts` uses `cache: "no-store"`.
- Affected files: `src/app/api/orders/[requestCode]/tracking/route.ts`
- Severity: Medium

### 2.7 Attendance auto-logout warning timing can be inconsistent across tabs

- Symptoms: Warning popups and idle tracking rely on client-local timers and `sessionStorage`, so multi-tab behavior may be inconsistent.
- Likely cause: `src/components/attendance/IdleLogoutProvider.tsx` tracks activity per browser tab and does not coordinate through `BroadcastChannel` or server state.
- Affected files: `src/components/attendance/IdleLogoutProvider.tsx`
- Severity: Low

### 2.8 Middleware uses deprecated file convention in Next.js 16

- Symptoms: Build succeeds, but Next.js prints a deprecation warning recommending `proxy.ts`.
- Likely cause: The project still uses `src/middleware.ts`.
- Affected files: `src/middleware.ts`
- Severity: Low

---

## 3. Technical Debt

### Large, mixed-responsibility UI files

- `src/app/(dashboard)/admin/users/page.tsx` is extremely large and mixes tabs, dialogs, inline styles, API orchestration, and permission UI in one file.
- `src/components/claims/ClaimsClient.tsx` is a very large feature container with heavy state management and rendering logic in one place.
- `src/components/crm/CrmClient.tsx`, `src/components/finance/FinancePageClient.tsx`, and several todo/return components follow the same pattern.

### Repeated hardcoded dialog styling

- The blue-border dialog convention is implemented by repeated inline style objects instead of a shared component.
- Examples: `src/components/shared/AddTodoDialog.tsx`, `src/components/tracking/TrackingPopup.tsx`, `src/components/shared/AnnouncementSection.tsx`, `src/app/(dashboard)/admin/users/page.tsx`, `src/components/attendance/IdleLogoutProvider.tsx`

### Partial React Query adoption

- TanStack Query is configured centrally in `src/components/Providers.tsx`, but much of the app still uses ad hoc `fetch` + local state.
- Zustand is installed but effectively unused; `src/stores/index.ts` is only a placeholder.

### Environment-variable drift

- `.env.example` documents `NEXTAUTH_SECRET`.
- `src/lib/env.ts` validates `AUTH_SECRET`.
- `src/lib/env.ts` does not appear to be imported anywhere, so runtime env validation is not actually active.

### Type looseness

- Several API handlers and client components still use `any` or `Record<string, any>`.
- Examples: `src/app/api/todos/route.ts`, `src/app/api/todos/[id]/route.ts`, `src/components/claims/ClaimsClient.tsx`, `src/app/(dashboard)/admin/users/page.tsx`

### Legacy / stale artifacts

- `prisma/fix_enum.sql` appears to be an older manual migration helper and should not be treated as the current source of truth.
- Existing handoff docs already contained stale details, which is a signal that documentation has not been maintained continuously.

### TODO / follow-up markers worth revisiting

- `src/app/api/crm/prospects/[id]/contact/route.ts` and `src/app/api/crm/shops/[shopName]/care/route.ts` auto-create todos as side effects and deserve clearer audit logging.
- `src/components/todos/constants.ts` still includes enum-era assumptions around status labels.

---

## 4. Performance Concerns

### Delayed orders route processes large datasets in memory

- `src/app/api/orders/delayed/route.ts` loads matching orders, runs regex-heavy enrichment in Node.js, then filters, sorts, and paginates after processing.
- Risk: this can become slow as the dataset grows and is a realistic timeout risk for serverless execution.

### Delayed export can fetch very large result sets

- `src/app/api/orders/delayed/export/route.ts` fetches up to 10,000 rows and enriches them in memory before export.
- Risk: memory spikes and long response times.

### Claim auto-detection is sequential and chatty

- `src/lib/claim-detector.ts` loops through candidate orders and performs per-claim lookups/updates sequentially.
- Risk: N+1 query behavior and slow batch runs.

### Returns page eagerly fetches all three tabs

- `src/app/(dashboard)/returns/page.tsx` requests partial, full, and warehouse datasets together on first load.
- Risk: unnecessary network and render cost when the user only needs one tab.

### Upload path is optimized but still serverless-sensitive

- `src/lib/order-import-service.ts` uses batching and raw SQL upserts, which is good.
- `src/app/api/orders/upload/route.ts` exports `maxDuration = 60`, but the user brief says Vercel Hobby should be treated as 10 seconds.
- This mismatch should be verified against the actual deployment plan and current Vercel account settings.

### Large client bundles

- Admin, claims, finance, CRM, and todo pages rely on large client components.
- Some dashboard rows are already dynamically imported, but other heavy pages are not split much further.

---

## 5. Security Concerns

### Incomplete server-side authorization

- The most serious issue in this repository is not authentication, but inconsistent permission enforcement at the API layer.
- `src/middleware.ts` protects page navigation well enough, but API handlers remain the real trust boundary and several do not enforce RBAC.

### In-memory rate limiting is not production-grade

- `src/lib/rate-limiter.ts` stores counters in process memory.
- On multi-instance deployments, each instance has its own counters, so rate limiting is soft rather than global.
- This affects login, exports, uploads, and auto-import.

### Rich-text announcement content is stored raw

- `src/components/shared/AnnouncementSection.tsx` sanitizes when previewing/rendering in the browser, which is good.
- However, raw HTML is persisted and there is no server-side sanitization in `src/app/api/announcements/route.ts`.
- Risk is currently limited by controlled render paths, but the data should be treated as untrusted.

### Public landing endpoint relies on lightweight abuse controls

- `src/app/api/landing/register/route.ts` has IP throttling and a honeypot field, which is a good start.
- Because rate limiting is in-memory, abuse protection weakens under scale or multiple instances.

### No immediate secret exposure found

- I did not find hardcoded API keys or database credentials in the tracked source files reviewed.
- Environment values are still present locally in `.env`, so normal secret-handling hygiene still applies.

---

## 6. Verification Snapshot

Executed on 2026-04-01 in `D:\CODE_APP\HuyHoang_OMS`:

```powershell
npm.cmd run test:run
npm.cmd run build
```

Observed results:

- `vitest` passed: 29 test files, 303 tests
- `next build` passed
- Build emitted one notable warning: the `middleware` file convention is deprecated in favor of `proxy`

Recommended immediate next fixes:

1. Add permission checks to the affected API handlers.
2. Resolve the finance ADMIN/API mismatch.
3. Decide whether tracking proxy responses should truly be uncached or should implement the earlier 5-minute cache design.
4. Tackle delayed-route performance before order volume grows further.
