import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — list all categories
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

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
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    const { role } = session.user as any;
    if (role !== "ADMIN") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Tên danh mục trống" }, { status: 400 });

    const maxSort = await prisma.expenseCategory.aggregate({ _max: { sortOrder: true } });
    const category = await prisma.expenseCategory.create({
      data: { name: name.trim(), isSystem: false, sortOrder: (maxSort._max.sortOrder || 0) + 1 },
    });
    return NextResponse.json({ category });
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ error: "Danh mục đã tồn tại" }, { status: 409 });
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
