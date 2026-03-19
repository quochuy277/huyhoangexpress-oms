import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions;

  if (!permissions.canManageCRM) {
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
    console.error("CRM Assignments List Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions;

  if (!permissions.canManageCRM) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { shopNames, userId } = body as { shopNames: string[]; userId: string };

  if (!shopNames?.length || !userId) {
    return NextResponse.json({ error: "shopNames and userId are required" }, { status: 400 });
  }

  try {
    let created = 0;
    let skipped = 0;

    for (const shopName of shopNames) {
      // Ensure ShopProfile exists
      let profile = await prisma.shopProfile.findUnique({ where: { shopName } });
      if (!profile) {
        profile = await prisma.shopProfile.create({ data: { shopName } });
      }

      // Try to create assignment (skip if duplicate)
      try {
        await prisma.shopAssignment.create({
          data: {
            shopId: profile.id,
            userId,
            assignedBy: session.user.id,
          },
        });
        created++;
      } catch {
        skipped++; // Duplicate
      }
    }

    return NextResponse.json({
      success: true,
      data: { created, skipped },
    });
  } catch (error) {
    console.error("CRM Assignment Create Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
