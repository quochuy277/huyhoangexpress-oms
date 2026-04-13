import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/route-permissions";


export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user, "canViewCRM")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { items } = body as { items: Array<{ id: string; sortOrder: number; stage: string }> };

  if (!items?.length) {
    return NextResponse.json({ error: "items array is required" }, { status: 400 });
  }

  try {
    await prisma.$transaction(
      items.map((item) =>
        prisma.shopProspect.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder, stage: item.stage as "DISCOVERED" | "CONTACTED" | "NEGOTIATING" | "TRIAL" | "CONVERTED" },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CRM Prospects Reorder Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
