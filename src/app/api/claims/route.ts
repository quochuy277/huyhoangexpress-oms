import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { requireClaimsPermission } from "@/lib/claims-permissions";
import { prisma } from "@/lib/prisma";

function normalizeSearchInput(value: string) {
  return value.trim();
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export async function GET(req: NextRequest) {
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
    const search = normalizeSearchInput(params.get("search") || "");
    const normalizedPhone = normalizePhone(search);
    const issueType = params.get("issueType") || "";
    const claimStatus = params.get("claimStatus") || "";
    const shopName = params.get("shopName") || "";
    const orderStatus = params.get("orderStatus") || "";
    const carrier = params.get("carrier") || "";
    const showCompleted = params.get("showCompleted") === "true";
    const sortBy = params.get("sortBy") || "deadline";
    const sortDir = (params.get("sortDir") || "asc") as "asc" | "desc";

    const where: Prisma.ClaimOrderWhereInput = {
      isCompleted: showCompleted,
    };

    if (issueType) {
      where.issueType = { in: issueType.split(",") as any[] };
    }

    if (claimStatus) {
      where.claimStatus = claimStatus as any;
    }

    const orderWhere: Prisma.OrderWhereInput = {};
    if (search) {
      orderWhere.OR = [
        { requestCode: { startsWith: search, mode: "insensitive" } },
        { requestCode: { equals: search, mode: "insensitive" } },
        { carrierOrderCode: { startsWith: search, mode: "insensitive" } },
        { carrierOrderCode: { equals: search, mode: "insensitive" } },
        ...(normalizedPhone ? [{ receiverPhone: { contains: normalizedPhone, mode: "insensitive" as const } }] : []),
        ...(normalizedPhone !== search && search ? [{ receiverPhone: { contains: search, mode: "insensitive" as const } }] : []),
        { shopName: { contains: search, mode: "insensitive" } },
      ];
    }
    if (shopName) {
      orderWhere.shopName = shopName;
    }
    if (orderStatus) {
      orderWhere.status = orderStatus;
    }
    if (carrier) {
      orderWhere.carrierName = carrier;
    }
    if (Object.keys(orderWhere).length > 0) {
      where.order = orderWhere;
    }

    let orderBy: Prisma.ClaimOrderOrderByWithRelationInput = { deadline: "asc" };
    if (sortBy === "deadline") orderBy = { deadline: sortDir };
    if (sortBy === "detectedDate") orderBy = { detectedDate: sortDir };
    if (sortBy === "claimStatus") orderBy = { claimStatus: sortDir };
    if (sortBy === "issueType") orderBy = { issueType: sortDir };
    if (sortBy === "shopName") orderBy = { order: { shopName: sortDir } };
    if (sortBy === "status") orderBy = { order: { status: sortDir } };
    if (sortBy === "codAmount") orderBy = { order: { codAmount: sortDir } };

    const [claims, total] = await Promise.all([
      prisma.claimOrder.findMany({
        where,
        include: {
          order: {
            select: {
              requestCode: true,
              carrierOrderCode: true,
              carrierName: true,
              shopName: true,
              status: true,
              deliveryStatus: true,
              codAmount: true,
              totalFee: true,
              staffNotes: true,
              receiverPhone: true,
              receiverName: true,
              receiverAddress: true,
            },
          },
          createdBy: { select: { name: true } },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.claimOrder.count({ where }),
    ]);

    return NextResponse.json({
      claims,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
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
          error: "Đơn đã có trong đơn có vấn đề",
          code: "CLAIM_ALREADY_EXISTS",
          claim: {
            id: existing.id,
            claimStatus: existing.claimStatus,
            isCompleted: existing.isCompleted,
            requestCode: existing.order?.requestCode || null,
          },
        },
        { status: 409 }
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

    return NextResponse.json({ success: true, claim });
  } catch (error) {
    console.error("POST /api/claims error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
