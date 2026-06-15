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
