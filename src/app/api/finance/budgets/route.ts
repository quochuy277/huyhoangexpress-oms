import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFinanceAccess } from "@/lib/finance-auth";

// GET — budgets for a month
export async function GET(req: NextRequest) {
  try {
    const { error } = await requireFinanceAccess();
    if (error) return error;

    const url = new URL(req.url);
    const monthStr = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const [y, m] = monthStr.split("-").map(Number);
    const monthDate = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0);

    const categories = await prisma.expenseCategory.findMany({ orderBy: { sortOrder: "asc" } });
    const budgets = await prisma.monthlyBudget.findMany({ where: { month: monthDate } });
    const expenses = await prisma.expense.findMany({
      where: { date: { gte: monthDate, lte: monthEnd } },
      select: { categoryId: true, amount: true },
    });

    const spentMap: Record<string, number> = {};
    expenses.forEach(e => { spentMap[e.categoryId] = (spentMap[e.categoryId] || 0) + Number(e.amount); });

    const budgetMap: Record<string, number> = {};
    budgets.forEach(b => { budgetMap[b.categoryId] = Number(b.budgetAmount); });

    const result = categories.map(c => ({
      categoryId: c.id,
      categoryName: c.name,
      budgetAmount: budgetMap[c.id] || 0,
      spent: spentMap[c.id] || 0,
      remaining: (budgetMap[c.id] || 0) - (spentMap[c.id] || 0),
      ratio: budgetMap[c.id] ? Math.round(((spentMap[c.id] || 0) / budgetMap[c.id]) * 100) : 0,
    }));

    const hasAlert = result.some(r => r.budgetAmount > 0 && r.ratio > 90);

    return NextResponse.json({ budgets: result, month: monthStr, hasAlert });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

// PUT — set budgets for a month (admin only)
export async function PUT(req: NextRequest) {
  try {
    const { session, error } = await requireFinanceAccess();
    if (error) return error;

    const role = session!.user.role;
    if (role !== "ADMIN") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const { month, budgets } = await req.json();
    const [y, m] = month.split("-").map(Number);
    const monthDate = new Date(y, m - 1, 1);

    for (const b of budgets) {
      if (b.amount > 0) {
        await prisma.monthlyBudget.upsert({
          where: { categoryId_month: { categoryId: b.categoryId, month: monthDate } },
          create: { categoryId: b.categoryId, month: monthDate, budgetAmount: b.amount },
          update: { budgetAmount: b.amount },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
