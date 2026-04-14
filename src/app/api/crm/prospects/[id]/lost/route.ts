import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/route-permissions";
import { logger } from "@/lib/logger";

export async function PATCH(
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
  const body = await request.json();

  try {
    const prospect = await prisma.shopProspect.update({
      where: { id },
      data: {
        isLost: true,
        lostReason: body.lostReason || null,
      },
    });

    // Log lost action
    await prisma.prospectContactLog.create({
      data: {
        prospectId: id,
        contactMethod: "SYSTEM",
        content: `Đánh dấu mất. Lý do: ${body.lostReason || "Không rõ"}`,
        authorName: session.user.name || "Unknown",
        authorId: session.user.id,
      },
    });

    return NextResponse.json({ success: true, data: prospect });
  } catch (error) {
    logger.error("PATCH /api/crm/prospects/[id]/lost", "CRM Prospect Lost Error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
