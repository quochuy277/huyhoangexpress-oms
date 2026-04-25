import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/route-permissions";
import { prospectUpdateSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user, "canViewCRM")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const prospect = await prisma.shopProspect.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true } },
        contactLogs: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {},
        },
      },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: prospect });
  } catch (error) {
    logger.error("GET /api/crm/prospects/[id]", "CRM Prospect Detail Error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user, "canViewCRM")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = prospectUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dữ liệu không hợp lệ", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const data = parsed.data;

  try {
    const prospect = await prisma.shopProspect.update({
      where: { id },
      data: {
        shopName: data.shopName,
        phone: data.phone,
        email: data.email,
        contactPerson: data.contactPerson,
        zalo: data.zalo,
        address: data.address,
        source: data.source,
        sourceDetail: data.sourceDetail,
        productType: data.productType,
        estimatedSize: data.estimatedSize,
        currentCarrier: data.currentCarrier,
        note: data.note,
        assigneeId: data.assigneeId,
      },
      include: {
        assignee: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: prospect });
  } catch (error) {
    logger.error("PUT /api/crm/prospects/[id]", "CRM Prospect Update Error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user, "canManageCRM")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.shopProspect.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("DELETE /api/crm/prospects/[id]", "CRM Prospect Delete Error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
