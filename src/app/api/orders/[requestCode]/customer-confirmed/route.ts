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
    const { value } = await req.json();
    const staffName = session.user.name || session.user.email || "Nhân viên";

    await prisma.order.update({
      where: { requestCode },
      data: value
        ? {
            // @ts-ignore - new fields from migration
            customerConfirmed: true,
            // @ts-ignore
            customerConfirmedBy: staffName,
            // @ts-ignore
            customerConfirmedAt: new Date(),
          }
        : {
            // @ts-ignore
            customerConfirmed: false,
            // @ts-ignore
            customerConfirmedBy: null,
            // @ts-ignore
            customerConfirmedAt: null,
          },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH customer-confirmed error:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật" },
      { status: 500 }
    );
  }
}
