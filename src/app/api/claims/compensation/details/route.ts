import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveCompensationRange } from "@/lib/claims-compensation";
import { canAccessCompensation } from "@/lib/claims-permissions";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  if (!canAccessCompensation(session.user)) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const searchParams = new URL(req.url).searchParams;
  const shopName = searchParams.get("shopName");
  if (!shopName) {
    return NextResponse.json({ error: "Thiếu tên cửa hàng" }, { status: 400 });
  }

  const range = resolveCompensationRange({
    dateFrom: searchParams.get("dateFrom"),
    dateTo: searchParams.get("dateTo"),
  });
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE),
  );

  const where = {
    detectedDate: { gte: range.from, lte: range.to },
    order: { shopName },
  };

  try {
    const [total, rows] = await Promise.all([
      prisma.claimOrder.count({ where }),
      prisma.claimOrder.findMany({
        where,
        select: {
          id: true,
          claimStatus: true,
          issueType: true,
          detectedDate: true,
          carrierCompensation: true,
          customerCompensation: true,
          order: { select: { requestCode: true } },
        },
        orderBy: { detectedDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      claims: rows.map((row) => ({
        id: row.id,
        requestCode: row.order?.requestCode || "—",
        detectedDate: row.detectedDate,
        issueType: row.issueType,
        claimStatus: row.claimStatus,
        carrierCompensation: Number(row.carrierCompensation || 0),
        customerCompensation: Number(row.customerCompensation || 0),
      })),
      pagination: { page, pageSize, total },
    });
  } catch (error) {
    logger.error("GET /api/claims/compensation/details", "Error", error);
    return NextResponse.json({ error: "Lỗi truy vấn" }, { status: 500 });
  }
}
