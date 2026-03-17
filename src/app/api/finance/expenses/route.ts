import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — list expenses with filters
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const url = new URL(req.url);
    const month = url.searchParams.get("month");
    const category = url.searchParams.get("category");
    const search = url.searchParams.get("search");

    const where: any = {};
    if (month) {
      const [y, m] = month.split("-").map(Number);
      where.date = { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0) };
    }
    if (category) where.categoryId = category;
    if (search) where.title = { contains: search, mode: "insensitive" };

    const expenses = await prisma.expense.findMany({
      where,
      include: { category: { select: { name: true } } },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ expenses });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

// POST — create expense (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    const { role } = session.user as any;
    if (role !== "ADMIN") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const body = await req.json();
    const { categoryId, title, amount, date, note, attachmentUrl, attachmentName } = body;

    if (!categoryId || !title || !amount || !date) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        categoryId,
        title,
        amount: parseFloat(amount),
        date: new Date(date),
        note: note || null,
        attachmentUrl: attachmentUrl || null,
        attachmentName: attachmentName || null,
        createdBy: session.user.name || session.user.id!,
      },
      include: { category: { select: { name: true } } },
    });

    return NextResponse.json({ expense });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
