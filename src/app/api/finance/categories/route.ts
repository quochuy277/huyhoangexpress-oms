import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFinanceAccess } from "@/lib/finance-auth";
import { expenseCategorySchema } from "@/lib/validations";

// GET — list all categories
export async function GET() {
  try {
    const { error } = await requireFinanceAccess();
    if (error) return error;

    const categories = await prisma.expenseCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { expenses: true } } },
    });
    return NextResponse.json(
      { categories },
      { headers: { "Cache-Control": "private, max-age=60" } },
    );
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

    const parsed = expenseCategorySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const maxSort = await prisma.expenseCategory.aggregate({ _max: { sortOrder: true } });
    const category = await prisma.expenseCategory.create({
      data: { name: parsed.data.name, isSystem: false, sortOrder: (maxSort._max.sortOrder || 0) + 1 },
    });
    return NextResponse.json({ category });
  } catch (err: unknown) {
    const prismaErr = err as { code?: string };
    if (prismaErr?.code === "P2002") return NextResponse.json({ error: "Danh mục đã tồn tại" }, { status: 409 });
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
