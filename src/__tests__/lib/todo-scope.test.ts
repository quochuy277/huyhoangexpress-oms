import { describe, expect, test } from "vitest";

import { getTodoStatsForSelection, parseTodoScopeSelection, resolveTodoAssigneeFilter } from "@/lib/todo-scope";

describe("todo scope helpers", () => {
  test("parses specific user selections into an all-scope query with assigneeId", () => {
    expect(parseTodoScopeSelection("user:staff-2")).toEqual({
      scope: "all",
      assigneeId: "staff-2",
    });
  });

  test("resolves mine scope to the current session user", () => {
    expect(resolveTodoAssigneeFilter("mine", "me-1", null)).toBe("me-1");
  });

  test("prefers an explicit assignee filter when scope is all", () => {
    expect(resolveTodoAssigneeFilter("all", "me-1", "staff-2")).toBe("staff-2");
  });

  test("picks selected stats when the dropdown targets a specific user", () => {
    expect(
      getTodoStatsForSelection(
        {
          mine: { today: 1, overdue: 2, inProgress: 3, doneWeek: 4 },
          all: { today: 5, overdue: 6, inProgress: 7, doneWeek: 8 },
          selected: { today: 9, overdue: 10, inProgress: 11, doneWeek: 12 },
        },
        "user:staff-2",
      ),
    ).toEqual({ today: 9, overdue: 10, inProgress: 11, doneWeek: 12 });
  });
});
