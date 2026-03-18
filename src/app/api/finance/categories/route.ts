import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFinanceAccess } from "@/lib/finance-auth";

// GET — list all categories
export async function GET() {
  try {
    const { error } = await requireFinanceAccess();
    if (error) return error;

    const categories = await prisma.expenseCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { expenses: true } } },
    });
    return NextResponse.json({ categories });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

// POST — create custom category (admin)
export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireFinanceAccess();
    if (error) return error;

    const role = session!.user.role;
    if (role !== "ADMIN") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Tên danh mục trống" }, { status: 400 });

    const maxSort = await prisma.expenseCategory.aggregate({ _max: { sortOrder: true } });
    const category = await prisma.expenseCategory.create({
      data: { name: name.trim(), isSystem: false, sortOrder: (maxSort._max.sortOrder || 0) + 1 },
    });
    return NextResponse.json({ category });
  } catch (err: unknown) {
    const prismaErr = err as { code?: string };
    if (prismaErr?.code === "P2002") return NextResponse.json({ error: "Danh mục đã tồn tại" }, { status: 409 });
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
