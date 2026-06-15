import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewAllTodos } from "@/lib/todo-permissions";
import { resolveTodoAssigneeFilter } from "@/lib/todo-scope";
import { writeLimiter } from "@/lib/rate-limiter";
import { getDayWindows, getMonthEnd, BOARD_OPEN_CAP, BOARD_DONE_LIMIT, FOCUS_CAP } from "@/lib/todo-dates";
import { buildTodoOrderBy, DEFAULT_TODO_ORDER_BY } from "@/lib/todo-order";

const todoListInclude = {
  assignee: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  linkedOrder: {
    select: { id: true, requestCode: true, shopName: true, status: true, codAmount: true },
  },
  _count: { select: { comments: true } },
} as const;

// GET - List todos with filters
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ch\u01b0a \u0111\u0103ng nh\u1eadp" }, { status: 401 });
  }

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") || "mine";
  const status = url.searchParams.get("status") || "";
  const priority = url.searchParams.get("priority") || "";
  const source = url.searchParams.get("source") || "";
  const dueFilter = url.searchParams.get("dueFilter") || "";
  const search = url.searchParams.get("search") || "";
  const assigneeId = url.searchParams.get("assigneeId") || "";
  const mode = url.searchParams.get("mode") || "list";
  const sortBy = url.searchParams.get("sortBy") || "";
  const sortDir = url.searchParams.get("sortDir") || "";
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20", 10);
  const hideDone = url.searchParams.get("hideDone") === "true";
  const canViewAll = canViewAllTodos(session.user);

  const where: Record<string, unknown> = {};
  const effectiveAssigneeId = resolveTodoAssigneeFilter(scope, session.user.id, assigneeId, canViewAll);
  if (effectiveAssigneeId) where.assigneeId = effectiveAssigneeId;

  if (priority) where.priority = priority;
  if (source) where.source = source;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { linkedOrder: { requestCode: { contains: search, mode: "insensitive" } } },
    ];
  }

  const { todayStart, todayEnd, weekEnd } = getDayWindows();

  // focus: qu\u00e1 h\u1ea1n + \u0111\u1ebfn h\u1ea1n h\u00f4m nay (ch\u01b0a DONE), kh\u00f4ng ph\u00e2n trang
  if (mode === "focus") {
    const todos = await prisma.todoItem.findMany({
      where: { ...where, status: { not: "DONE" }, dueDate: { lt: todayEnd } },
      include: todoListInclude,
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { priority: "desc" }],
      take: FOCUS_CAP,
    });
    return NextResponse.json({
      todos,
      pagination: { page: 1, pageSize: todos.length, total: todos.length, totalPages: 1 },
    });
  }

  // board (Kanban): to\u00e0n b\u1ed9 vi\u1ec7c ch\u01b0a DONE + N vi\u1ec7c DONE g\u1ea7n nh\u1ea5t
  if (mode === "board") {
    const [open, done] = await Promise.all([
      prisma.todoItem.findMany({
        where: { ...where, status: { not: "DONE" } },
        include: todoListInclude,
        orderBy: DEFAULT_TODO_ORDER_BY,
        take: BOARD_OPEN_CAP,
      }),
      prisma.todoItem.findMany({
        where: { ...where, status: "DONE" },
        include: todoListInclude,
        orderBy: { completedAt: "desc" },
        take: BOARD_DONE_LIMIT,
      }),
    ]);
    const todos = [...open, ...done];
    return NextResponse.json({
      todos,
      pagination: { page: 1, pageSize: todos.length, total: todos.length, totalPages: 1 },
    });
  }

  // list (m\u1eb7c \u0111\u1ecbnh): l\u1ecdc + ph\u00e2n trang + s\u1eafp x\u1ebfp
  if (status) where.status = status;
  else if (hideDone) where.status = { not: "DONE" };

  if (dueFilter === "overdue") {
    where.dueDate = { lt: todayStart };
    where.status = { not: "DONE" };
  } else if (dueFilter === "today") {
    where.dueDate = { gte: todayStart, lt: todayEnd };
  } else if (dueFilter === "week") {
    where.dueDate = { gte: todayStart, lt: weekEnd };
  } else if (dueFilter === "month") {
    where.dueDate = { gte: todayStart, lt: getMonthEnd() };
  } else if (dueFilter === "none") {
    where.dueDate = null;
  }

  const [todos, total] = await Promise.all([
    prisma.todoItem.findMany({
      where,
      include: todoListInclude,
      orderBy: buildTodoOrderBy(sortBy, sortDir),
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

// POST - Create todo
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ch\u01b0a \u0111\u0103ng nh\u1eadp" }, { status: 401 });
  }

  const rateLimited = writeLimiter.check(`todo:${session.user.id}`);
  if (rateLimited) return rateLimited;

  const body = await req.json();
  const { title, description, priority, dueDate, linkedOrderId, source, assigneeId } = body;

  if (!title?.trim()) {
    return NextResponse.json(
      { error: "Ti\u00eau \u0111\u1ec1 kh\u00f4ng \u0111\u01b0\u1ee3c \u0111\u1ec3 tr\u1ed1ng" },
      { status: 400 },
    );
  }

  const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
  const validSources = ["MANUAL", "FROM_DELAYED", "FROM_RETURNS", "FROM_CLAIMS", "FROM_ORDERS", "FROM_CRM"];
  const canAssignOthers = canViewAllTodos(session.user);

  const todo = await prisma.todoItem.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      priority: validPriorities.includes(priority) ? priority : "MEDIUM",
      dueDate: dueDate ? new Date(dueDate) : null,
      status: "TODO",
      source: validSources.includes(source) ? source : "MANUAL",
      linkedOrderId: linkedOrderId || null,
      assigneeId: canAssignOthers && assigneeId ? assigneeId : session.user.id,
      createdById: session.user.id,
    },
    include: {
      assignee: { select: { id: true, name: true } },
      linkedOrder: { select: { id: true, requestCode: true, shopName: true } },
    },
  });

  return NextResponse.json(todo, { status: 201 });
}
