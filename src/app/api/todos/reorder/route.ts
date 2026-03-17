import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH — Batch reorder for Kanban drag
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { items } = await req.json();
  // items: [{ id, status, sortOrder }]
  if (!Array.isArray(items)) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  await Promise.all(
    items.map((item: { id: string; status: string; sortOrder: number }) => {
      const data: any = { sortOrder: item.sortOrder };
      if (item.status) {
        data.status = item.status;
        if (item.status === "DONE") data.completedAt = new Date();
        else data.completedAt = null;
      }
      return prisma.todoItem.update({ where: { id: item.id }, data });
    })
  );

  return NextResponse.json({ success: true });
}
