import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { clearClaimsFilterOptionsCache } from "@/lib/claims-filter-options-cache";
import { getClaimsListData } from "@/lib/claims-page-data";
import { requireClaimsPermission } from "@/lib/claims-permissions";
import { prisma } from "@/lib/prisma";

function createServerTimingHeader(metricName: string, durationMs: number) {
  return `${metricName};dur=${durationMs.toFixed(1)}`;
}

export async function GET(req: NextRequest) {
  const startedAt = performance.now();

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    const denied = requireClaimsPermission(session.user, "canViewClaims");
    if (denied) {
      return denied;
    }

    const params = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(params.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(params.get("pageSize") || "20", 10)));
    const search = params.get("search") || "";
    const issueType = params.get("issueType") || "";
    const claimStatus = params.get("claimStatus") || "";
    const shopName = params.get("shopName") || "";
    const orderStatus = params.get("orderStatus") || "";
    const showCompleted = params.get("showCompleted") === "true";
    const sortBy = params.get("sortBy") || "deadline";
    const sortDir = (params.get("sortDir") || "asc") as "asc" | "desc";

    const data = await getClaimsListData({
      page,
      pageSize,
      search,
      issueType: issueType ? issueType.split(",") : [],
      status: claimStatus,
      shopName,
      orderStatus,
      showCompleted,
      sortBy,
      sortDir,
    });

    return NextResponse.json(data, {
      headers: {
        "Server-Timing": createServerTimingHeader("claims", performance.now() - startedAt),
      },
    });
  } catch (error) {
    console.error("GET /api/claims error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    const denied = requireClaimsPermission(session.user, "canCreateClaim");
    if (denied) {
      return denied;
    }

    const body = await req.json();
    const {
      orderId,
      issueType,
      issueDescription,
      claimStatus,
      processingContent,
      carrierCompensation,
      customerCompensation,
      deadline,
      source,
    } = body;

    if (!orderId || !issueType) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const existing = await prisma.claimOrder.findUnique({
      where: { orderId },
      include: {
        order: {
          select: {
            requestCode: true,
          },
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: "Đơn đã có trong Đơn có vấn đề",
          code: "CLAIM_ALREADY_EXISTS",
          claim: {
            id: existing.id,
            claimStatus: existing.claimStatus,
            isCompleted: existing.isCompleted,
            requestCode: existing.order?.requestCode || null,
          },
        },
        { status: 409 },
      );
    }

    const now = new Date();
    const defaultDeadline = deadline ? new Date(deadline) : new Date(now.getTime() + 15 * 86400000);
    const shouldLock = ["SUSPICIOUS", "LOST", "DAMAGED"].includes(issueType);

    const [claim] = await prisma.$transaction([
      prisma.claimOrder.create({
        data: {
          orderId,
          issueType,
          issueDescription: issueDescription || null,
          detectedDate: now,
          deadline: defaultDeadline,
          claimStatus: claimStatus || "PENDING",
          processingContent: processingContent || null,
          carrierCompensation: carrierCompensation || 0,
          customerCompensation: customerCompensation || 0,
          source: source || "MANUAL",
          createdById: session.user.id,
          statusHistory: {
            create: {
              toStatus: claimStatus || "PENDING",
              changedBy: session.user.name || "Unknown",
              note: "Tạo mới",
            },
          },
        },
        include: {
          order: { select: { requestCode: true } },
        },
      }),
      ...(shouldLock
        ? [prisma.order.update({ where: { id: orderId }, data: { claimLocked: true } })]
        : []),
    ]);

    clearClaimsFilterOptionsCache();

    return NextResponse.json({ success: true, claim });
  } catch (error) {
    console.error("POST /api/claims error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
