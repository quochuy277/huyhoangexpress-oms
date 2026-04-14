import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/route-permissions";
import { logger } from "@/lib/logger";

export async function POST(
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
  const { contactMethod, content, result, followUpDate } = body;

  if (!contactMethod || !content) {
    return NextResponse.json({ error: "contactMethod and content are required" }, { status: 400 });
  }

  try {
    const log = await prisma.prospectContactLog.create({
      data: {
        prospectId: id,
        contactMethod,
        content,
        result: result || null,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        authorName: session.user.name || "Unknown",
        authorId: session.user.id,
      },
    });

    // Auto-create Todo if followUpDate
    if (followUpDate) {
      const prospect = await prisma.shopProspect.findUnique({ where: { id }, select: { shopName: true } });
      await prisma.todoItem.create({
        data: {
          title: `Liên hệ lại prospect ${prospect?.shopName || id}`,
          description: `Nhắc liên hệ lại prospect. Nội dung lần trước: ${content.substring(0, 100)}`,
          source: "FROM_CRM",
          priority: "MEDIUM",
          dueDate: new Date(followUpDate),
          assigneeId: session.user.id,
          createdById: session.user.id,
        },
      });
    }

    return NextResponse.json({ success: true, data: log });
  } catch (error) {
    logger.error("POST /api/crm/prospects/[id]/contact", "CRM Prospect Contact Log Error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
