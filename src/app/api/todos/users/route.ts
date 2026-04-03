import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canViewAllTodos } from "@/lib/todo-permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewAllTodos(session.user)) return NextResponse.json({ users: [] });

  const users = await prisma.user.findMany({
    select: { id: true, name: true, role: true, email: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ users });
}
