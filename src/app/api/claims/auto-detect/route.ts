import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAutoDetectedClaims } from "@/lib/claim-detector";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const count = await createAutoDetectedClaims(session.user.id);

    return NextResponse.json({
      success: true,
      newClaims: count,
      message: count > 0
        ? `Đã phát hiện và thêm ${count} đơn có vấn đề mới`
        : "Không phát hiện đơn có vấn đề mới",
    });
  } catch (error) {
    console.error("POST /api/claims/auto-detect error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
