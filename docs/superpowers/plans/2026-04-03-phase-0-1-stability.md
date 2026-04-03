# Phase 0-1 Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn tất backup baseline, chốt UTF-8 guardrails, vá RBAC API còn sót và xử lý race condition nhẹ ở xác nhận kho.

**Architecture:** Tập trung vào lớp API route và helper phân quyền dùng chung. Phase 0 không thay đổi runtime behavior; Phase 1 dùng test-first để mở rộng coverage rồi mới cập nhật route guards và nhánh xử lý warehouse idempotent.

**Tech Stack:** Next.js 16 App Router, TypeScript, NextAuth v5, Prisma, Vitest.

---

### Task 1: Phase 0 Baseline

**Files:**
- Create: `backups/20260403-141306-phase-0-1/README.txt`
- Create: `backups/20260403-141306-phase-0-1/git-status.txt`
- Create: `backups/20260403-141306-phase-0-1/working-tree.patch`
- Create: `backups/20260403-141306-phase-0-1/utf8-baseline-suspect-counts.txt`

- [ ] Create the backup directory and copy the Phase 0/1 target files into `backups/20260403-141306-phase-0-1/files/`.
- [ ] Save `git status --short` and `git diff --binary` into the backup folder.
- [ ] Save a UTF-8 baseline report for the user-facing/API files that Phase 1 will touch.
- [ ] Re-open the backup folder to verify the baseline artifacts exist.

### Task 2: RBAC Regression Tests

**Files:**
- Modify: `src/__tests__/app/api/orders-rbac-route.test.ts`

- [ ] Add failing tests for remaining direct-permission order routes: delayed, delayed export, upload, export, confirm-asked, customer-confirmed, and warehouse conflict handling.
- [ ] Run the focused test file and confirm the new assertions fail for the current code.

### Task 3: Implement Phase 1 RBAC and Warehouse Guard

**Files:**
- Modify: `src/app/api/orders/delayed/route.ts`
- Modify: `src/app/api/orders/delayed/export/route.ts`
- Modify: `src/app/api/orders/delete/route.ts`
- Modify: `src/app/api/orders/export/route.ts`
- Modify: `src/app/api/orders/notes/route.ts`
- Modify: `src/app/api/orders/upload/route.ts`
- Modify: `src/app/api/orders/[requestCode]/confirm-asked/route.ts`
- Modify: `src/app/api/orders/[requestCode]/customer-confirmed/route.ts`
- Modify: `src/app/api/orders/[requestCode]/warehouse/route.ts`
- Modify: `src/app/api/orders/route.ts`
- Modify: `src/app/api/orders/returns/route.ts`
- Modify: `src/app/api/orders/changes/route.ts`
- Modify: `src/app/api/orders/changes/stats/route.ts`
- Modify: `src/app/api/orders/options/route.ts`
- Modify: `src/app/api/orders/upload-history/route.ts`

- [ ] Replace direct `session.user.permissions?.*` checks in the targeted order routes with `requirePermission()` or `hasPermission()`.
- [ ] Restore all touched Vietnamese API messages to full UTF-8 text with proper accents.
- [ ] Make warehouse confirmation idempotent-safe with `updateMany()` and explicit `404`/`409` branches.

### Task 4: Verification

**Files:**
- Modify: `docs/huyhoang-oms-security-performance-audit-2026-04-02.md` (only if Phase 1 findings materially change)

- [ ] Run the focused RBAC test file and confirm it passes.
- [ ] Run the previously-added finance/todo regression tests and confirm they still pass.
- [ ] Run `npm run build` and confirm the application still builds.
- [ ] Summarize completed tasks, remaining deferred items, and Phase 2 handoff notes.
