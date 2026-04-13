import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFinanceAccess } from "@/lib/finance-auth";
import { hasPermission } from "@/lib/route-permissions";
import { expenseSchema } from "@/lib/validations";

// GET — list expenses with filters
export async function GET(req: NextRequest) {
  try {
    const { error } = await requireFinanceAccess();
    if (error) return error;

    const url = new URL(req.url);
    const month = url.searchParams.get("month");
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    const category = url.searchParams.get("category");
    const search = url.searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (fromParam && toParam) {
      const toDate = new Date(toParam);
      toDate.setHours(23, 59, 59, 999);
      where.date = { gte: new Date(fromParam), lte: toDate };
    } else if (month) {
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
    const { session, error } = await requireFinanceAccess();
    if (error) return error;

    if (!hasPermission(session!.user, "canManageExpenses")) return NextResponse.json({ error: "Không có quyền quản lý chi phí" }, { status: 403 });

    const body = await req.json();
    const parsed = expenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ", details: parsed.error.flatten() }, { status: 400 });
    }
    const { categoryId, title, amount, date, note, attachmentUrl, attachmentName } = parsed.data;

    const expense = await prisma.expense.create({
      data: {
        categoryId,
        title,
        amount,
        date: new Date(date),
        note: note || null,
        attachmentUrl: attachmentUrl || null,
        attachmentName: attachmentName || null,
        createdBy: session!.user.name || session!.user.id!,
      },
      include: { category: { select: { name: true } } },
    });

    return NextResponse.json({ expense });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
