import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import { extractPermissions, getDefaultPermissions } from "@/lib/permissions";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8 hours
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

          // Record login history (non-blocking)
          prisma.loginHistory.create({
            data: { userId: user.id },
          }).catch(() => {});

          // Auto check-in attendance (non-blocking)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          prisma.attendance.upsert({
            where: { userId_date: { userId: user.id, date: today } },
            update: {},
            create: {
              userId: user.id,
              date: today,
              checkIn: new Date(),
              status:
                new Date().getHours() >= 9 ? "LATE" : "PRESENT",
            },
          }).catch(() => {});

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
