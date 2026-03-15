import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const url = req.nextUrl.searchParams;
    const page = parseInt(url.get("page") || "1");
    const pageSize = parseInt(url.get("pageSize") || "20");
    const search = url.get("search") || "";
    const issueType = url.get("issueType") || "";
    const claimStatus = url.get("claimStatus") || "";
    const shopName = url.get("shopName") || "";
    const carrier = url.get("carrier") || "";
    const showCompleted = url.get("showCompleted") === "true";
    const sortBy = url.get("sortBy") || "deadline";
    const sortDir = (url.get("sortDir") || "asc") as "asc" | "desc";

    // Build where clause
    const where: Prisma.ClaimOrderWhereInput = {};

    if (!showCompleted) {
      where.isCompleted = false;
    }

    if (issueType) {
      const types = issueType.split(",");
      where.issueType = { in: types as any[] };
    }

    if (claimStatus) {
      where.claimStatus = claimStatus as any;
    }

    // Order-level filters
    const orderWhere: Prisma.OrderWhereInput = {};
    if (search) {
      orderWhere.OR = [
        { requestCode: { contains: search, mode: "insensitive" } },
        { carrierOrderCode: { contains: search, mode: "insensitive" } },
        { receiverPhone: { contains: search, mode: "insensitive" } },
        { shopName: { contains: search, mode: "insensitive" } },
      ];
    }
    if (shopName) {
      orderWhere.shopName = shopName;
    }
    if (carrier) {
      orderWhere.carrierName = carrier;
    }

    if (Object.keys(orderWhere).length > 0) {
      where.order = orderWhere;
    }

    // Build orderBy
    let orderBy: Prisma.ClaimOrderOrderByWithRelationInput = {};
    if (sortBy === "deadline") {
      orderBy = { deadline: sortDir };
    } else if (sortBy === "detectedDate") {
      orderBy = { detectedDate: sortDir };
    } else if (sortBy === "claimStatus") {
      orderBy = { claimStatus: sortDir };
    } else {
      orderBy = { deadline: "asc" };
    }

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

    const body = await req.json();
    const {
      orderId,
      issueType,
      issueDescription,
      claimStatus: status,
      processingContent,
      carrierCompensation,
      customerCompensation,
      deadline,
      source,
    } = body;

    if (!orderId || !issueType) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc" },
        { status: 400 }
      );
    }

    // Check if order already has a claim
    const existing = await prisma.claimOrder.findUnique({
      where: { orderId },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Đơn này đã có trong mục Đơn có vấn đề" },
        { status: 409 }
      );
    }

    const now = new Date();
    const defaultDeadline = deadline
      ? new Date(deadline)
      : new Date(now.getTime() + 15 * 86400000);

    // Set claimLocked for SUSPICIOUS, LOST, DAMAGED
    const shouldLock = ["SUSPICIOUS", "LOST", "DAMAGED"].includes(issueType);

    const [claim] = await prisma.$transaction([
      prisma.claimOrder.create({
        data: {
          orderId,
          issueType,
          issueDescription: issueDescription || null,
          detectedDate: now,
          deadline: defaultDeadline,
          claimStatus: status || "PENDING",
          processingContent: processingContent || null,
          carrierCompensation: carrierCompensation || 0,
          customerCompensation: customerCompensation || 0,
          source: source || "MANUAL",
          createdById: session.user.id,
          statusHistory: {
            create: {
              toStatus: status || "PENDING",
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
