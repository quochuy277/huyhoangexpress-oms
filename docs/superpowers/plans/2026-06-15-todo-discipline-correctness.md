# Spec A — Công việc: Đúng dữ liệu & Tập trung — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sửa 4 lỗi logic thời gian/đếm của module Công việc, thêm view "Hôm nay" (tập trung) và bộ sắp xếp cho List/Kanban.

**Architecture:** Đưa toàn bộ logic mốc ngày/phân loại hạn vào một module thuần dùng chung (`todo-dates.ts`) cho cả server lẫn client; tách hàm dựng `orderBy` (`todo-order.ts`); thêm tham số `mode` (list/board/focus) cho API danh sách; bootstrap SSR seed thẳng dữ liệu "focus" để view Hôm nay hiện ngay.

**Tech Stack:** Next.js 16 (App Router), React 19, Prisma 6 (Postgres), Vitest 4, Tailwind 4, @hello-pangea/dnd, lucide-react, date-fns.

**Spec:** `docs/superpowers/specs/2026-06-15-todo-discipline-correctness-design.md`

**Lưu ý chung:**
- Múi giờ: offset cố định +07:00 (`APP_TZ_OFFSET` phút, mặc định 420).
- "Quá hạn"/"Hôm nay" theo **mức ngày**.
- Mỗi commit: chỉ `git add` các tệp liên quan của todo (không quét thay đổi finance đang dở).
- Trước khi bắt đầu, chạy `npm run test:run` để biết baseline đang xanh.

---

### Task 1: Module ngày/phân loại — `src/lib/todo-dates.ts`

**Files:**
- Create: `src/lib/todo-dates.ts`
- Test: `src/__tests__/lib/todo-dates.test.ts`

- [ ] **Step 1: Viết test thất bại**

Create `src/__tests__/lib/todo-dates.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { classifyDue, getDayWindows, getMonthEnd, getTzOffsetMinutes } from "@/lib/todo-dates";

afterEach(() => {
  delete process.env.APP_TZ_OFFSET;
});

describe("getTzOffsetMinutes", () => {
  it("mặc định +07:00 (420 phút)", () => {
    expect(getTzOffsetMinutes()).toBe(420);
  });
  it("đọc override từ APP_TZ_OFFSET", () => {
    process.env.APP_TZ_OFFSET = "0";
    expect(getTzOffsetMinutes()).toBe(0);
  });
  it("override không hợp lệ → mặc định", () => {
    process.env.APP_TZ_OFFSET = "abc";
    expect(getTzOffsetMinutes()).toBe(420);
  });
});

describe("getDayWindows (+07:00)", () => {
  it("đầu/cuối ngày theo giờ VN", () => {
    // 2026-06-15T03:00:00Z = 10:00 VN ngày 15/06
    const { todayStart, todayEnd } = getDayWindows(new Date("2026-06-15T03:00:00Z"));
    expect(todayStart.toISOString()).toBe("2026-06-14T17:00:00.000Z"); // 00:00 VN 15/06
    expect(todayEnd.toISOString()).toBe("2026-06-15T17:00:00.000Z"); // 00:00 VN 16/06
  });

  it("23:30 VN vẫn thuộc ngày hiện tại", () => {
    // 2026-06-15T16:30:00Z = 23:30 VN 15/06
    const { todayStart } = getDayWindows(new Date("2026-06-15T16:30:00Z"));
    expect(todayStart.toISOString()).toBe("2026-06-14T17:00:00.000Z");
  });

  it("00:30 VN đã sang ngày mới", () => {
    // 2026-06-15T17:30:00Z = 00:30 VN 16/06
    const { todayStart } = getDayWindows(new Date("2026-06-15T17:30:00Z"));
    expect(todayStart.toISOString()).toBe("2026-06-15T17:00:00.000Z"); // 00:00 VN 16/06
  });

  it("Chủ Nhật thuộc tuần đang diễn ra (tuần bắt đầu Thứ Hai)", () => {
    // 2026-06-14 là Chủ Nhật. 03:00Z = 10:00 VN.
    const { weekStart, weekEnd } = getDayWindows(new Date("2026-06-14T03:00:00Z"));
    // Tuần bắt đầu Thứ Hai 2026-06-08 (00:00 VN = 2026-06-07T17:00Z)
    expect(weekStart.toISOString()).toBe("2026-06-07T17:00:00.000Z");
    expect(weekEnd.toISOString()).toBe("2026-06-14T17:00:00.000Z");
  });
});

describe("getMonthEnd (+07:00)", () => {
  it("trả về 00:00 VN ngày đầu tháng kế", () => {
    const end = getMonthEnd(new Date("2026-06-15T03:00:00Z"));
    expect(end.toISOString()).toBe("2026-06-30T17:00:00.000Z"); // 00:00 VN 01/07
  });
});

describe("classifyDue", () => {
  const now = new Date("2026-06-15T03:00:00Z"); // 10:00 VN 15/06

  it("DONE → none", () => {
    expect(classifyDue("2026-06-10T00:00:00Z", "DONE", now)).toBe("none");
  });
  it("null → none", () => {
    expect(classifyDue(null, "TODO", now)).toBe("none");
  });
  it("hạn trước hôm nay → overdue", () => {
    expect(classifyDue("2026-06-13T03:00:00Z", "TODO", now)).toBe("overdue");
  });
  it("hạn hôm nay (đã qua giờ) vẫn là today", () => {
    // 09:00Z = 16:00 VN hôm nay
    expect(classifyDue("2026-06-15T09:00:00Z", "IN_PROGRESS", now)).toBe("today");
  });
  it("hạn tương lai → upcoming", () => {
    expect(classifyDue("2026-06-20T03:00:00Z", "TODO", now)).toBe("upcoming");
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npx vitest run src/__tests__/lib/todo-dates.test.ts`
Expected: FAIL — không tìm thấy module `@/lib/todo-dates`.

- [ ] **Step 3: Cài đặt module**

Create `src/lib/todo-dates.ts`:

```ts
import type { TodoStatus } from "@prisma/client";

const DEFAULT_TZ_OFFSET_MINUTES = 420; // +07:00 (VN, không có DST)
const DAY_MS = 86_400_000;

/** Trần số việc nạp cho các view không phân trang. */
export const BOARD_OPEN_CAP = 200;
export const BOARD_DONE_LIMIT = 20;
export const FOCUS_CAP = 200;

export function getTzOffsetMinutes(): number {
  const raw = process.env.APP_TZ_OFFSET;
  if (raw == null || raw.trim() === "") return DEFAULT_TZ_OFFSET_MINUTES;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : DEFAULT_TZ_OFFSET_MINUTES;
}

export interface DayWindows {
  todayStart: Date;
  todayEnd: Date;
  weekStart: Date;
  weekEnd: Date;
}

/** Mốc đầu/cuối ngày & tuần (Thứ Hai) tính theo giờ VN, trả về dưới dạng instant tuyệt đối. */
export function getDayWindows(now: Date = new Date()): DayWindows {
  const offsetMs = getTzOffsetMinutes() * 60_000;
  const local = new Date(now.getTime() + offsetMs); // "giờ tường VN" đặt trong các trường UTC
  const todayStart = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offsetMs,
  );
  const todayEnd = new Date(todayStart.getTime() + DAY_MS);

  const dow = local.getUTCDay(); // 0=CN..6=T7 theo giờ VN
  const deltaToMonday = (dow + 6) % 7; // CN→6, T2→0, T3→1...
  const weekStart = new Date(todayStart.getTime() - deltaToMonday * DAY_MS);
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);

  return { todayStart, todayEnd, weekStart, weekEnd };
}

/** 00:00 VN của ngày đầu tháng kế (dùng cho dueFilter "month"). */
export function getMonthEnd(now: Date = new Date()): Date {
  const offsetMs = getTzOffsetMinutes() * 60_000;
  const local = new Date(now.getTime() + offsetMs);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) - offsetMs);
}

export type DueClass = "overdue" | "today" | "upcoming" | "none";

/** Phân loại hạn theo mức ngày (giờ VN). DONE/null → "none". */
export function classifyDue(
  dueDate: Date | string | null,
  status: TodoStatus,
  now: Date = new Date(),
): DueClass {
  if (status === "DONE" || dueDate == null) return "none";
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  if (Number.isNaN(due.getTime())) return "none";
  const { todayStart, todayEnd } = getDayWindows(now);
  if (due.getTime() < todayStart.getTime()) return "overdue";
  if (due.getTime() < todayEnd.getTime()) return "today";
  return "upcoming";
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npx vitest run src/__tests__/lib/todo-dates.test.ts`
Expected: PASS (tất cả).

- [ ] **Step 5: Commit**

```bash
git add src/lib/todo-dates.ts src/__tests__/lib/todo-dates.test.ts
git commit -m "feat(todo): add shared todo-dates module (VN tz, classifyDue)"
```

---

### Task 2: Dựng orderBy cho List — `src/lib/todo-order.ts`

**Files:**
- Create: `src/lib/todo-order.ts`
- Test: `src/__tests__/lib/todo-order.test.ts`

- [ ] **Step 1: Viết test thất bại**

Create `src/__tests__/lib/todo-order.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildTodoOrderBy, DEFAULT_TODO_ORDER_BY } from "@/lib/todo-order";

describe("buildTodoOrderBy", () => {
  it("không có sortBy → thứ tự mặc định", () => {
    expect(buildTodoOrderBy("", "")).toEqual(DEFAULT_TODO_ORDER_BY);
  });

  it("sortBy không hợp lệ → mặc định", () => {
    expect(buildTodoOrderBy("hocus", "asc")).toEqual(DEFAULT_TODO_ORDER_BY);
  });

  it("priority desc + tiebreaker id", () => {
    expect(buildTodoOrderBy("priority", "desc")).toEqual([{ priority: "desc" }, { id: "asc" }]);
  });

  it("dueDate asc với nulls last", () => {
    expect(buildTodoOrderBy("dueDate", "asc")).toEqual([
      { dueDate: { sort: "asc", nulls: "last" } },
      { id: "asc" },
    ]);
  });

  it("completedAt desc với nulls last", () => {
    expect(buildTodoOrderBy("completedAt", "desc")).toEqual([
      { completedAt: { sort: "desc", nulls: "last" } },
      { id: "asc" },
    ]);
  });

  it("assignee theo tên", () => {
    expect(buildTodoOrderBy("assignee", "asc")).toEqual([
      { assignee: { name: "asc" } },
      { id: "asc" },
    ]);
  });

  it("title A-Z", () => {
    expect(buildTodoOrderBy("title", "asc")).toEqual([{ title: "asc" }, { id: "asc" }]);
  });

  it("dir lạ → asc", () => {
    expect(buildTodoOrderBy("createdAt", "sideways")).toEqual([{ createdAt: "asc" }, { id: "asc" }]);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npx vitest run src/__tests__/lib/todo-order.test.ts`
Expected: FAIL — không tìm thấy `@/lib/todo-order`.

- [ ] **Step 3: Cài đặt module**

Create `src/lib/todo-order.ts`:

```ts
import type { Prisma } from "@prisma/client";

export type TodoSortField =
  | "priority"
  | "dueDate"
  | "createdAt"
  | "completedAt"
  | "assignee"
  | "title";

export type SortDir = "asc" | "desc";

export const DEFAULT_TODO_ORDER_BY: Prisma.TodoItemOrderByWithRelationInput[] = [
  { status: "asc" },
  { priority: "desc" },
  { dueDate: { sort: "asc", nulls: "last" } },
  { sortOrder: "asc" },
];

const SORTABLE = new Set<TodoSortField>([
  "priority",
  "dueDate",
  "createdAt",
  "completedAt",
  "assignee",
  "title",
]);

export function buildTodoOrderBy(
  sortBy?: string | null,
  sortDir?: string | null,
): Prisma.TodoItemOrderByWithRelationInput[] {
  if (!sortBy || !SORTABLE.has(sortBy as TodoSortField)) {
    return DEFAULT_TODO_ORDER_BY;
  }
  const dir: SortDir = sortDir === "desc" ? "desc" : "asc";
  const tiebreak: Prisma.TodoItemOrderByWithRelationInput = { id: "asc" };

  switch (sortBy as TodoSortField) {
    case "assignee":
      return [{ assignee: { name: dir } }, tiebreak];
    case "dueDate":
      return [{ dueDate: { sort: dir, nulls: "last" } }, tiebreak];
    case "completedAt":
      return [{ completedAt: { sort: dir, nulls: "last" } }, tiebreak];
    case "priority":
      return [{ priority: dir }, tiebreak];
    case "createdAt":
      return [{ createdAt: dir }, tiebreak];
    case "title":
      return [{ title: dir }, tiebreak];
    default:
      return DEFAULT_TODO_ORDER_BY;
  }
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npx vitest run src/__tests__/lib/todo-order.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/todo-order.ts src/__tests__/lib/todo-order.test.ts
git commit -m "feat(todo): add buildTodoOrderBy for list sorting"
```

---

### Task 3: Redefine "today" → "dueToday" + dùng tz windows ở các endpoint đọc

**Files:**
- Modify: `src/types/todo.ts` (TodoStats)
- Modify: `src/app/api/todos/stats/route.ts`
- Modify: `src/app/api/todos/reminders/route.ts`
- Modify: `src/app/api/todos/overdue-count/route.ts`
- Modify: `src/components/todos/TodoSummaryCards.tsx`
- Modify: `src/__tests__/app/todos-page.test.tsx` (fixture)

- [ ] **Step 1: Đổi kiểu `TodoStats`**

Trong `src/types/todo.ts`, đổi trường `today` thành `dueToday`:

```ts
export interface TodoStats {
  dueToday: number;
  overdue: number;
  inProgress: number;
  doneWeek: number;
}
```

- [ ] **Step 2: Cập nhật `stats/route.ts` dùng `getDayWindows` + `dueToday`**

Trong `src/app/api/todos/stats/route.ts`:

Thêm import:
```ts
import { getDayWindows } from "@/lib/todo-dates";
```

Thay hàm `countStatsForAssignee` (bỏ điều kiện `createdAt`, đổi field):
```ts
async function countStatsForAssignee({
  assigneeId,
  todayStart,
  todayEnd,
  weekStart,
  weekEnd,
}: {
  assigneeId?: string | null;
  todayStart: Date;
  todayEnd: Date;
  weekStart: Date;
  weekEnd: Date;
}) {
  const assigneeWhere = assigneeId ? { assigneeId } : {};

  const [dueToday, overdue, inProgress, doneWeek] = await Promise.all([
    prisma.todoItem.count({
      where: { ...assigneeWhere, status: { not: "DONE" }, dueDate: { gte: todayStart, lt: todayEnd } },
    }),
    prisma.todoItem.count({
      where: { ...assigneeWhere, status: { not: "DONE" }, dueDate: { lt: todayStart } },
    }),
    prisma.todoItem.count({
      where: { ...assigneeWhere, status: "IN_PROGRESS" },
    }),
    prisma.todoItem.count({
      where: { ...assigneeWhere, status: "DONE", completedAt: { gte: weekStart, lt: weekEnd } },
    }),
  ]);

  return { dueToday, overdue, inProgress, doneWeek };
}
```

Trong `GET`, thay khối tính mốc ngày:
```ts
  const { todayStart, todayEnd, weekStart, weekEnd } = getDayWindows();
```
(xóa các dòng `const now = ...; const todayStart = new Date(now...)...weekEnd` cũ).

- [ ] **Step 3: Cập nhật `reminders/route.ts` dùng `getDayWindows`**

Trong `src/app/api/todos/reminders/route.ts`, thêm import `import { getDayWindows } from "@/lib/todo-dates";` và thay:
```ts
  const { todayStart, todayEnd } = getDayWindows();
```
(xóa 3 dòng `const now`/`todayStart`/`todayEnd` cũ). Phần còn lại giữ nguyên.

- [ ] **Step 4: Cập nhật `overdue-count/route.ts` dùng `getDayWindows`**

Trong `src/app/api/todos/overdue-count/route.ts`, thêm import và thay:
```ts
  const { todayStart } = getDayWindows();
```
(xóa `const now`/`todayStart` cũ).

- [ ] **Step 5: Cập nhật thẻ KPI số 1 trong `TodoSummaryCards.tsx`**

Trong `src/components/todos/TodoSummaryCards.tsx`, sửa phần tử đầu mảng `cards` và đổi prop:

```tsx
interface TodoSummaryCardsProps {
  stats: TodoStats | null;
  onClickDueToday: () => void;
  onClickOverdue: () => void;
}

const cards = [
  { key: "dueToday" as const, label: "Đến hạn hôm nay", color: "text-blue-600", borderColor: "border-l-blue-600", bg: "bg-blue-50", icon: ListTodo, clickable: true, action: "dueToday" as const },
  { key: "overdue" as const, label: "Quá hạn", color: "text-red-600", borderColor: "border-l-red-600", bg: "bg-red-50", icon: AlertTriangle, clickable: true, action: "overdue" as const },
  { key: "inProgress" as const, label: "Đang làm", color: "text-amber-600", borderColor: "border-l-amber-600", bg: "bg-amber-50", icon: Clock },
  { key: "doneWeek" as const, label: "Hoàn thành tuần này", color: "text-green-600", borderColor: "border-l-green-600", bg: "bg-green-50", icon: Check },
];
```

Và trong thân `TodoSummaryCards`, sửa `onClick`:
```tsx
export function TodoSummaryCards({ stats, onClickDueToday, onClickOverdue }: TodoSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        const value = stats?.[c.key] ?? 0;
        const handleClick =
          (c as { action?: "dueToday" | "overdue" }).action === "dueToday"
            ? onClickDueToday
            : (c as { action?: "dueToday" | "overdue" }).action === "overdue"
              ? onClickOverdue
              : undefined;
        return (
          <button
            key={c.key}
            onClick={handleClick}
            className={`${c.bg} ${c.borderColor} border-l-[3px] border border-l-current rounded-[10px] px-3 sm:px-4 py-3 sm:py-3.5 text-left transition-all ${
              c.clickable ? "cursor-pointer hover:shadow-md active:scale-[0.98]" : "cursor-default"
            }`}
            style={{ borderColor: "transparent", borderLeftColor: "currentColor" }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xl sm:text-2xl font-extrabold ${c.color}`}>{value}</span>
              <Icon size={16} className={`${c.color} opacity-50 hidden sm:block`} />
            </div>
            <div className="text-[11px] sm:text-xs font-semibold text-gray-500 leading-tight">{c.label}</div>
          </button>
        );
      })}
    </div>
  );
}
```

(TodosClient sẽ truyền 2 callback ở Task 6.)

- [ ] **Step 6: Cập nhật fixture trong `todos-page.test.tsx`**

Trong `src/__tests__/app/todos-page.test.tsx`, đổi `today` → `dueToday` trong fixture stats:
```ts
      stats: { mine: { dueToday: 0, overdue: 0, inProgress: 0, doneWeek: 0 }, all: { dueToday: 0, overdue: 0, inProgress: 0, doneWeek: 0 }, selected: null },
```

- [ ] **Step 7: Chạy test + typecheck**

Run: `npx vitest run src/__tests__/app/todos-page.test.tsx && npx tsc --noEmit`
Expected: test PASS; tsc báo lỗi ở `TodoSummaryCards` được dùng tại `TodosClient` (prop mới chưa nối) — **đây là lỗi dự kiến**, sẽ xử lý ở Task 6. Nếu muốn giữ xanh tuyệt đối giữa các commit, để Step 8 commit sau Task 6; còn nếu chấp nhận một commit trung gian thì commit ngay với ghi chú.

> Ghi chú: vì `TodosClient` (Task 6) và `TodoSummaryCards` (task này) phụ thuộc lẫn nhau qua props, **gộp commit của Task 3 và Task 6 nếu thực thi tuần tự trong 1 phiên**, hoặc tạm thời giữ chữ ký prop cũ `onClickOverdue` + thêm `onClickDueToday?` optional để tsc xanh. Plan này chọn: giữ `onClickDueToday` **optional** để không vỡ build:

Sửa lại chữ ký cho an toàn build trung gian:
```tsx
interface TodoSummaryCardsProps {
  stats: TodoStats | null;
  onClickDueToday?: () => void;
  onClickOverdue: () => void;
}
```

- [ ] **Step 8: Commit**

```bash
git add src/types/todo.ts src/app/api/todos/stats/route.ts src/app/api/todos/reminders/route.ts src/app/api/todos/overdue-count/route.ts src/components/todos/TodoSummaryCards.tsx src/__tests__/app/todos-page.test.tsx
git commit -m "feat(todo): redefine today→dueToday and use VN tz windows in read endpoints"
```

---

### Task 4: API `GET /api/todos` — tham số `mode` + `sortBy`/`sortDir`

**Files:**
- Modify: `src/app/api/todos/route.ts` (hàm `GET`)
- Test: `src/__tests__/app/api/todos-list-route.test.ts`

- [ ] **Step 1: Viết test thất bại**

Create `src/__tests__/app/api/todos-list-route.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/todo-permissions", () => ({ canViewAllTodos: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { todoItem: { findMany: vi.fn(), count: vi.fn() } },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewAllTodos } from "@/lib/todo-permissions";

function req(qs: string) {
  return new NextRequest(`http://localhost/api/todos${qs}`);
}

describe("GET /api/todos modes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1", role: "STAFF" } } as never);
    vi.mocked(canViewAllTodos).mockReturnValue(false as never);
    vi.mocked(prisma.todoItem.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.todoItem.count).mockResolvedValue(0 as never);
  });

  it("mode=focus: 1 query, status not DONE + dueDate lt todayEnd, take FOCUS_CAP", async () => {
    const { GET } = await import("@/app/api/todos/route");
    await GET(req("?mode=focus&scope=mine"));
    expect(prisma.todoItem.findMany).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(prisma.todoItem.findMany).mock.calls[0][0] as any;
    expect(arg.where.status).toEqual({ not: "DONE" });
    expect(arg.where.dueDate).toHaveProperty("lt");
    expect(arg.take).toBe(200);
  });

  it("mode=board: 2 query (open + done)", async () => {
    const { GET } = await import("@/app/api/todos/route");
    await GET(req("?mode=board&scope=mine"));
    expect(prisma.todoItem.findMany).toHaveBeenCalledTimes(2);
    const openArg = vi.mocked(prisma.todoItem.findMany).mock.calls[0][0] as any;
    const doneArg = vi.mocked(prisma.todoItem.findMany).mock.calls[1][0] as any;
    expect(openArg.where.status).toEqual({ not: "DONE" });
    expect(openArg.take).toBe(200);
    expect(doneArg.where.status).toBe("DONE");
    expect(doneArg.take).toBe(20);
  });

  it("mode=list (mặc định) với sortBy=dueDate&sortDir=desc → orderBy đúng", async () => {
    const { GET } = await import("@/app/api/todos/route");
    await GET(req("?scope=mine&sortBy=dueDate&sortDir=desc"));
    const arg = vi.mocked(prisma.todoItem.findMany).mock.calls[0][0] as any;
    expect(arg.orderBy).toEqual([
      { dueDate: { sort: "desc", nulls: "last" } },
      { id: "asc" },
    ]);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `npx vitest run src/__tests__/app/api/todos-list-route.test.ts`
Expected: FAIL (focus/board chưa tồn tại; mode=focus hiện vẫn phân trang & gọi count).

- [ ] **Step 3: Thay toàn bộ hàm `GET` trong `src/app/api/todos/route.ts`**

Thêm import ở đầu file:
```ts
import { getDayWindows, getMonthEnd, BOARD_OPEN_CAP, BOARD_DONE_LIMIT, FOCUS_CAP } from "@/lib/todo-dates";
import { buildTodoOrderBy, DEFAULT_TODO_ORDER_BY } from "@/lib/todo-order";
```

Thêm hằng include dùng chung (đặt trên hàm `GET`):
```ts
const todoListInclude = {
  assignee: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  linkedOrder: {
    select: { id: true, requestCode: true, shopName: true, status: true, codAmount: true },
  },
  _count: { select: { comments: true } },
} as const;
```

Thay toàn bộ thân hàm `GET` (giữ phần auth) bằng:
```ts
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") || "mine";
  const status = url.searchParams.get("status") || "";
  const priority = url.searchParams.get("priority") || "";
  const source = url.searchParams.get("source") || "";
  const dueFilter = url.searchParams.get("dueFilter") || "";
  const search = url.searchParams.get("search") || "";
  const assigneeId = url.searchParams.get("assigneeId") || "";
  const mode = url.searchParams.get("mode") || "list";
  const sortBy = url.searchParams.get("sortBy") || "";
  const sortDir = url.searchParams.get("sortDir") || "";
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20", 10);
  const hideDone = url.searchParams.get("hideDone") === "true";
  const canViewAll = canViewAllTodos(session.user);

  const where: Record<string, unknown> = {};
  const effectiveAssigneeId = resolveTodoAssigneeFilter(scope, session.user.id, assigneeId, canViewAll);
  if (effectiveAssigneeId) where.assigneeId = effectiveAssigneeId;

  if (priority) where.priority = priority;
  if (source) where.source = source;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { linkedOrder: { requestCode: { contains: search, mode: "insensitive" } } },
    ];
  }

  const { todayStart, todayEnd, weekEnd } = getDayWindows();

  // focus: quá hạn + đến hạn hôm nay (chưa DONE), không phân trang
  if (mode === "focus") {
    const todos = await prisma.todoItem.findMany({
      where: { ...where, status: { not: "DONE" }, dueDate: { lt: todayEnd } },
      include: todoListInclude,
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { priority: "desc" }],
      take: FOCUS_CAP,
    });
    return NextResponse.json({
      todos,
      pagination: { page: 1, pageSize: todos.length, total: todos.length, totalPages: 1 },
    });
  }

  // board (Kanban): toàn bộ việc chưa DONE + N việc DONE gần nhất
  if (mode === "board") {
    const [open, done] = await Promise.all([
      prisma.todoItem.findMany({
        where: { ...where, status: { not: "DONE" } },
        include: todoListInclude,
        orderBy: DEFAULT_TODO_ORDER_BY,
        take: BOARD_OPEN_CAP,
      }),
      prisma.todoItem.findMany({
        where: { ...where, status: "DONE" },
        include: todoListInclude,
        orderBy: { completedAt: "desc" },
        take: BOARD_DONE_LIMIT,
      }),
    ]);
    const todos = [...open, ...done];
    return NextResponse.json({
      todos,
      pagination: { page: 1, pageSize: todos.length, total: todos.length, totalPages: 1 },
    });
  }

  // list (mặc định): lọc + phân trang + sắp xếp
  if (status) where.status = status;
  else if (hideDone) where.status = { not: "DONE" };

  if (dueFilter === "overdue") {
    where.dueDate = { lt: todayStart };
    where.status = { not: "DONE" };
  } else if (dueFilter === "today") {
    where.dueDate = { gte: todayStart, lt: todayEnd };
  } else if (dueFilter === "week") {
    where.dueDate = { gte: todayStart, lt: weekEnd };
  } else if (dueFilter === "month") {
    where.dueDate = { gte: todayStart, lt: getMonthEnd() };
  } else if (dueFilter === "none") {
    where.dueDate = null;
  }

  const [todos, total] = await Promise.all([
    prisma.todoItem.findMany({
      where,
      include: todoListInclude,
      orderBy: buildTodoOrderBy(sortBy, sortDir),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.todoItem.count({ where }),
  ]);

  return NextResponse.json({
    todos,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `npx vitest run src/__tests__/app/api/todos-list-route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/todos/route.ts src/__tests__/app/api/todos-list-route.test.ts
git commit -m "feat(todo): add mode (list/board/focus) and sort params to GET /api/todos"
```

---

### Task 5: Bootstrap SSR seed dữ liệu "focus"

**Files:**
- Modify: `src/lib/todo-page-data.ts`
- Modify: `src/__tests__/app/todos-page.test.tsx` (fixture → focus seed; vẫn `todos: []`)
- (bootstrap-state test giữ nguyên — `shouldFetchTodoBootstrap` không đổi)

- [ ] **Step 1: Viết lại `getTodosBootstrapData` dùng tz + seed focus**

Trong `src/lib/todo-page-data.ts`:

Thêm import:
```ts
import { getDayWindows, FOCUS_CAP } from "@/lib/todo-dates";
```

Thay hàm `countStatsForAssignee` cho khớp `dueToday` (giống stats route — bỏ `createdAt`):
```ts
async function countStatsForAssignee({
  assigneeId,
  todayStart,
  todayEnd,
  weekStart,
  weekEnd,
}: {
  assigneeId?: string | null;
  todayStart: Date;
  todayEnd: Date;
  weekStart: Date;
  weekEnd: Date;
}) {
  const assigneeWhere = assigneeId ? { assigneeId } : {};

  const [dueToday, overdue, inProgress, doneWeek] = await Promise.all([
    prisma.todoItem.count({
      where: { ...assigneeWhere, status: { not: "DONE" }, dueDate: { gte: todayStart, lt: todayEnd } },
    }),
    prisma.todoItem.count({
      where: { ...assigneeWhere, status: { not: "DONE" }, dueDate: { lt: todayStart } },
    }),
    prisma.todoItem.count({
      where: { ...assigneeWhere, status: "IN_PROGRESS" },
    }),
    prisma.todoItem.count({
      where: { ...assigneeWhere, status: "DONE", completedAt: { gte: weekStart, lt: weekEnd } },
    }),
  ]);

  return { dueToday, overdue, inProgress, doneWeek };
}
```

Thay phần đầu `getTodosBootstrapData` (tính mốc + truy vấn): đổi truy vấn danh sách "mine page1" thành **focus list** và đổi `total`/`pagination` theo focus:
```ts
export async function getTodosBootstrapData(user: TodoPageUser): Promise<TodoBootstrapData> {
  const { todayStart, todayEnd, weekStart, weekEnd } = getDayWindows();
  const canViewAll = canViewAllTodos(user);

  const [focusTodos, mine, all, overdueItems, dueTodayItems, overdueTotal, dueTodayTotal, users] =
    await Promise.all([
      prisma.todoItem.findMany({
        where: { assigneeId: user.id, status: { not: "DONE" }, dueDate: { lt: todayEnd } },
        include: {
          assignee: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          linkedOrder: {
            select: { id: true, requestCode: true, shopName: true, status: true, codAmount: true },
          },
          _count: { select: { comments: true } },
        },
        orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { priority: "desc" }],
        take: FOCUS_CAP,
      }),
      countStatsForAssignee({ assigneeId: user.id, todayStart, todayEnd, weekStart, weekEnd }),
      canViewAll
        ? countStatsForAssignee({ assigneeId: null, todayStart, todayEnd, weekStart, weekEnd })
        : Promise.resolve(null),
      prisma.todoItem.findMany({
        where: { assigneeId: user.id, status: { not: "DONE" }, dueDate: { lt: todayStart } },
        select: { id: true, title: true, dueDate: true },
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
      prisma.todoItem.findMany({
        where: { assigneeId: user.id, status: { not: "DONE" }, dueDate: { gte: todayStart, lt: todayEnd } },
        select: { id: true, title: true },
        orderBy: { priority: "desc" },
        take: 5,
      }),
      prisma.todoItem.count({ where: { assigneeId: user.id, status: { not: "DONE" }, dueDate: { lt: todayStart } } }),
      prisma.todoItem.count({ where: { assigneeId: user.id, status: { not: "DONE" }, dueDate: { gte: todayStart, lt: todayEnd } } }),
      canViewAll
        ? prisma.user.findMany({ select: { id: true, name: true, role: true }, orderBy: { name: "asc" } })
        : Promise.resolve([]),
    ]);

  const todos = focusTodos.map((todo) => ({
    ...todo,
    dueDate: todo.dueDate ? todo.dueDate.toISOString() : null,
    completedAt: todo.completedAt ? todo.completedAt.toISOString() : null,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
    linkedOrder: todo.linkedOrder
      ? {
          ...todo.linkedOrder,
          codAmount: todo.linkedOrder.codAmount != null ? Number(todo.linkedOrder.codAmount) : null,
        }
      : null,
  }));

  return {
    todos,
    pagination: { page: 1, pageSize: todos.length, total: todos.length, totalPages: 1 },
    stats: {
      mine,
      all: all ?? mine,
      selected: null,
    },
    reminders: {
      overdue: {
        count: overdueTotal,
        items: overdueItems.map((item) => ({
          id: item.id,
          title: item.title,
          daysOverdue: Math.floor((todayStart.getTime() - new Date(item.dueDate!).getTime()) / 86400000),
        })),
      },
      dueToday: {
        count: dueTodayTotal,
        items: dueTodayItems,
      },
    },
    users,
  };
}
```

> `TodoBootstrapData.todos` giờ mang **danh sách focus** (overdue + today). Không đổi shape của type ⇒ `useTodos`/`useTodoStats`/`shouldFetchTodoBootstrap` không cần sửa.

- [ ] **Step 2: Cập nhật fixture stats trong `todos-page.test.tsx`** (đã đổi ở Task 3; xác nhận vẫn `dueToday`). Không cần đổi thêm vì `todos: []` vẫn hợp lệ.

- [ ] **Step 3: Chạy test + typecheck**

Run: `npx vitest run src/__tests__/app/todos-page.test.tsx src/__tests__/lib/todo-bootstrap-state.test.ts && npx tsc --noEmit`
Expected: 2 file test PASS. (tsc có thể vẫn báo lỗi do TodosClient/TodoSummaryCards chưa nối — xử lý ở Task 6.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/todo-page-data.ts
git commit -m "feat(todo): seed focus (overdue+today) list in SSR bootstrap"
```

---

### Task 6: `useTodos` (mode+sort) + `TodosClient` (view 'today' mặc định, sort state)

**Files:**
- Modify: `src/hooks/useTodos.ts`
- Modify: `src/components/todos/constants.ts` (thêm tùy chọn sort)
- Modify: `src/components/todos/TodosClient.tsx`

- [ ] **Step 1: `useTodos` nhận `mode` + `sortBy`/`sortDir`**

Trong `src/hooks/useTodos.ts`, sửa `UseTodosOptions` và phần dựng params trong `fetchTodos`:

```ts
interface UseTodosOptions {
  scope: "mine" | "all";
  assigneeId?: string | null;
  filters: TodoFilters;
  hideDone: boolean;
  page: number;
  pageSize: number;
  mode?: "list" | "board" | "focus";
  sortBy?: string;
  sortDir?: "asc" | "desc";
}
```

Trong `fetchTodos`, sau khi tạo `params`:
```ts
      const params = new URLSearchParams({
        scope: opts.scope,
        page: String(opts.page),
        pageSize: String(opts.pageSize),
        hideDone: String(opts.hideDone),
        mode: opts.mode || "list",
      });
      if (opts.assigneeId) params.set("assigneeId", opts.assigneeId);
      if (opts.filters.search) params.set("search", opts.filters.search);
      if (opts.filters.source) params.set("source", opts.filters.source);
      if (opts.filters.priority) params.set("priority", opts.filters.priority);
      if (opts.filters.dueFilter) params.set("dueFilter", opts.filters.dueFilter);
      if ((opts.mode ?? "list") === "list" && opts.sortBy) {
        params.set("sortBy", opts.sortBy);
        params.set("sortDir", opts.sortDir || "asc");
      }
```

- [ ] **Step 2: Thêm tùy chọn sort vào `constants.ts`**

Cuối `src/components/todos/constants.ts`, thêm:

```ts
export type KanbanSortField = "manual" | "priority" | "dueDate" | "createdAt";

export const KANBAN_SORT_OPTIONS: { value: KanbanSortField; label: string }[] = [
  { value: "manual", label: "Thủ công" },
  { value: "priority", label: "Ưu tiên" },
  { value: "dueDate", label: "Thời hạn" },
  { value: "createdAt", label: "Ngày tạo" },
];
```

- [ ] **Step 3: `TodosClient` — view 'today', mode mapping, sort state, localStorage**

Trong `src/components/todos/TodosClient.tsx`:

(a) Thêm import:
```ts
import { TodoTodayView } from "./TodoTodayView";
import type { KanbanSortField } from "./constants";
```

(b) Đổi state `view` và thêm state sort (thay khối khởi tạo `view`):
```tsx
  const [view, setView] = useState<"today" | "list" | "kanban">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("todoView") as "today" | "list" | "kanban") || "today";
    }
    return "today";
  });
  const [listSort, setListSort] = useState<{ by: string; dir: "asc" | "desc" } | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("todoListSort");
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [kanbanSort, setKanbanSort] = useState<Record<string, KanbanSortField>>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("todoKanbanSort");
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    }
    return {};
  });
```

(c) Tính `mode` và sửa `doFetch` + effect mount:
```tsx
  const mode: "today" extends never ? never : "list" | "board" | "focus" =
    view === "today" ? "focus" : view === "kanban" ? "board" : "list";

  const doFetch = useCallback(() => {
    fetchTodos({
      scope,
      assigneeId,
      filters,
      hideDone,
      page,
      pageSize: 20,
      mode,
      sortBy: listSort?.by,
      sortDir: listSort?.dir,
    });
  }, [assigneeId, fetchTodos, filters, hideDone, page, scope, mode, listSort]);

  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      if (view === "today") return; // bootstrap đã seed focus
    }
    void doFetch();
  }, [doFetch, skipInitialFetchRef, view]);
```

> Nếu dòng khai báo `mode` ở trên gây vướng kiểu, dùng bản đơn giản:
> ```tsx
> const mode: "list" | "board" | "focus" =
>   view === "today" ? "focus" : view === "kanban" ? "board" : "list";
> ```

(d) localStorage cho 3 lựa chọn (thay effect `todoView` cũ, thêm 2 effect):
```tsx
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("todoView", view);
  }, [view]);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("todoListSort", JSON.stringify(listSort));
  }, [listSort]);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("todoKanbanSort", JSON.stringify(kanbanSort));
  }, [kanbanSort]);
```

(e) Handler đổi sort List + sort cột Kanban:
```tsx
  const handleListSortChange = (field: string) => {
    setListSort((current) => {
      if (current?.by === field) {
        return { by: field, dir: current.dir === "asc" ? "desc" : "asc" };
      }
      return { by: field, dir: "asc" };
    });
    setPage(1);
  };

  const handleKanbanSortChange = (columnId: string, field: KanbanSortField) => {
    setKanbanSort((current) => ({ ...current, [columnId]: field }));
  };
```

(f) Sửa `handleDragEnd` để bỏ qua reorder-trong-cột khi cột đó đang sắp theo trường:
```tsx
  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const sameColumn = result.source.droppableId === result.destination.droppableId;
    if (sameColumn && (kanbanSort[result.destination.droppableId] ?? "manual") !== "manual") {
      return; // đang sắp theo trường → không cho đổi thứ tự trong cột
    }

    const statusMap: Record<string, string> = {
      todo: "TODO",
      inprogress: "IN_PROGRESS",
      done: "DONE",
    };
    const nextStatus = statusMap[result.destination.droppableId];
    const draggedTodo = todos.find((todo) => todo.id === result.draggableId);
    if (!draggedTodo || !nextStatus) return;

    await reorderKanban(draggedTodo, nextStatus, result.destination.index);
    void fetchStats(assigneeId);
  };
```

(g) Bộ chuyển chế độ 3 nút (thay khối 2 nút List/Kanban hiện tại):
```tsx
          <div className="flex overflow-hidden rounded-lg border-[1.5px] border-gray-200">
            {([
              { key: "today", label: "Hôm nay", Icon: CalendarClock },
              { key: "list", label: "Danh sách", Icon: ListTodo },
              { key: "kanban", label: "Kanban", Icon: Columns3 },
            ] as const).map((opt, idx) => (
              <button
                key={opt.key}
                onClick={() => setView(opt.key)}
                className={`flex items-center gap-1 px-3 py-2 text-xs font-semibold transition-colors sm:py-1.5 ${idx > 0 ? "border-l border-gray-200" : ""} ${
                  view === opt.key ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                <opt.Icon size={14} /> <span className="hidden sm:inline">{opt.label}</span>
              </button>
            ))}
          </div>
```
Và thêm `CalendarClock` vào import lucide (dòng `import { Columns3, ListTodo, Loader2, Plus } from "lucide-react";` → thêm `CalendarClock`).

(h) Nối callback KPI (thay JSX `<TodoSummaryCards .../>`):
```tsx
      <TodoSummaryCards
        stats={scopeStats}
        onClickDueToday={() => {
          setView("list");
          setFilters((current) => ({ ...current, dueFilter: "today" }));
          setPage(1);
        }}
        onClickOverdue={() => {
          setView("list");
          setFilters((current) => ({ ...current, dueFilter: "overdue" }));
          setPage(1);
        }}
      />
```
(Tương tự, trong `TodoReminderBanner` `onViewOverdue` thêm `setView("list")` trước khi set filter.)

(i) Khối render nội dung (thay nhánh `view === "list" ? ... : <TodoKanbanView .../>`):
```tsx
        ) : view === "today" ? (
          <TodoTodayView
            todos={todos}
            onToggleComplete={handleToggleComplete}
            onStatusChange={handleStatusChange}
            onSelect={setSelectedTodo}
            onDelete={setDeleteId}
            onViewOrder={setOrderDetailCode}
          />
        ) : view === "list" ? (
          <TodoListView
            todos={todos}
            pagination={pagination}
            sortBy={listSort?.by ?? null}
            sortDir={listSort?.dir ?? null}
            onSortChange={handleListSortChange}
            onToggleComplete={handleToggleComplete}
            onStatusChange={handleStatusChange}
            onSelect={setSelectedTodo}
            onDelete={setDeleteId}
            onViewOrder={setOrderDetailCode}
            onPageChange={setPage}
          />
        ) : (
          <TodoKanbanView
            todos={todos}
            columnSort={kanbanSort}
            onColumnSortChange={handleKanbanSortChange}
            onDragEnd={handleDragEnd}
            onSelect={setSelectedTodo}
          />
        )}
```

- [ ] **Step 4: Typecheck (sẽ còn lỗi cho tới khi Task 7-9 xong)**

Run: `npx tsc --noEmit`
Expected: lỗi "Cannot find module ./TodoTodayView" và props mới của TodoListView/TodoKanbanView chưa khai báo — **dự kiến**, hoàn tất ở Task 7-9. Không commit lẻ task này; gộp commit với Task 7-9, hoặc tạm comment phần render `TodoTodayView` nếu cần build trung gian.

> Khuyến nghị thực thi: làm liền Task 6→7→8→9 rồi mới commit chung "feat(todo): today view + List/Kanban sorting". Các step commit dưới đây giả định đã hoàn tất cả 4 task.

---

### Task 7: Component `TodoTodayView`

**Files:**
- Create: `src/components/todos/TodoTodayView.tsx`

- [ ] **Step 1: Tạo component**

Create `src/components/todos/TodoTodayView.tsx`:

```tsx
"use client";

import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";

import { classifyDue } from "@/lib/todo-dates";
import type { TodoItemData } from "@/types/todo";
import { PRIORITY_CONFIG, SOURCE_CONFIG } from "./constants";

interface TodoTodayViewProps {
  todos: TodoItemData[];
  onToggleComplete: (todo: TodoItemData) => void;
  onStatusChange: (todo: TodoItemData, status: string) => void;
  onSelect: (todo: TodoItemData) => void;
  onDelete: (id: string) => void;
  onViewOrder: (code: string) => void;
}

function Row({
  todo,
  overdue,
  onToggleComplete,
  onSelect,
  onDelete,
  onViewOrder,
}: {
  todo: TodoItemData;
  overdue: boolean;
  onToggleComplete: (todo: TodoItemData) => void;
  onSelect: (todo: TodoItemData) => void;
  onDelete: (id: string) => void;
  onViewOrder: (code: string) => void;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-none hover:bg-blue-50/30">
      <input
        type="checkbox"
        checked={todo.status === "DONE"}
        onChange={() => onToggleComplete(todo)}
        className="mt-0.5 h-[18px] w-[18px] cursor-pointer accent-blue-600"
      />
      <div className="min-w-0 flex-1">
        <div
          onClick={() => onSelect(todo)}
          className="cursor-pointer truncate text-sm font-semibold text-slate-800 hover:text-blue-600"
        >
          {todo.title}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className={`rounded px-1.5 py-0.5 font-semibold ${PRIORITY_CONFIG[todo.priority]?.twBg || ""}`}>
            {PRIORITY_CONFIG[todo.priority]?.label}
          </span>
          {todo.source !== "MANUAL" && (
            <span className={`rounded px-1.5 py-0.5 font-semibold ${SOURCE_CONFIG[todo.source]?.twBg || ""}`}>
              {SOURCE_CONFIG[todo.source]?.label}
            </span>
          )}
          {todo.dueDate && (
            <span className={`font-medium ${overdue ? "text-red-600" : "text-amber-600"}`}>
              ⏰ {format(new Date(todo.dueDate), "dd/MM HH:mm")}
            </span>
          )}
          {todo.linkedOrder && (
            <button
              onClick={() => onViewOrder(todo.linkedOrder!.requestCode)}
              className="font-semibold text-blue-600 hover:underline"
            >
              {todo.linkedOrder.requestCode}
            </button>
          )}
          {todo.assignee?.name && <span className="text-gray-400">{todo.assignee.name}</span>}
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <button onClick={() => onSelect(todo)} className="rounded-md border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50">
          <Pencil size={14} />
        </button>
        <button onClick={() => onDelete(todo.id)} className="rounded-md border border-red-200 bg-white p-1.5 text-red-600 hover:bg-red-50">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export function TodoTodayView({
  todos,
  onToggleComplete,
  onStatusChange: _onStatusChange,
  onSelect,
  onDelete,
  onViewOrder,
}: TodoTodayViewProps) {
  const now = new Date();
  const overdue = todos
    .filter((t) => classifyDue(t.dueDate, t.status, now) === "overdue")
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  const today = todos
    .filter((t) => classifyDue(t.dueDate, t.status, now) === "today")
    .sort((a, b) => {
      const rank: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const byPriority = (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9);
      if (byPriority !== 0) return byPriority;
      return new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime();
    });

  if (overdue.length === 0 && today.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400">
        Hết việc cần xử lý hôm nay 🎉
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {overdue.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-red-200 bg-white">
          <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-[13px] font-bold text-red-600">
            Quá hạn ({overdue.length})
          </div>
          {overdue.map((todo) => (
            <Row key={todo.id} todo={todo} overdue onToggleComplete={onToggleComplete} onSelect={onSelect} onDelete={onDelete} onViewOrder={onViewOrder} />
          ))}
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-[13px] font-bold text-slate-600">
          Đến hạn hôm nay ({today.length})
        </div>
        {today.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">Không còn việc đến hạn hôm nay</div>
        ) : (
          today.map((todo) => (
            <Row key={todo.id} todo={todo} overdue={false} onToggleComplete={onToggleComplete} onSelect={onSelect} onDelete={onDelete} onViewOrder={onViewOrder} />
          ))
        )}
      </div>
    </div>
  );
}
```

> `onStatusChange` được nhận để giữ chữ ký nhất quán với các view khác (đổi tên `_onStatusChange` để tránh cảnh báo unused).

---

### Task 8: `TodoListView` — màu theo `classifyDue` + sắp xếp theo tiêu đề cột

**Files:**
- Modify: `src/components/todos/TodoListView.tsx`

- [ ] **Step 1: Import + props sort + dùng `classifyDue`**

Thêm import:
```ts
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Pencil, Trash2, UserCheck } from "lucide-react";
import { classifyDue } from "@/lib/todo-dates";
```
(thay dòng import lucide cũ — thêm `ArrowDown`, `ArrowUp`).

Mở rộng `TodoListViewProps`:
```ts
interface TodoListViewProps {
  todos: TodoItemData[];
  pagination: TodoPagination;
  sortBy: string | null;
  sortDir: "asc" | "desc" | null;
  onSortChange: (field: string) => void;
  onToggleComplete: (todo: TodoItemData) => void;
  onStatusChange: (todo: TodoItemData, status: string) => void;
  onSelect: (todo: TodoItemData) => void;
  onDelete: (id: string) => void;
  onViewOrder: (code: string) => void;
  onPageChange: (page: number) => void;
}
```

Thay 2 hàm `isDueOverdue`/`isDueToday` cục bộ bằng cách dùng `classifyDue`. Trong cả hai nhánh (mobile + desktop) nơi tính `overdue`/`today`:
```ts
            const cls = classifyDue(todo.dueDate, todo.status, new Date());
            const overdue = cls === "overdue";
            const today = cls === "today";
```
(xóa định nghĩa `isDueOverdue`/`isDueToday` ở đầu file và các lời gọi `!isDone && isDueOverdue(...)`).

- [ ] **Step 2: Header cột bấm để sắp**

Trong hàm `TodoListView`, thêm helper trước `return`:
```tsx
  const SortTh = ({
    field,
    label,
    className,
  }: {
    field: string;
    label: string;
    className?: string;
  }) => (
    <th className={`px-2.5 py-2 text-left font-semibold text-slate-600 ${className || ""}`}>
      <button
        onClick={() => onSortChange(field)}
        className="inline-flex items-center gap-1 hover:text-blue-600"
      >
        {label}
        {sortBy === field &&
          (sortDir === "desc" ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
      </button>
    </th>
  );
```

Thay `<thead>` desktop bằng (giữ các cột không sắp là `<th>` thường):
```tsx
          <thead>
            <tr className="border-b-[1.5px] border-gray-200 bg-slate-50">
              <th className="w-9 p-2 text-center">☐</th>
              <SortTh field="title" label={TEXT.headers.title} />
              <th className="w-[120px] px-2.5 py-2 text-left font-semibold text-slate-600">{TEXT.headers.orderCode}</th>
              <SortTh field="priority" label={TEXT.headers.priority} className="w-[90px]" />
              <th className="w-[110px] px-2.5 py-2 text-left font-semibold text-slate-600">{TEXT.headers.status}</th>
              <SortTh field="dueDate" label={TEXT.headers.dueDate} className="w-[100px]" />
              <SortTh field="createdAt" label={TEXT.headers.createdAt} className="w-[110px]" />
              <SortTh field="completedAt" label={TEXT.headers.completedAt} className="w-[110px]" />
              <SortTh field="assignee" label={TEXT.headers.assignee} className="w-[100px]" />
              <th className="w-[80px] px-2.5 py-2 text-left font-semibold text-slate-600">{TEXT.headers.source}</th>
              <th className="w-[70px] px-2.5 py-2" />
            </tr>
          </thead>
```

- [ ] **Step 3: Sort dropdown cho mobile (list không có header cột)**

Ngay đầu khối mobile (`<div className="block divide-y ... sm:hidden">`), chèn thanh sort trước danh sách:
```tsx
      <div className="block sm:hidden">
        <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2 text-xs">
          <span className="text-gray-400">Sắp xếp:</span>
          <select
            value={sortBy ?? ""}
            onChange={(e) => onSortChange(e.target.value)}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs outline-none"
          >
            <option value="">Mặc định</option>
            <option value="priority">Ưu tiên</option>
            <option value="dueDate">Thời hạn</option>
            <option value="createdAt">Ngày tạo</option>
            <option value="completedAt">Hoàn thành</option>
            <option value="assignee">Người PT</option>
            <option value="title">Tiêu đề</option>
          </select>
          {sortBy && (
            <button onClick={() => onSortChange(sortBy)} className="rounded-md border border-gray-200 px-2 py-1">
              {sortDir === "desc" ? "↓" : "↑"}
            </button>
          )}
        </div>
        <div className="divide-y divide-gray-100">
          {/* ... danh sách card mobile giữ nguyên ... */}
        </div>
      </div>
```
> Lưu ý: gói phần map card mobile hiện tại vào `<div className="divide-y divide-gray-100">` bên trong; bỏ class `divide-y divide-gray-100` ở thẻ ngoài để tránh kẻ ngang dưới thanh sort.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: hết lỗi liên quan `TodoListView` (TodoKanbanView vẫn có thể còn lỗi tới Task 9).

---

### Task 9: `TodoKanbanView` — `classifyDue` + bỏ slice + sắp xếp theo cột

**Files:**
- Modify: `src/components/todos/TodoKanbanView.tsx`

- [ ] **Step 1: Import + props sort + dùng `classifyDue`**

Thêm import:
```ts
import { classifyDue } from "@/lib/todo-dates";
import { KANBAN_SORT_OPTIONS, PRIORITY_CONFIG, SOURCE_CONFIG, type KanbanSortField } from "./constants";
```
(gộp với import constants hiện có).

Mở rộng props:
```ts
interface TodoKanbanViewProps {
  todos: TodoItemData[];
  columnSort: Record<string, KanbanSortField>;
  onColumnSortChange: (columnId: string, field: KanbanSortField) => void;
  onDragEnd: (result: any) => void;
  onSelect: (todo: TodoItemData) => void;
}
```

Thay 2 hàm `isDueOverdue`/`isDueToday` bằng dùng `classifyDue` tại chỗ tô màu hạn:
```tsx
                              {todo.dueDate && (() => {
                                const cls = classifyDue(todo.dueDate, todo.status, new Date());
                                return (
                                  <span className={`flex items-center gap-0.5 text-[11px] font-medium ${
                                    cls === "overdue" ? "text-red-600" : cls === "today" ? "text-amber-600" : "text-gray-500"
                                  }`}>
                                    {TEXT.clock} {format(new Date(todo.dueDate), "dd/MM HH:mm")}
                                  </span>
                                );
                              })()}
```
(xóa `isDueOverdue`/`isDueToday`).

- [ ] **Step 2: Sắp xếp client-side + bỏ `.slice(0,10)`**

Thêm helper sắp xếp trên đầu component (trong file, ngoài JSX):
```ts
const PRIORITY_RANK: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function sortCards(cards: TodoItemData[], field: KanbanSortField): TodoItemData[] {
  if (field === "manual") return cards;
  const copy = [...cards];
  if (field === "priority") {
    copy.sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9));
  } else if (field === "dueDate") {
    const v = (t: TodoItemData) => (t.dueDate ? new Date(t.dueDate).getTime() : Infinity);
    copy.sort((a, b) => v(a) - v(b));
  } else if (field === "createdAt") {
    copy.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  return copy;
}
```

Sửa khối `grouped` (bỏ slice ở DONE):
```tsx
  const grouped: Record<string, TodoItemData[]> = {
    TODO: todos.filter((todo) => todo.status === "TODO"),
    IN_PROGRESS: todos.filter((todo) => todo.status === "IN_PROGRESS"),
    DONE: todos.filter((todo) => todo.status === "DONE"),
  };
```

- [ ] **Step 3: Bộ chọn sort trên header mỗi cột + áp sort cho `items`**

Trong `.map((column) => {` , sau dòng `const items = grouped[column.statusKey] || [];`:
```tsx
          const columnField = columnSort[column.id] ?? "manual";
          const items = sortCards(grouped[column.statusKey] || [], columnField);
```

Thay header cột (khối `<div className="mb-2.5 flex items-center gap-1.5 ...">`) bằng:
```tsx
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <div className={`flex items-center gap-1.5 text-[13px] font-bold ${column.color}`}>
                      <Circle size={8} fill={dotColors[column.color]} color={dotColors[column.color]} />
                      {column.label}
                      <span className="ml-0.5 font-medium text-gray-400">({items.length})</span>
                    </div>
                    <select
                      value={columnField}
                      onChange={(e) => onColumnSortChange(column.id, e.target.value as KanbanSortField)}
                      className="rounded-md border border-gray-200 bg-white px-1.5 py-1 text-[11px] text-gray-500 outline-none"
                      title="Sắp xếp"
                    >
                      {KANBAN_SORT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
```

> Khi `columnField !== "manual"`, thẻ vẫn kéo được sang cột khác (đổi trạng thái); reorder trong cùng cột bị bỏ qua bởi `handleDragEnd` ở `TodosClient` (Task 6f).

- [ ] **Step 4: Typecheck toàn dự án**

Run: `npx tsc --noEmit`
Expected: PASS (không lỗi).

- [ ] **Step 5: Commit gộp Task 6-9**

```bash
git add src/hooks/useTodos.ts src/components/todos/constants.ts src/components/todos/TodosClient.tsx src/components/todos/TodoTodayView.tsx src/components/todos/TodoListView.tsx src/components/todos/TodoKanbanView.tsx
git commit -m "feat(todo): add Today view and List/Kanban sorting"
```

---

### Task 10: Kiểm thử tổng + xác minh thủ công

**Files:** (không sửa code; chỉ chạy & kiểm tra)

- [ ] **Step 1: Chạy toàn bộ test**

Run: `npm run test:run`
Expected: PASS toàn bộ (gồm `todo-dates`, `todo-order`, `todos-list-route`, `todos-page`, `todo-bootstrap-state`, `todo-scope`, `todos-route-permissions`, `todos-occ-route`).

- [ ] **Step 2: Lint + typecheck**

Run: `npm run lint && npx tsc --noEmit`
Expected: không lỗi.

- [ ] **Step 3: Kiểm tra mã hoá tiếng Việt**

Run: `npm run verify:text-encoding`
Expected: PASS (các chuỗi tiếng Việt mới không bị lỗi mã).

- [ ] **Step 4: Xác minh thủ công (dev server)**

Run: `npm run dev`, đăng nhập, mở `/todos`, kiểm tra theo tiêu chí §6 của spec:
1. Việc hạn "hôm nay HH:mm" đã qua giờ: List/Kanban **không** tô đỏ; nằm "Đến hạn hôm nay".
2. Thẻ "Đến hạn hôm nay" và "Quá hạn" là hai số riêng; việc tạo-hôm-nay-hạn-tuần-sau **không** vào "Đến hạn hôm nay".
3. Kanban hiển thị toàn bộ việc chưa DONE + tối đa 20 DONE gần nhất.
4. Mở trang lần đầu vào thẳng "Hôm nay" với 2 nhóm Quá hạn / Đến hạn hôm nay.
5. List: bấm cột "Thời hạn" → sắp tăng; bấm lại → giảm; mũi tên đúng; đổi sort về trang 1; sort đúng qua các trang.
6. Kanban: chọn "Ưu tiên" ở 1 cột → thẻ sắp lại; kéo trong cột không đổi thứ tự; kéo sang cột khác vẫn đổi trạng thái; tải lại trang vẫn nhớ lựa chọn (localStorage).

- [ ] **Step 5: Commit (nếu có chỉnh sửa nhỏ phát sinh khi xác minh)**

```bash
git add -A -- src/components/todos src/lib/todo-dates.ts src/lib/todo-order.ts src/app/api/todos
git commit -m "test(todo): verify Spec A criteria"
```

---

## Self-Review

**Spec coverage:**
- Lỗi 1 (múi giờ) → Task 1 + dùng ở Task 3/4/5. ✔
- Lỗi 2 (overdue đá nhau) → `classifyDue` dùng chung ở server (Task 3/4) + client List/Kanban (Task 8/9). ✔
- Lỗi 3 (thẻ "hôm nay") → Task 3 (`dueToday`, bỏ createdAt) + Task 6h (KPI tách). ✔
- Lỗi 4 (Kanban không đủ việc) → Task 4 (`mode=board`) + Task 9 (bỏ slice). ✔
- View Hôm nay → Task 5 (seed) + Task 6 (mặc định, mode) + Task 7 (component). ✔
- Sắp xếp List → Task 2 (orderBy) + Task 4 (params) + Task 8 (header bấm). ✔
- Sắp xếp Kanban → Task 6 (state + ignore reorder) + Task 9 (selector + sort client). ✔
- Nhớ lựa chọn localStorage → Task 6d. ✔

**Type consistency:** `TodoStats.dueToday` (Task 3) khớp `TodoSummaryCards` key (Task 3) và fixture test (Task 3/5). `KanbanSortField` định nghĩa ở `constants.ts` (Task 6) và dùng ở `TodosClient`/`TodoKanbanView` (Task 6/9). `buildTodoOrderBy`/`DEFAULT_TODO_ORDER_BY` (Task 2) dùng ở route (Task 4). `mode`/`sortBy`/`sortDir` thống nhất giữa `useTodos` (Task 6) và route (Task 4).

**Placeholder scan:** Không có TBD/TODO; mọi step có code/lệnh cụ thể. Phụ thuộc vòng giữa Task 6 và Task 7-9 đã ghi chú rõ (gộp commit).
