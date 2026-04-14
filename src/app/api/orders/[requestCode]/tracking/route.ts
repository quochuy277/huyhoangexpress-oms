import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { requirePermission } from "@/lib/route-permissions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ requestCode: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const denied = requirePermission(session.user, "canViewOrders", "Bạn không có quyền xem đơn hàng");
  if (denied) return denied;

  const { requestCode } = await params;

  if (!requestCode) {
    return NextResponse.json({ error: "Missing requestCode" }, { status: 400 });
  }

  try {
    const url = `https://api.svexpress.vn/v1/order/tracking-landing-page/${requestCode}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "*/*",
        "accept-language":
          "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5,hr;q=0.4",
        priority: "u=1, i",
        referer: "https://giaohangsieuviet.com/",
        "sec-ch-ua":
          '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
      },
      cache: "force-cache",
      next: { revalidate: 300 },
    });

    const text = await response.text();

    if (!response.ok) {
      logger.error("GET /api/orders/[requestCode]/tracking", `${response.status} for ${requestCode}`, text);
      return NextResponse.json(
        { error: "Tracking API error", status: response.status, detail: text },
        { status: response.status }
      );
    }

    try {
      const data = JSON.parse(text);
      return NextResponse.json(data);
    } catch {
      logger.error("GET /api/orders/[requestCode]/tracking", `Invalid JSON for ${requestCode}`, text.substring(0, 200));
      return NextResponse.json(
        { error: "Invalid response from tracking API" },
        { status: 502 }
      );
    }
  } catch (err) {
    logger.error("GET /api/orders/[requestCode]/tracking", `Fetch error for ${requestCode}`, err);
    return NextResponse.json(
      { error: "Failed to fetch tracking data" },
      { status: 500 }
    );
  }
}
