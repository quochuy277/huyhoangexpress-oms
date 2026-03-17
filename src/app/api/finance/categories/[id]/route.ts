import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT — rename category
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    const { role } = session.user as any;
    if (role !== "ADMIN") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const { id } = await params;
    const { name } = await req.json();
    const category = await prisma.expenseCategory.update({ where: { id }, data: { name } });
    return NextResponse.json({ category });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

// DELETE — delete category (only custom, no expenses)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    const { role } = session.user as any;
    if (role !== "ADMIN") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const { id } = await params;
    const cat = await prisma.expenseCategory.findUnique({ where: { id }, include: { _count: { select: { expenses: true } } } });
    if (!cat) return NextResponse.json({ error: "Không tìm danh mục" }, { status: 404 });
    if (cat.isSystem) return NextResponse.json({ error: "Không thể xóa danh mục hệ thống" }, { status: 400 });
    if (cat._count.expenses > 0) return NextResponse.json({ error: "Danh mục có khoản chi, không thể xóa" }, { status: 400 });

    await prisma.expenseCategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
