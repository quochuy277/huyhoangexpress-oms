# HANDOFF_ROADMAP.md - HuyHoang Express OMS

> Last updated: 2026-04-01
> This document distinguishes between roadmap items described in prompts or prior planning and what is actually present in the repository today.

---

## Table of Contents

1. [Reality Check](#1-reality-check)
2. [CRM Mini](#2-crm-mini)
3. [Landing Page](#3-landing-page)
4. [`login.huyhoang.express` Subdomain](#4-loginhuyhoangexpress-subdomain)
5. [SVExpress Automation](#5-svexpress-automation)
6. [Multi-tenant Architecture](#6-multi-tenant-architecture)
7. [Phases 6-8 Follow-up](#7-phases-6-8-follow-up)
8. [Code Audit Follow-up](#8-code-audit-follow-up)
9. [Recommended Execution Order](#9-recommended-execution-order)

---

## 1. Reality Check

The user brief references several "planned" items that are already partly or fully implemented in the current repository:

- CRM already exists at `src/app/(dashboard)/crm/page.tsx`
- Public landing page already exists at `src/app/(landing)/page.tsx`
- Login-subdomain handling already exists in `src/middleware.ts`
- Announcement system, profile dialog, auto-logout, and tracking popup already exist

The missing part is not raw implementation anymore; it is alignment, hardening, and deciding what the next production scope should be.

Files named in the prompt but not found in this repository:

- `PROMPT_CRM_MINI.md` - [UNKNOWN - needs verification]
- `PROMPT_CRM_MINI_COMPLETE.md` - [UNKNOWN - needs verification]
- `PLAN_PHASE_6_7_8.md` - [UNKNOWN - needs verification]
- `PLAN_BIEN_DONG_DON_HANG_FINAL.md` - [UNKNOWN - needs verification]
- `AUDIT_REPORT.md` - [UNKNOWN - needs verification]
- `CLAUDE_CODE_AUDIT_REPORT.md` - [UNKNOWN - needs verification]
- `MASTER_OPTIMIZATION_PLAN.md` - [UNKNOWN - needs verification]
- `PROJECT_INSTRUCTIONS.md` - [UNKNOWN - needs verification]

Closest planning/spec files that do exist:

- `docs/plans/2026-03-28-delayed-option-2.md`
- `docs/superpowers/plans/2026-03-27-finance-mobile-responsive.md`
- `docs/superpowers/plans/2026-03-28-claims-page-hardening-responsive.md`
- `docs/superpowers/specs/2026-03-31-svexpress-automation-design.md`

---

## 2. CRM Mini

### Current repository state

Implemented files:

- `src/app/(dashboard)/crm/page.tsx`
- `src/components/crm/CrmClient.tsx`
- `src/components/crm/ShopManagementTab.tsx`
- `src/components/crm/ProspectPipelineTab.tsx`
- `src/components/crm/ShopDetailPanel.tsx`
- `src/components/crm/ProspectDetailSheet.tsx`
- `src/components/crm/ProspectFormDialog.tsx`
- `src/app/api/crm/shops/route.ts`
- `src/app/api/crm/shops/[shopName]/route.ts`
- `src/app/api/crm/shops/[shopName]/care/route.ts`
- `src/app/api/crm/prospects/route.ts`
- `src/app/api/crm/prospects/[id]/route.ts`
- `src/app/api/crm/prospects/[id]/contact/route.ts`
- `src/app/api/crm/prospects/[id]/stage/route.ts`
- `src/app/api/crm/assignments/route.ts`

Database models already present:

- `ShopProfile`
- `ShopAssignment`
- `ShopCareLog`
- `ShopProspect`
- `ProspectContactLog`

### What appears to be implemented

- 2-tab CRM structure: active shops + prospect pipeline
- Care logs and follow-up creation
- Sales pipeline stages
- Assignment data
- Prospect contact logging

### Remaining roadmap questions

- Whether the current CRM UI matches the missing prompt docs exactly is [UNKNOWN - needs verification]
- Permission hardening for CRM management flows should be reviewed before expansion
- Shop analytics and workload ownership rules need clearer documentation
- Prospect-to-shop conversion flow may still need product decisions

### Recommended next step

Treat CRM as "Phase 1 implemented, Phase 2 hardening and workflow polish pending", not as a greenfield feature.

---

## 3. Landing Page

### Current repository state

Implemented files:

- `src/app/(landing)/layout.tsx`
- `src/app/(landing)/page.tsx`
- `src/app/(landing)/components/*.tsx`
- `src/app/api/landing/register/route.ts`
- `src/app/api/landing/stats/route.ts`

### What already exists

- Public marketing page at `/`
- Multi-section content layout
- Lead capture form
- Prospect creation into CRM flow
- Source tagging as `LANDING_PAGE`
- Auto-created follow-up todo in `src/app/api/landing/register/route.ts`

### Likely remaining work

- Real production contact details are not obvious from code and should be verified manually
- Final copywriting, branding assets, and conversion tracking are [UNKNOWN - needs verification]
- Any exact "9 planned sections" spec from the prompt is stale; the current page has more sections/components than that

### Recommended next step

Treat the landing page as already launched in code, then decide whether the roadmap is about conversion optimization rather than basic implementation.

---

## 4. `login.huyhoang.express` Subdomain

### Current repository state

- `src/middleware.ts` explicitly checks `hostname === "login.huyhoang.express"`
- Logged-in users are redirected to `https://huyhoang.express/orders`
- Anonymous users are rewritten to `/login`

### What is still unknown

- DNS and Vercel domain configuration cannot be verified from this repository alone
- HTTPS certificates and production redirect rules are [UNKNOWN - needs verification]

### Recommended next step

Verify the live domain behavior in Vercel and browsers, then decide whether to migrate from `middleware.ts` to the new `proxy.ts` convention at the same time.

---

## 5. SVExpress Automation

### Current repository state

This OMS repo only contains a design reference:

- `docs/superpowers/specs/2026-03-31-svexpress-automation-design.md`

The actual automation implementation is described as a separate repository in the user brief: `svexpress-automation`.

### Interpreted roadmap

- Stage 1: Playwright / GitHub Actions extraction of full phone numbers from `admin.svexpress.vn`
- Stage 2: push extracted data into OMS via API
- Current blocker from the brief: bot detection

### OMS-side preparation already present

- `src/app/api/orders/auto-import/route.ts` exists
- `src/middleware.ts` supports `x-api-key` auth for auto-import
- `AUTO_IMPORT_API_KEY` is referenced in code

### Recommended next step

If automation resumes, define a narrow OMS ingestion contract first:

1. payload shape
2. idempotency behavior
3. rate limits
4. audit logging
5. failure replay strategy

---

## 6. Multi-tenant Architecture

### Current repository state

Not implemented. The schema is single-tenant and does not contain a `tenantId` column on core models.

Primary evidence:

- `prisma/schema.prisma`
- `src/middleware.ts`
- order, claims, finance, todo, attendance, and CRM APIs all assume one shared dataset

### Scope of a real multi-tenant upgrade

- Add `tenantId` to core business models and audit tables
- Add tenant-aware auth/session loading
- Enforce tenant filters server-side in APIs, not only in UI
- Revisit unique constraints like `requestCode`, `email`, and shop identifiers
- Update analytics and dashboard aggregations for tenant boundaries

### Recommended next step

Do not start with middleware-only filtering. The correct first step is a schema and access-pattern design document, because tenant isolation must be enforced at the database query layer.

---

## 7. Phases 6-8 Follow-up

The prompt references `PLAN_PHASE_6_7_8.md`, but that file is missing. Based on the actual repository:

### DOMPurify sanitization

- Partially implemented in `src/lib/sanitize.ts`
- Currently used by announcement rendering in `src/components/shared/AnnouncementSection.tsx` and previews in `src/components/layout/Header.tsx`
- Not a general, app-wide sanitization policy yet

### Skeleton loading states

- Already present on several pages:
  - `src/app/(dashboard)/claims/loading.tsx`
  - `src/app/(dashboard)/crm/loading.tsx`
  - `src/app/(dashboard)/delayed/loading.tsx`
  - `src/app/(dashboard)/finance/loading.tsx`
  - `src/app/(dashboard)/orders/loading.tsx`
  - `src/app/(dashboard)/returns/loading.tsx`
  - `src/app/(dashboard)/todos/loading.tsx`

### Unified API error handling

- Not implemented consistently
- Many handlers return ad hoc JSON shapes and log directly with `console.error`
- `src/lib/api-handler.ts` exists but is not used as a universal wrapper

### Pagination on user/todo endpoints

- Todo list pagination already exists in `src/app/api/todos/route.ts`
- Admin user endpoints do not appear to be paginated yet

### Admin password reset

- Already implemented at `src/app/api/admin/users/[id]/password/route.ts`

### Recommended next step

Convert this "phase" into a fresh checklist based on current code, because the original plan file is missing and some items are already done.

---

## 8. Code Audit Follow-up

The two audit report filenames named in the prompt are missing, so there is no verified in-repo source for those documents.

What does exist:

- `CODEBASE.md`
- `PROJECT_RULE.md`
- `Claude_Build and Fix.md`
- several implementation plans under `docs/`

Recommended follow-up:

1. Create a single living optimization plan in the root, but only after consolidating real code findings from current repository state.
2. Seed it from `HANDOFF_CURRENT_STATE.md`, not from the missing report filenames.
3. Separate it into security, performance, product polish, and DX tracks.

---

## 9. Recommended Execution Order

### Priority 1: harden the current product

1. Fix API-level RBAC gaps in orders, returns, warehouse confirmation, and todos.
2. Resolve the finance ADMIN/API mismatch.
3. Replace or upgrade the in-memory rate limiter if production traffic grows.

### Priority 2: remove scaling risks

1. Rework delayed-order processing to paginate earlier and compute less in memory.
2. Optimize claim auto-detection batch behavior.
3. Decide the real tracking-cache policy for the SVExpress proxy.

### Priority 3: product alignment

1. Verify whether CRM and landing page meet the intended business spec.
2. Confirm live `login.huyhoang.express` behavior.
3. Decide whether the next roadmap is SaaS hardening, CRM polish, or automation integration.

### Priority 4: future architecture

1. Draft multi-tenant schema strategy.
2. Define tenant-aware permission and analytics rules.
3. Only then estimate SaaS packaging and pricing work.
