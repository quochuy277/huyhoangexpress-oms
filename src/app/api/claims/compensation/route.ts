import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  resolveCompensationRange,
  summarizeCompensationClaims,
  type CompensationClaimRow,
} from "@/lib/claims-compensation";
import { canAccessCompensation } from "@/lib/claims-permissions";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  if (!canAccessCompensation(session.user)) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const searchParams = new URL(req.url).searchParams;
  const range = resolveCompensationRange({
    dateFrom: searchParams.get("dateFrom"),
    dateTo: searchParams.get("dateTo"),
  });
  const shopName = searchParams.get("shopName") || "";

  try {
    const rows = await prisma.claimOrder.findMany({
      where: {
        detectedDate: { gte: range.from, lte: range.to },
        ...(shopName ? { order: { shopName } } : {}),
      },
      select: {
        claimStatus: true,
        carrierCompensation: true,
        customerCompensation: true,
        detectedDate: true,
        issueType: true,
        order: { select: { shopName: true } },
      },
    });

    const claims: CompensationClaimRow[] = rows.map((row) => ({
      claimStatus: row.claimStatus,
      carrierCompensation: Number(row.carrierCompensation || 0),
      customerCompensation: Number(row.customerCompensation || 0),
      detectedDate: row.detectedDate,
      issueType: row.issueType,
      shopName: row.order?.shopName || "Không rõ",
    }));

    return NextResponse.json(summarizeCompensationClaims(claims, range));
  } catch (error) {
    logger.error("GET /api/claims/compensation", "Error", error);
    return NextResponse.json({ error: "Lỗi truy vấn" }, { status: 500 });
  }
}
