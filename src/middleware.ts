import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { PermissionSet } from "@/lib/permissions";
import { hasPermission } from "@/lib/route-permissions";

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

export default auth((req: NextRequest & { auth: { user?: { role?: string; permissions?: PermissionSet } } | null }) => {
  const { pathname } = req.nextUrl;
  const hostname = req.nextUrl.hostname;
  const session = req.auth;
  const isLoggedIn = !!session?.user;

  // Handle login subdomain
  if (hostname === "login.huyhoang.express") {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("https://huyhoang.express/orders"));
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.rewrite(url);
  }

  // Public routes (including /no-access which shows permission denied message)
  const isPublicPage = pathname === "/" || pathname.startsWith("/login") || pathname === "/no-access";
  if (isPublicPage) {
    if (isLoggedIn && pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL("/orders", req.url));
    }
    return NextResponse.next();
  }

  // Protected pages — must be logged in
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Permission-based restrictions
  const permissions = session?.user?.permissions;
  const userRole = session?.user?.role;

  for (const [route, permKey] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname.startsWith(route)) {
      // If no permissions object and not ADMIN, deny access
      if (!permissions && userRole !== "ADMIN") {
        return NextResponse.redirect(new URL("/no-access", req.url));
      }
      if (!hasPermission(session?.user, permKey)) {
        return NextResponse.redirect(new URL("/no-access", req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
