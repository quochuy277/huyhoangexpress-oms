import type { TodoPagination, TodoStatsResponse, TodoUser, TodoReminder, TodoItemData } from "@/types/todo";

export type TodoBootstrapData = {
  todos: TodoItemData[];
  pagination: TodoPagination;
  stats: TodoStatsResponse | null;
  reminders: TodoReminder | null;
  users: TodoUser[];
};

export function shouldFetchTodoBootstrap(initialData: Pick<TodoBootstrapData, "todos"> | null) {
  return !initialData;
}
