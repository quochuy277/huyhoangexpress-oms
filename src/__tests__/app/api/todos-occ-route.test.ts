import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/todo-permissions", () => ({
  requireTodoAccess: vi.fn(),
  canViewAllTodos: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    todoItem: {
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewAllTodos, requireTodoAccess } from "@/lib/todo-permissions";

function makeSession() {
  return {
    user: {
      id: "staff-1",
      name: "Nhân viên",
      role: "STAFF",
      permissions: {
        canViewAllTodos: false,
      },
    },
  };
}

describe("todos API optimistic concurrency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    vi.mocked(canViewAllTodos).mockReturnValue(false as never);
    vi.mocked(requireTodoAccess).mockResolvedValue({
      todo: { id: "todo-1", assigneeId: "staff-1" },
      error: null,
    } as never);
    vi.mocked(prisma.todoItem.count).mockResolvedValue(1 as never);
    vi.mocked(prisma.todoItem.findUnique).mockResolvedValue({
      id: "todo-1",
      version: 5,
      status: "TODO",
    } as never);
    vi.mocked(prisma.todoItem.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.todoItem.update).mockResolvedValue({ id: "todo-1" } as never);
    vi.mocked(prisma.$transaction as any).mockImplementation(async (input: any) => {
      if (typeof input === "function") {
        return input({
          todoItem: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            findMany: vi.fn().mockResolvedValue([]),
          },
        });
      }
      return Promise.all(input);
    });
  });

  it("returns 409 when updating a todo with a stale version", async () => {
    vi.mocked(prisma.todoItem.updateMany).mockResolvedValue({ count: 0 } as never);

    const { PUT } = await import("@/app/api/todos/[id]/route");
    const response = await PUT(
      new NextRequest("http://localhost/api/todos/todo-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Cập nhật tiêu đề", version: 3 }),
      }),
      { params: Promise.resolve({ id: "todo-1" }) },
    );

    expect(response.status).toBe(409);
    expect(vi.mocked(prisma.todoItem.updateMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "todo-1",
          version: 3,
        }),
      }),
    );
  });

  it("returns 409 when changing status with a stale version", async () => {
    vi.mocked(prisma.todoItem.updateMany).mockResolvedValue({ count: 0 } as never);

    const { PATCH } = await import("@/app/api/todos/[id]/status/route");
    const response = await PATCH(
      new NextRequest("http://localhost/api/todos/todo-1/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PROGRESS", version: 3 }),
      }),
      { params: Promise.resolve({ id: "todo-1" }) },
    );

    expect(response.status).toBe(409);
    expect(vi.mocked(prisma.todoItem.updateMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "todo-1",
          version: 3,
        }),
      }),
    );
  });

  it("returns 409 when toggling completion with a stale version", async () => {
    vi.mocked(prisma.todoItem.updateMany).mockResolvedValue({ count: 0 } as never);

    const { PATCH } = await import("@/app/api/todos/[id]/complete/route");
    const response = await PATCH(
      new NextRequest("http://localhost/api/todos/todo-1/complete", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: 3 }),
      }),
      { params: Promise.resolve({ id: "todo-1" }) },
    );

    expect(response.status).toBe(409);
    expect(vi.mocked(prisma.todoItem.updateMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "todo-1",
          version: 3,
        }),
      }),
    );
  });

  it("returns 409 when kanban reorder uses a stale version", async () => {
    vi.mocked(prisma.todoItem.count).mockResolvedValue(1 as never);
    vi.mocked(prisma.$transaction as any).mockImplementation(async (callback: any) =>
      callback({
        todoItem: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      }),
    );

    const { PATCH } = await import("@/app/api/todos/reorder/route");
    const response = await PATCH(
      new NextRequest("http://localhost/api/todos/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ id: "todo-1", status: "DONE", sortOrder: 0, version: 3 }],
        }),
      }),
    );

    expect(response.status).toBe(409);
  });
});
