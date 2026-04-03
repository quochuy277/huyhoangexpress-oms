import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { PermissionSet } from "@/lib/permissions";
import { hasPermission } from "@/lib/route-permissions";

const { auth } = NextAuth(authConfig);

// Route → required permission key
const ROUTE_PERMISSIONS: Record<string, keyof PermissionSet> = {
  "/admin/users": "canManageUsers",
  "/finance": "canViewFinancePage",
  "/delayed": "canViewDelayed",
  "/returns": "canViewReturns",
  "/claims": "canViewClaims",
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

  // Public routes
  const isPublicPage = pathname === "/" || pathname.startsWith("/login");
  const isPublicApi = pathname.startsWith("/api/auth") || pathname.startsWith("/api/landing");

  if (isPublicPage || isPublicApi) {
    if (isLoggedIn && pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL("/orders", req.url));
    }
    return NextResponse.next();
  }

  // Auto-import API — API key auth (no session required)
  if (pathname === "/api/orders/auto-import") {
    const apiKey = req.headers.get("x-api-key");
    if (!process.env.AUTO_IMPORT_API_KEY || apiKey !== process.env.AUTO_IMPORT_API_KEY) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // API routes — check auth but let handlers validate permissions
  if (pathname.startsWith("/api/")) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Protected pages — must be logged in
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Permission-based restrictions
  const permissions = session?.user?.permissions;
  if (permissions) {
    for (const [route, permKey] of Object.entries(ROUTE_PERMISSIONS)) {
      if (pathname.startsWith(route) && !hasPermission(session?.user, permKey)) {
        return NextResponse.redirect(new URL("/orders", req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
