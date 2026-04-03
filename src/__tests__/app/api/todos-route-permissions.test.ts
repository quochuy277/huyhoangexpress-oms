import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    todoItem: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: "staff-1",
      name: "Nhân viên",
      role: "STAFF",
      permissions: {
        canViewAllTodos: false,
        ...overrides,
      },
    },
  };
}

describe("todos API permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.todoItem.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.todoItem.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.todoItem.create).mockResolvedValue({
      id: "todo-1",
      assigneeId: "staff-1",
    } as never);
  });

  it("forces non-privileged users back to their own assigneeId even if they request scope=all", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);

    const { GET } = await import("@/app/api/todos/route");
    const response = await GET(
      new NextRequest("http://localhost/api/todos?scope=all&assigneeId=staff-2&page=1&pageSize=20"),
    );

    expect(response.status).toBe(200);
    expect(vi.mocked(prisma.todoItem.findMany).mock.calls[0]?.[0]).toMatchObject({
      where: expect.objectContaining({
        assigneeId: "staff-1",
      }),
    });
    expect(vi.mocked(prisma.todoItem.count).mock.calls[0]?.[0]).toMatchObject({
      where: expect.objectContaining({
        assigneeId: "staff-1",
      }),
    });
  });

  it("prevents non-privileged users from assigning todos to someone else", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);

    const { POST } = await import("@/app/api/todos/route");
    const response = await POST(
      new NextRequest("http://localhost/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Theo dõi đơn chậm",
          assigneeId: "manager-2",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(vi.mocked(prisma.todoItem.create).mock.calls[0]?.[0]).toMatchObject({
      data: expect.objectContaining({
        assigneeId: "staff-1",
        createdById: "staff-1",
      }),
    });
  });
});
