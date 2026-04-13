import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/route-permissions";

// Helper: auto-conversion logic when prospect reaches CONVERTED
async function handleConversion(prospectId: string) {
  const prospect = await prisma.shopProspect.findUnique({ where: { id: prospectId } });
  if (!prospect) return;

  // Create ShopProfile (don't overwrite existing)
  await prisma.shopProfile.upsert({
    where: { shopName: prospect.shopName },
    create: {
      shopName: prospect.shopName,
      phone: prospect.phone,
      email: prospect.email,
      contactPerson: prospect.contactPerson,
      zalo: prospect.zalo,
      address: prospect.address,
      startDate: new Date(),
    },
    update: {},
  });

  // Auto CareLog entry
  const profile = await prisma.shopProfile.findUnique({ where: { shopName: prospect.shopName } });
  if (profile) {
    await prisma.shopCareLog.create({
      data: {
        shopId: profile.id,
        contactMethod: "SYSTEM",
        content: `Shop chuyển đổi thành công từ pipeline. Nguồn: ${prospect.source}.`,
        isAutoLog: true,
        authorName: "Hệ thống",
        authorId: "system",
      },
    });
  }
}

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
  const { stage } = body;

  if (!stage) {
    return NextResponse.json({ error: "stage is required" }, { status: 400 });
  }

  try {
    const old = await prisma.shopProspect.findUnique({ where: { id } });
    if (!old) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    const prospect = await prisma.shopProspect.update({
      where: { id },
      data: { stage },
    });

    // Log stage change
    await prisma.prospectContactLog.create({
      data: {
        prospectId: id,
        contactMethod: "SYSTEM",
        content: `Chuyển giai đoạn: ${old.stage} → ${stage}`,
        authorName: session.user.name || "Unknown",
        authorId: session.user.id,
      },
    });

    // Handle conversion
    if (stage === "CONVERTED" && old.stage !== "CONVERTED") {
      await handleConversion(id);
    }

    return NextResponse.json({ success: true, data: prospect });
  } catch (error) {
    console.error("CRM Prospect Stage Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export { handleConversion };
