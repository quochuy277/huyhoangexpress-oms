import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireClaimsPermission } from "@/lib/claims-permissions";
import { createAutoDetectedClaims } from "@/lib/claim-detector";
import { clearClaimsFilterOptionsCache } from "@/lib/claims-filter-options-cache";
import { logger } from "@/lib/logger";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    const denied = requireClaimsPermission(session.user, "canUpdateClaim");
    if (denied) {
      return denied;
    }

    const result = await createAutoDetectedClaims(session.user.id);

    if (result.newClaims > 0) {
      clearClaimsFilterOptionsCache();
    }

    const messages: string[] = [];
    if (result.newClaims > 0) messages.push(`Thêm ${result.newClaims} đơn có vấn đề mới`);
    if (result.reopenedClaims > 0) messages.push(`Mở lại ${result.reopenedClaims} đơn đã hoàn tất do phát hiện vấn đề mới`);
    if (result.autoCompleted > 0) messages.push(`Tự động hoàn tất ${result.autoCompleted} đơn đã đối soát/trả hàng`);

    return NextResponse.json({
      success: true,
      newClaims: result.newClaims,
      reopenedClaims: result.reopenedClaims,
      autoCompleted: result.autoCompleted,
      message: messages.length > 0 ? messages.join(". ") : "Không phát hiện thay đổi mới",
    });
  } catch (error) {
    logger.error("POST /api/claims/auto-detect", "Error", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
