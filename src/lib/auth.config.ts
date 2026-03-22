import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";
import type { PermissionSet } from "@/lib/permissions";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = nextUrl.pathname.startsWith("/login");
      const isLandingPage = nextUrl.pathname === "/";

      if (isAuthPage) {
        if (isLoggedIn) return Response.redirect(new URL("/orders", nextUrl));
        return true;
      }

      // Landing page is public
      if (isLandingPage) return true;

      if (!isLoggedIn) return false;
      return true;
    },
    // NOTE: jwt callback is defined in auth.ts (with DB permission refresh)
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.name = token.name as string;
        session.user.permissions = token.permissions as PermissionSet;
      }
      return session;
    },
  },
  providers: [], // Added later in auth.ts
} satisfies NextAuthConfig;
