import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/route-permissions";
import { createServerTiming } from "@/lib/server-timing";
import { prospectCreateSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";


export async function GET(request: NextRequest) {
  const timing = createServerTiming();

  try {
    const session = await timing.measure("auth", () => auth());
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: timing.headers() });
    }

    if (!hasPermission(session.user, "canViewCRM")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: timing.headers() });
    }

    const canViewAll = hasPermission(session.user, "canViewAllShops");
    const { searchParams } = new URL(request.url);

    const stage = searchParams.get("stage") || "";
    const source = searchParams.get("source") || "";
    const assignee = searchParams.get("assignee") || "";
    const search = searchParams.get("search") || "";
    const showLost = searchParams.get("showLost") === "true";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "100", 10);

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

    const [prospects, total] = await timing.measure("queries", () => Promise.all([
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
    ]));

    const transformStartedAt = performance.now();

    const payload = {
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
    };

    timing.record("transform", performance.now() - transformStartedAt);
    timing.log("crm-prospects-api");

    return NextResponse.json(payload, { headers: timing.headers() });
  } catch (error) {
    logger.error("GET /api/crm/prospects", "CRM Prospects List Error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: timing.headers() });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user, "canViewCRM")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = prospectCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dữ liệu không hợp lệ", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const data = parsed.data;

  try {
    const prospect = await prisma.shopProspect.create({
      data: {
        shopName: data.shopName,
        phone: data.phone || null,
        email: data.email || null,
        contactPerson: data.contactPerson || null,
        zalo: data.zalo || null,
        address: data.address || null,
        source: data.source,
        sourceDetail: data.sourceDetail || null,
        productType: data.productType || null,
        estimatedSize: data.estimatedSize || null,
        currentCarrier: data.currentCarrier || null,
        note: data.note || null,
        assigneeId: data.assigneeId,
      },
      include: {
        assignee: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: prospect });
  } catch (error) {
    logger.error("POST /api/crm/prospects", "CRM Prospect Create Error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
