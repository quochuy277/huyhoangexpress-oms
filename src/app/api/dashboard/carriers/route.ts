import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subDays, startOfDay, endOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "30", 10);
  
  const endDate = endOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, days - 1));

  const carrierCounts = await prisma.order.groupBy({
    by: ['carrierName'],
    _count: {
      id: true,
    },
    where: {
      createdTime: {
        gte: startDate,
        lte: endDate,
      },
      carrierName: {
        not: null
      }
    }
  });

  const carrierDistribution = carrierCounts.map(c => ({
    carrier: c.carrierName || "Khác",
    count: c._count.id
  })).sort((a, b) => b.count - a.count);

  return NextResponse.json({ carrierDistribution }, {
    headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" },
  });
}
