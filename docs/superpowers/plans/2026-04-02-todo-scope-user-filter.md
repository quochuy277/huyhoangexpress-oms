# Todo Scope User Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the todo scope dropdown so admins/managers can filter the work page by any assignable user.

**Architecture:** Introduce a small shared helper that parses dropdown scope values and resolves the effective assignee filter. Use that helper across the todo client and stats/list selection logic so the UI and API stay aligned.

**Tech Stack:** Next.js App Router, React client components, Vitest, Prisma

---

### Task 1: Lock scope parsing with a failing unit test

**Files:**
- Create: `src/__tests__/lib/todo-scope.test.ts`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run the focused test to verify it fails because the helper is missing**

Run: `npm.cmd run test:run -- src/__tests__/lib/todo-scope.test.ts`

### Task 2: Implement the shared scope helper

**Files:**
- Create: `src/lib/todo-scope.ts`
- Modify: `src/types/todo.ts`

- [ ] **Step 1: Add parsing for mine/all/user:id values**
- [ ] **Step 2: Add helper logic for effective assignee filtering and stats selection**
- [ ] **Step 3: Keep types small and reusable**

### Task 3: Connect API and client

**Files:**
- Modify: `src/hooks/useTodos.ts`
- Modify: `src/hooks/useTodoStats.ts`
- Modify: `src/app/api/todos/route.ts`
- Modify: `src/app/api/todos/stats/route.ts`
- Modify: `src/components/todos/TodosClient.tsx`

- [ ] **Step 1: Pass assigneeId through the todo list fetch path**
- [ ] **Step 2: Return selected-user stats from the stats route**
- [ ] **Step 3: Render user-specific options in the dropdown and map them to the helper**

### Task 4: Verify behavior

**Files:**
- Test: `src/__tests__/lib/todo-scope.test.ts`

- [ ] **Step 1: Run the focused scope helper test**
- [ ] **Step 2: Run the build to verify the full todo page compiles**

Run: `npm.cmd run test:run -- src/__tests__/lib/todo-scope.test.ts`
Run: `npm.cmd run build`
