import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewAllTodos } from "@/lib/todo-permissions";
import { resolveTodoAssigneeFilter } from "@/lib/todo-scope";
import { writeLimiter } from "@/lib/rate-limiter";

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
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20", 10);
  const hideDone = url.searchParams.get("hideDone") === "true";
  const canViewAll = canViewAllTodos(session.user);

  const where: Record<string, unknown> = {};

  const effectiveAssigneeId = resolveTodoAssigneeFilter(scope, session.user.id, assigneeId, canViewAll);
  if (effectiveAssigneeId) where.assigneeId = effectiveAssigneeId;

  if (status) where.status = status;
  else if (hideDone) where.status = { not: "DONE" };

  if (priority) where.priority = priority;
  if (source) where.source = source;

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { linkedOrder: { requestCode: { contains: search, mode: "insensitive" } } },
    ];
  }

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
        linkedOrder: {
          select: { id: true, requestCode: true, shopName: true, status: true, codAmount: true },
        },
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
