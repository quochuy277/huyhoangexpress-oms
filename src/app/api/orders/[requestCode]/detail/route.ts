import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ requestCode: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestCode } = await params;
  if (!requestCode) {
    return NextResponse.json({ error: "Missing requestCode" }, { status: 400 });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { requestCode },
      include: {
        claimOrder: {
          select: {
            id: true,
            issueType: true,
            claimStatus: true,
            isCompleted: true,
          },
        },
        returnTracking: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const userRole = session.user.role || "VIEWER";
    const isStaffOrViewer = userRole === "STAFF" || userRole === "VIEWER";

    const response: any = { ...order };
    if (isStaffOrViewer) {
      delete response.carrierFee;
      delete response.ghsvInsuranceFee;
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error("[Order Detail API] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
