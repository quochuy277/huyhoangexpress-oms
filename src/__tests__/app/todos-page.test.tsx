import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/cached-session", () => ({
  getCachedSession: vi.fn(),
}));

vi.mock("@/lib/todo-page-data", () => ({
  getTodosBootstrapData: vi.fn(),
}));

vi.mock("@/components/todos/TodosClient", () => ({
  __esModule: true,
  default: () => null,
}));

import { getCachedSession } from "@/lib/cached-session";
import { getTodosBootstrapData } from "@/lib/todo-page-data";

describe("TodosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefetches todo bootstrap data on the server", async () => {
    vi.mocked(getCachedSession).mockResolvedValue({
      user: {
        id: "user-1",
        name: "Nhân viên A",
        role: "MANAGER",
      },
    } as never);
    vi.mocked(getTodosBootstrapData).mockResolvedValue({
      todos: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      stats: { mine: { today: 0, overdue: 0, inProgress: 0, doneWeek: 0 }, all: { today: 0, overdue: 0, inProgress: 0, doneWeek: 0 }, selected: null },
      reminders: { overdue: { count: 0, items: [] }, dueToday: { count: 0, items: [] } },
      users: [],
    } as never);

    const { default: TodosPage } = await import("@/app/(dashboard)/todos/page");

    const element = await TodosPage();

    expect(vi.mocked(getTodosBootstrapData)).toHaveBeenCalledTimes(1);
    expect((element as any).props.initialData.todos).toEqual([]);
    expect((element as any).props.initialData.users).toEqual([]);
  });
});
