import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, priority, dueDate } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Tiêu đề không được để trống" }, { status: 400 });
    }

    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    const safePriority = validPriorities.includes(priority) ? priority : "MEDIUM";

    const todo = await prisma.todoItem.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        priority: safePriority,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "TODO",
        assigneeId: session.user.id,
      },
    });

    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    console.error("Create todo error:", error);
    return NextResponse.json({ error: "Lỗi khi tạo công việc" }, { status: 500 });
  }
}
