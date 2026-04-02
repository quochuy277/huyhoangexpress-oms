import { NextRequest, NextResponse } from "next/server";

import { getFinanceBudgetSummary } from "@/lib/finance/landing";
import { requireFinanceAccess } from "@/lib/finance-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireFinanceAccess();
    if (error) return error;

    const url = new URL(req.url);
    const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const data = await getFinanceBudgetSummary(month);

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { session, error } = await requireFinanceAccess();
    if (error) return error;

    if (session!.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }

    const { month, budgets } = await req.json();
    const [year, monthIndex] = month.split("-").map(Number);
    const monthDate = new Date(year, monthIndex - 1, 1);

    for (const budget of budgets) {
      if (budget.amount > 0) {
        await prisma.monthlyBudget.upsert({
          where: {
            categoryId_month: {
              categoryId: budget.categoryId,
              month: monthDate,
            },
          },
          create: {
            categoryId: budget.categoryId,
            month: monthDate,
            budgetAmount: budget.amount,
          },
          update: { budgetAmount: budget.amount },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
