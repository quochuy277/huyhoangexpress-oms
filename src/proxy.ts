import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { hasPermission } from "@/lib/route-permissions";
import type { PermissionSet } from "@/lib/permissions";
import { isMutatingMethod, isSameOriginRequest } from "@/lib/api-guard";

const { auth } = NextAuth(authConfig);

// Route → required permission key
// NOTE: /todos and /attendance are intentionally NOT listed here.
// All logged-in users can access their own todos and attendance records.
// Feature-level restrictions (e.g. canViewAllTodos, canViewAllAttendance) are
// enforced at the component/API level, not at the route level.
const ROUTE_PERMISSIONS: Record<string, keyof PermissionSet> = {
  "/admin/users": "canManageUsers",
  "/finance": "canViewFinancePage",
  "/delayed": "canViewDelayed",
  "/returns": "canViewReturns",
  "/claims": "canViewClaims",
  "/orders": "canViewOrders",
  "/crm": "canViewCRM",
  "/overview": "canViewDashboard",
};

// Defense-in-depth CSRF check for API state-changing requests.
// NextAuth callback routes are excluded because the provider handles its own
// checks and some flows (e.g. OAuth redirect) arrive with a different origin.
function isApiOriginMismatch(req: NextRequest): boolean {
  if (!req.nextUrl.pathname.startsWith("/api/")) return false;
  if (req.nextUrl.pathname.startsWith("/api/auth/")) return false;
  if (req.nextUrl.pathname === "/api/orders/auto-import") return false;
  if (!isMutatingMethod(req.method)) return false;

  return !isSameOriginRequest(req);
}

export default auth((req: NextRequest & { auth: { user?: { role?: string; permissions?: PermissionSet } } | null }) => {
  const { pathname } = req.nextUrl;
  const hostname = req.nextUrl.hostname;
  const session = req.auth;
  const isLoggedIn = !!session?.user;

  if (pathname.startsWith("/api/")) {
    if (isApiOriginMismatch(req)) {
      return NextResponse.json({ error: "Origin không hợp lệ" }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (hostname === "login.huyhoang.express") {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("https://huyhoang.express/orders"));
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.rewrite(url);
  }

  const isPublicPage = pathname === "/" || pathname.startsWith("/login") || pathname === "/no-access";
  if (isPublicPage) {
    if (isLoggedIn && pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL("/orders", req.url));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const permissions = session?.user?.permissions;
  const userRole = session?.user?.role;

  for (const [route, permKey] of Object.entries(ROUTE_PERMISSIONS)) {
    if (!pathname.startsWith(route)) {
      continue;
    }

    if (!permissions && userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/no-access", req.url));
    }

    if (!hasPermission(session?.user, permKey)) {
      return NextResponse.redirect(new URL("/no-access", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
