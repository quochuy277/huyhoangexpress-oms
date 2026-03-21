import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleLogout } from "@/lib/attendance";

// Beacon endpoint for browser close — uses sendBeacon which sends POST with text/plain
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    await handleLogout(session.user.id, "browser_closed");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Signout beacon error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
