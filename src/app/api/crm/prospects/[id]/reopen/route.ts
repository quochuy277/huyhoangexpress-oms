import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
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
    const prospect = await prisma.shopProspect.update({
      where: { id },
      data: { isLost: false, stage: "DISCOVERED", lostReason: null },
    });

    await prisma.prospectContactLog.create({
      data: {
        prospectId: id,
        contactMethod: "SYSTEM",
        content: "Mở lại prospect — quay về giai đoạn Mới phát hiện.",
        authorName: session.user.name || "Unknown",
        authorId: session.user.id,
      },
    });

    return NextResponse.json({ success: true, data: prospect });
  } catch (error) {
    console.error("CRM Prospect Reopen Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
