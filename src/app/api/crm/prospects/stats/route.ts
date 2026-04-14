import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/route-permissions";
import { logger } from "@/lib/logger";


export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user, "canViewCRM")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const canViewAll = hasPermission(session.user, "canViewAllShops");
  const assigneeFilter = canViewAll ? {} : { assigneeId: session.user.id };

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [activeProspects, convertedThisMonth, totalAll, totalConverted] = await Promise.all([
      prisma.shopProspect.count({
        where: { isLost: false, stage: { not: "CONVERTED" }, ...assigneeFilter },
      }),
      prisma.shopProspect.count({
        where: { stage: "CONVERTED", updatedAt: { gte: startOfMonth }, ...assigneeFilter },
      }),
      prisma.shopProspect.count({ where: assigneeFilter }),
      prisma.shopProspect.count({ where: { stage: "CONVERTED", ...assigneeFilter } }),
    ]);

    const conversionRate = totalAll > 0 ? Math.round((totalConverted / totalAll) * 100) : 0;

    // Avg conversion days
    const convertedProspects = await prisma.shopProspect.findMany({
      where: { stage: "CONVERTED", ...assigneeFilter },
      select: { createdAt: true, updatedAt: true },
    });

    let avgConversionDays = 0;
    if (convertedProspects.length > 0) {
      const totalDays = convertedProspects.reduce((sum, p) => {
        return sum + (p.updatedAt.getTime() - p.createdAt.getTime()) / (24 * 60 * 60 * 1000);
      }, 0);
      avgConversionDays = Math.round(totalDays / convertedProspects.length);
    }

    return NextResponse.json({
      success: true,
      data: { activeProspects, convertedThisMonth, conversionRate, avgConversionDays },
    });
  } catch (error) {
    logger.error("GET /api/crm/prospects/stats", "CRM Prospect Stats Error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
