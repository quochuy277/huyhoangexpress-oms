import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shopName: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const permissions = session.user.permissions;

  if (!permissions.canViewCRM) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { shopName } = await params;
  const decodedName = decodeURIComponent(shopName);
  const body = await request.json();

  const { contactMethod, content, result, relatedOrderId, followUpDate } = body;

  if (!contactMethod || !content) {
    return NextResponse.json(
      { error: "contactMethod and content are required" },
      { status: 400 }
    );
  }

  try {
    // Ensure ShopProfile exists
    let profile = await prisma.shopProfile.findUnique({
      where: { shopName: decodedName },
    });

    if (!profile) {
      profile = await prisma.shopProfile.create({
        data: { shopName: decodedName },
      });
    }

    // Create care log
    const careLog = await prisma.shopCareLog.create({
      data: {
        shopId: profile.id,
        contactMethod,
        content,
        result: result || null,
        relatedOrderId: relatedOrderId || null,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        isAutoLog: false,
        authorName: session.user.name || "Unknown",
        authorId: session.user.id,
      },
    });

    // If follow-up date → create TodoItem
    if (followUpDate) {
      await prisma.todoItem.create({
        data: {
          title: `Liên hệ lại ${decodedName}`,
          description: `Nhắc liên hệ lại shop ${decodedName}. Nội dung lần trước: ${content.substring(0, 100)}`,
          source: "FROM_CRM",
          priority: "MEDIUM",
          dueDate: new Date(followUpDate),
          assigneeId: session.user.id,
          createdById: session.user.id,
        },
      });
    }

    return NextResponse.json({ success: true, data: careLog });
  } catch (error) {
    console.error("CRM Care Log Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
