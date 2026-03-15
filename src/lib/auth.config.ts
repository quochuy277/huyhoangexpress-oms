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

      if (isAuthPage) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      if (!isLoggedIn) return false;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: Role }).role;
        token.name = user.name;
        token.permissions = (user as { permissions: PermissionSet }).permissions;
        token.permissionsUpdatedAt = Date.now();
      }

      // Refresh permissions from DB every 5 minutes to pick up admin changes
      const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 min
      const lastUpdate = (token.permissionsUpdatedAt as number) || 0;
      if (token.id && Date.now() - lastUpdate > REFRESH_INTERVAL) {
        try {
          const { prisma } = await import("@/lib/prisma");
          const { extractPermissions, getDefaultPermissions } = await import("@/lib/permissions");
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, permissionGroup: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.permissions = dbUser.permissionGroup
              ? extractPermissions(dbUser.permissionGroup as unknown as Record<string, unknown>)
              : getDefaultPermissions(dbUser.role);
          }
          token.permissionsUpdatedAt = Date.now();
        } catch {
          // Silently fail — keep existing permissions
        }
      }

      return token;
    },
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
