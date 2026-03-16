import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json();
    const { ids, issueType, claimStatus } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Chưa chọn đơn nào" }, { status: 400 });
    }

    const data: any = { updatedAt: new Date() };
    if (issueType) data.issueType = issueType;
    if (claimStatus) data.claimStatus = claimStatus;

    // If status changed, create history entries for each claim
    if (claimStatus) {
      const claims = await prisma.claimOrder.findMany({
        where: { id: { in: ids } },
        select: { id: true, claimStatus: true },
      });

      await prisma.$transaction([
        prisma.claimOrder.updateMany({
          where: { id: { in: ids } },
          data,
        }),
        ...claims
          .filter(c => c.claimStatus !== claimStatus)
          .map(c =>
            prisma.claimStatusHistory.create({
              data: {
                claimOrderId: c.id,
                fromStatus: c.claimStatus,
                toStatus: claimStatus,
                changedBy: session.user?.name || "Unknown",
                note: "Cập nhật hàng loạt",
              },
            })
          ),
      ]);
    } else {
      await prisma.claimOrder.updateMany({
        where: { id: { in: ids } },
        data,
      });
    }

    return NextResponse.json({ success: true, count: ids.length });
  } catch (error) {
    console.error("PATCH /api/claims/bulk error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Chưa chọn đơn nào" }, { status: 400 });
    }

    const claims = await prisma.claimOrder.findMany({
      where: { id: { in: ids } },
      select: { id: true, orderId: true },
    });

    // ClaimStatusHistory and ClaimChangeLog have onDelete: Cascade,
    // so deleting the claimOrder will auto-delete children
    await prisma.$transaction([
      prisma.claimOrder.deleteMany({ where: { id: { in: ids } } }),
      ...claims.map(c =>
        prisma.order.update({
          where: { id: c.orderId },
          data: { claimLocked: false },
        })
      ),
    ]);

    return NextResponse.json({ success: true, count: ids.length });
  } catch (error) {
    console.error("DELETE /api/claims/bulk error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
