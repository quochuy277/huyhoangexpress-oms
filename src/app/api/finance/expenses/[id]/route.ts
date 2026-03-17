import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT — update expense
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    const { role } = session.user as any;
    if (role !== "ADMIN") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const { categoryId, title, amount, date, note, attachmentUrl, attachmentName } = body;

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(categoryId && { categoryId }),
        ...(title && { title }),
        ...(amount && { amount: parseFloat(amount) }),
        ...(date && { date: new Date(date) }),
        note: note ?? undefined,
        attachmentUrl: attachmentUrl ?? undefined,
        attachmentName: attachmentName ?? undefined,
      },
      include: { category: { select: { name: true } } },
    });

    return NextResponse.json({ expense });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

// DELETE — delete expense
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    const { role } = session.user as any;
    if (role !== "ADMIN") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const { id } = await params;
    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
