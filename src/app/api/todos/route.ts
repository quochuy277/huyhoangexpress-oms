import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — List todos with filters
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") || "mine";
  const status = url.searchParams.get("status") || "";
  const priority = url.searchParams.get("priority") || "";
  const source = url.searchParams.get("source") || "";
  const dueFilter = url.searchParams.get("dueFilter") || "";
  const search = url.searchParams.get("search") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20");
  const hideDone = url.searchParams.get("hideDone") === "true";

  const where: any = {};

  // Scope
  if (scope === "mine") where.assigneeId = session.user.id;

  // Status
  if (status) where.status = status;
  else if (hideDone) where.status = { not: "DONE" };

  // Priority
  if (priority) where.priority = priority;

  // Source
  if (source) where.source = source;

  // Search
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { linkedOrder: { requestCode: { contains: search, mode: "insensitive" } } },
    ];
  }

  // Due date filter
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  const weekEnd = new Date(todayStart.getTime() + 7 * 86400000);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  if (dueFilter === "overdue") {
    where.dueDate = { lt: todayStart };
    where.status = { not: "DONE" };
  } else if (dueFilter === "today") {
    where.dueDate = { gte: todayStart, lt: todayEnd };
  } else if (dueFilter === "week") {
    where.dueDate = { gte: todayStart, lt: weekEnd };
  } else if (dueFilter === "month") {
    where.dueDate = { gte: todayStart, lte: monthEnd };
  } else if (dueFilter === "none") {
    where.dueDate = null;
  }

  const [todos, total] = await Promise.all([
    prisma.todoItem.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        linkedOrder: { select: { id: true, requestCode: true, shopName: true, status: true, codAmount: true } },
        _count: { select: { comments: true } },
      },
      orderBy: [
        { status: "asc" },
        { priority: "desc" },
        { dueDate: { sort: "asc", nulls: "last" } },
        { sortOrder: "asc" },
      ],
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

// POST — Create todo
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const body = await req.json();
  const { title, description, priority, dueDate, linkedOrderId, source, assigneeId } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Tiêu đề không được để trống" }, { status: 400 });

  const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
  const validSources = ["MANUAL", "FROM_DELAYED", "FROM_RETURNS", "FROM_CLAIMS", "FROM_ORDERS"];

  const todo = await prisma.todoItem.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      priority: validPriorities.includes(priority) ? priority : "MEDIUM",
      dueDate: dueDate ? new Date(dueDate) : null,
      status: "TODO",
      source: validSources.includes(source) ? source : "MANUAL",
      linkedOrderId: linkedOrderId || null,
      assigneeId: assigneeId || session.user.id,
      createdById: session.user.id,
    },
    include: {
      assignee: { select: { id: true, name: true } },
      linkedOrder: { select: { id: true, requestCode: true, shopName: true } },
    },
  });

  return NextResponse.json(todo, { status: 201 });
}
