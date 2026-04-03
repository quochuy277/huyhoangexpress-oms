# Phase 2 Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn tất quick wins hiệu năng ở backend và frontend mà không thay đổi schema.

**Architecture:** Tập trung vào ba vùng rõ ràng: data access của claim detector, summary/detail contract của API negative revenue, và tab-level loading của trang returns. Mọi thay đổi đều phải có test trước, giữ nguyên tiếng Việt UTF-8.

**Tech Stack:** Next.js 16, React 19, Prisma, Vitest.

---

### Task 1: Phase 2 Baseline

**Files:**
- Create: `backups/20260403-143232-phase-2/README.txt`
- Create: `backups/20260403-143232-phase-2/git-status.txt`
- Create: `backups/20260403-143232-phase-2/working-tree.patch`
- Create: `backups/20260403-143232-phase-2/utf8-baseline-suspect-counts.txt`

- [ ] Create the backup folder for Phase 2.
- [ ] Save `git status --short` and `git diff --binary`.
- [ ] Copy all Phase 2 target files into `files/`.
- [ ] Save UTF-8/mojibake baseline counts for touched files.

### Task 2: Backend Red Tests

**Files:**
- Modify: `src/__tests__/lib/claim-detector.test.ts`
- Modify: `src/__tests__/app/api/finance-negative-revenue-route.test.ts`

- [ ] Add a failing test proving `createAutoDetectedClaims()` uses one `findMany` lookup instead of per-claim `findUnique`.
- [ ] Add a failing test proving `negative-revenue` returns summary without loading full detail list unless pagination/detail is requested.

### Task 3: Frontend Red Tests

**Files:**
- Create: `src/lib/returns-tab-data.ts`
- Create: `src/__tests__/lib/returns-tab-data.test.ts`

- [ ] Extract tab-level fetch/state helpers for returns.
- [ ] Add failing tests that only the active tab is fetched and that cached tab data is reused.

### Task 4: Implement Quick Wins

**Files:**
- Modify: `src/lib/claim-detector.ts`
- Modify: `src/app/api/finance/negative-revenue/route.ts`
- Modify: `src/app/(dashboard)/returns/page.tsx`
- Modify: `src/components/finance/FinancePageClient.tsx` (only if change is low-risk and beneficial)

- [ ] Replace N+1 claim lookup with batched `findMany` + `Map`.
- [ ] Refactor `negative-revenue` route to compute summary in DB and fetch details only on demand.
- [ ] Refactor returns page to lazy load tab components and fetch only the active tab.
- [ ] Apply one additional low-risk bundle optimization if it clearly improves load without hurting UX.

### Task 5: Verification

**Files:**
- Modify: `docs/huyhoang-oms-security-performance-audit-2026-04-02.md` only if findings need an updated note

- [ ] Run Phase 2 focused tests.
- [ ] Run `npm run test:run`.
- [ ] Run `npm run build`.
- [ ] Re-scan touched files for mojibake patterns and summarize the phase.
