import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions;

  if (!permissions.canViewCRM) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const canViewAll = permissions.canViewAllShops || session.user.role === "ADMIN";
  const { searchParams } = new URL(request.url);

  const stage = searchParams.get("stage") || "";
  const source = searchParams.get("source") || "";
  const assignee = searchParams.get("assignee") || "";
  const search = searchParams.get("search") || "";
  const showLost = searchParams.get("showLost") === "true";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "100");

  try {
    const where: Record<string, unknown> = {};

    if (!showLost) where.isLost = false;
    if (stage) where.stage = stage;
    if (source) where.source = source;
    if (assignee) where.assigneeId = assignee;
    else if (!canViewAll) where.assigneeId = session.user.id;
    if (search) {
      where.OR = [
        { shopName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    const [prospects, total] = await Promise.all([
      prisma.shopProspect.findMany({
        where,
        include: {
          assignee: { select: { id: true, name: true } },
          contactLogs: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true, followUpDate: true },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.shopProspect.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        prospects: prospects.map((p) => ({
          ...p,
          lastContactDate: p.contactLogs[0]?.createdAt || null,
          nextFollowUp: p.contactLogs[0]?.followUpDate || null,
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (error) {
    console.error("CRM Prospects List Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions;

  if (!permissions.canViewCRM) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { shopName, source, assigneeId } = body;

  if (!shopName || !source || !assigneeId) {
    return NextResponse.json(
      { error: "shopName, source, and assigneeId are required" },
      { status: 400 }
    );
  }

  try {
    const prospect = await prisma.shopProspect.create({
      data: {
        shopName: body.shopName,
        phone: body.phone || null,
        email: body.email || null,
        contactPerson: body.contactPerson || null,
        zalo: body.zalo || null,
        address: body.address || null,
        source: body.source,
        sourceDetail: body.sourceDetail || null,
        productType: body.productType || null,
        estimatedSize: body.estimatedSize || null,
        currentCarrier: body.currentCarrier || null,
        note: body.note || null,
        assigneeId: body.assigneeId,
      },
      include: {
        assignee: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: prospect });
  } catch (error) {
    console.error("CRM Prospect Create Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
