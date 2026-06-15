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
