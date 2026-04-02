# Header Announcement Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full announcement preview popup to the header notification bell while keeping the click action marked-as-read.

**Architecture:** Extract the announcement preview UI into a shared client component, then reuse it from the admin announcement list and the header bell dropdown. Keep all behavior client-side and preserve the existing read endpoint.

**Tech Stack:** Next.js App Router, React client components, TanStack Query, Vitest, DOMPurify

---

### Task 1: Lock the behavior with a failing component test

**Files:**
- Create: `src/__tests__/components/headerNotifications.test.tsx`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run the focused test to verify it fails because the popup is missing**

Run: `npm.cmd run test:run -- src/__tests__/components/headerNotifications.test.tsx`

- [ ] **Step 3: Confirm the test is asserting both read-marking and dialog visibility**

### Task 2: Extract a reusable announcement preview dialog

**Files:**
- Create: `src/components/shared/AnnouncementPreviewDialog.tsx`
- Modify: `src/components/shared/AnnouncementSection.tsx`

- [ ] **Step 1: Move the existing admin preview markup into a shared dialog component**
- [ ] **Step 2: Keep rich-text sanitization, metadata, and attachment rendering intact**
- [ ] **Step 3: Replace the inline admin preview dialog with the shared component**

### Task 3: Connect the shared dialog to the header bell

**Files:**
- Modify: `src/components/layout/Header.tsx`

- [ ] **Step 1: Add local state for the selected announcement**
- [ ] **Step 2: Extend the header announcement type with attachment URL support**
- [ ] **Step 3: On announcement click, call the read endpoint, close the bell dropdown, and open the shared preview dialog**
- [ ] **Step 4: Add accessible labels where needed without changing current layout**

### Task 4: Guard Vietnamese text quality and verify

**Files:**
- Modify: `src/__tests__/lib/source-text-encoding.test.ts`

- [ ] **Step 1: Ensure newly touched source files are covered by encoding protection**
- [ ] **Step 2: Run the focused component test**
- [ ] **Step 3: Run the encoding test suite relevant to the changed files**

Run: `npm.cmd run test:run -- src/__tests__/components/headerNotifications.test.tsx src/__tests__/lib/source-text-encoding.test.ts`
