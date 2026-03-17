import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

// GET — cashbook transactions with filters
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const url = new URL(req.url);
    const period = url.searchParams.get("period") || "month";
    const group = url.searchParams.get("group");
    const search = url.searchParams.get("search");
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "20");

    const now = new Date();
    let from = startOfMonth(now), to = now;
    if (period === "last_month") { from = startOfMonth(subMonths(now, 1)); to = endOfMonth(subMonths(now, 1)); }
    else if (period === "quarter") { from = subMonths(startOfMonth(now), 2); }
    else if (url.searchParams.get("from") && url.searchParams.get("to")) {
      from = new Date(url.searchParams.get("from")!);
      to = new Date(url.searchParams.get("to")!);
    }

    const where: any = { transactionTime: { gte: from, lte: to } };
    if (group) {
      const groups = group.split(",");
      where.groupType = { in: groups };
    }
    if (search) {
      where.OR = [
        { receiptCode: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { shopName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [transactions, total] = await Promise.all([
      prisma.cashbookEntry.findMany({
        where,
        orderBy: { transactionTime: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.cashbookEntry.count({ where }),
    ]);

    return NextResponse.json({ transactions, pagination: { total, page, pageSize, pages: Math.ceil(total / pageSize) } });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
