import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleLogout } from "@/lib/attendance";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json();
    const { reason, effectiveLogoutTime } = body;

    await handleLogout(
      session.user.id,
      reason || "manual",
      effectiveLogoutTime ? new Date(effectiveLogoutTime) : undefined
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Track logout error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
