import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import { extractPermissions, getDefaultPermissions } from "@/lib/permissions";
import { parseDeviceType, getVietnamToday, isAfterTime, calculateLateMinutes, getAttendanceSettings } from "@/lib/attendance";
import { headers } from "next/headers";
import type { Role } from "@prisma/client";
import type { PermissionSet } from "@/lib/permissions";

const PERMISSIONS_REFRESH_INTERVAL = 30 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8 hours
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: Role }).role;
        token.name = user.name;
        token.permissions = (user as { permissions: PermissionSet }).permissions;
        token.permissionsUpdatedAt = Date.now();
      }

      const lastUpdate = (token.permissionsUpdatedAt as number) || 0;
      if (token.id && Date.now() - lastUpdate > PERMISSIONS_REFRESH_INTERVAL) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, name: true, permissionGroup: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.name = dbUser.name;
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
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email as string,
              isActive: true,
            },
            include: { permissionGroup: true },
          });

          if (!user) return null;

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isValid) return null;

          // Get request headers for IP and user-agent
          let ipAddress = "unknown";
          let userAgent = "unknown";
          try {
            const hdrs = await headers();
            ipAddress = hdrs.get("x-forwarded-for") || hdrs.get("x-real-ip") || "unknown";
            userAgent = hdrs.get("user-agent") || "unknown";
          } catch { /* headers not available */ }

          const deviceType = parseDeviceType(userAgent);
          const now = new Date();

          // Create LoginHistory (non-blocking)
          prisma.loginHistory.create({
            data: {
              userId: user.id,
              loginTime: now,
              ipAddress,
              userAgent,
              deviceType,
            },
          }).catch((err) => console.warn("[Auth:LoginHistory]", err?.message ?? err));

          // Auto check-in attendance with late detection (non-blocking)
          const today = getVietnamToday();
          getAttendanceSettings().then(settings => {
            const late = isAfterTime(now, settings.lateTime);
            const lateMins = calculateLateMinutes(now, settings.lateTime);

            prisma.attendance.upsert({
              where: { userId_date: { userId: user.id, date: today } },
              create: {
                userId: user.id,
                date: today,
                firstLogin: now,
                isLate: late,
                lateMinutes: lateMins,
                status: "ABSENT",
              },
              update: {},
            }).catch((err) => console.warn("[Auth:Attendance]", err?.message ?? err));
          }).catch((err) => console.warn("[Auth:AttendanceSettings]", err?.message ?? err));

          // Build permissions from permissionGroup or fallback to role
          const permissions = user.permissionGroup
            ? extractPermissions(user.permissionGroup as unknown as Record<string, unknown>)
            : getDefaultPermissions(user.role);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            permissions,
          };
        } catch (error) {
          console.error("Authorize Error:", error);
          return null;
        }
      },
    }),
  ],
});
