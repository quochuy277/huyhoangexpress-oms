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
import { BOARD_DONE_LIMIT, BOARD_OPEN_CAP, FOCUS_CAP } from "@/lib/todo-dates";

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
    expect(arg.take).toBe(FOCUS_CAP);
  });

  it("mode=board: 2 query (open + done)", async () => {
    const { GET } = await import("@/app/api/todos/route");
    await GET(req("?mode=board&scope=mine"));
    expect(prisma.todoItem.findMany).toHaveBeenCalledTimes(2);
    const openArg = vi.mocked(prisma.todoItem.findMany).mock.calls[0][0] as any;
    const doneArg = vi.mocked(prisma.todoItem.findMany).mock.calls[1][0] as any;
    expect(openArg.where.status).toEqual({ not: "DONE" });
    expect(openArg.take).toBe(BOARD_OPEN_CAP);
    expect(doneArg.where.status).toBe("DONE");
    expect(doneArg.take).toBe(BOARD_DONE_LIMIT);
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
