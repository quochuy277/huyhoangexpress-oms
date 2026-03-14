import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ requestCode: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { requestCode } = await params;

    //@ts-ignore
    await prisma.order.update({
      where: { requestCode },
      data: { warehouseArrivalDate: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH warehouse error:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật" },
      { status: 500 }
    );
  }
}
