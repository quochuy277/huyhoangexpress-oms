import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const permissions = session.user.permissions;

  if (!permissions.canViewCRM) {
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
    console.error("CRM Prospect Detail Error:", error);
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
  const permissions = session.user.permissions;

  if (!permissions.canViewCRM) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  try {
    const prospect = await prisma.shopProspect.update({
      where: { id },
      data: {
        shopName: body.shopName,
        phone: body.phone,
        email: body.email,
        contactPerson: body.contactPerson,
        zalo: body.zalo,
        address: body.address,
        source: body.source,
        sourceDetail: body.sourceDetail,
        productType: body.productType,
        estimatedSize: body.estimatedSize,
        currentCarrier: body.currentCarrier,
        note: body.note,
        assigneeId: body.assigneeId,
      },
      include: {
        assignee: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: prospect });
  } catch (error) {
    console.error("CRM Prospect Update Error:", error);
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
  const permissions = session.user.permissions;

  if (!permissions.canManageCRM) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.shopProspect.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CRM Prospect Delete Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
