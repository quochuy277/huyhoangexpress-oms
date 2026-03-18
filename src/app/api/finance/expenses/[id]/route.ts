import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFinanceAccess } from "@/lib/finance-auth";

// PUT — update expense
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireFinanceAccess();
    if (error) return error;

    const role = session!.user.role;
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
    const { session, error } = await requireFinanceAccess();
    if (error) return error;

    const role = session!.user.role;
    if (role !== "ADMIN") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const { id } = await params;
    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
