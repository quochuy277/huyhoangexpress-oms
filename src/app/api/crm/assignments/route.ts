import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/route-permissions";
import { logger } from "@/lib/logger";


export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user, "canManageCRM")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const assignments = await prisma.shopAssignment.findMany({
      include: {
        shop: { select: { id: true, shopName: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { assignedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: assignments });
  } catch (error) {
    logger.error("GET /api/crm/assignments", "CRM Assignments List Error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user, "canManageCRM")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { shopNames, userId } = body as { shopNames: string[]; userId: string };

  if (!shopNames?.length || !userId) {
    return NextResponse.json({ error: "shopNames and userId are required" }, { status: 400 });
  }

  try {
    // Batch fetch existing profiles
    const existingProfiles = await prisma.shopProfile.findMany({
      where: { shopName: { in: shopNames } },
    });
    const existingNames = new Set(existingProfiles.map((p) => p.shopName));

    // Batch create missing profiles
    const missingNames = shopNames.filter((name) => !existingNames.has(name));
    if (missingNames.length > 0) {
      await prisma.shopProfile.createMany({
        data: missingNames.map((shopName) => ({ shopName })),
        skipDuplicates: true,
      });
    }

    // Re-fetch all profiles to get IDs (including newly created ones)
    const allProfiles = await prisma.shopProfile.findMany({
      where: { shopName: { in: shopNames } },
    });
    const profileMap = new Map(allProfiles.map((p) => [p.shopName, p.id]));

    // Batch create assignments
    const assignmentData = shopNames
      .map((shopName) => ({
        shopId: profileMap.get(shopName)!,
        userId,
        assignedBy: session.user.id,
      }))
      .filter((d) => d.shopId); // safety filter

    const result = await prisma.shopAssignment.createMany({
      data: assignmentData,
      skipDuplicates: true,
    });

    const created = result.count;
    const skipped = assignmentData.length - created;

    return NextResponse.json({
      success: true,
      data: { created, skipped },
    });
  } catch (error) {
    logger.error("POST /api/crm/assignments", "CRM Assignment Create Error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
