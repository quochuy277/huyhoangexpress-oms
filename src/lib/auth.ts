import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import { extractPermissions, getDefaultPermissions } from "@/lib/permissions";
import { parseDeviceType, getVietnamToday, isAfterTime, calculateLateMinutes, getAttendanceSettings } from "@/lib/attendance";
import { loginLimiter } from "@/lib/rate-limiter";
import { headers } from "next/headers";
import type { Role } from "@prisma/client";
import type { PermissionSet } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import { DUMMY_BCRYPT_HASH, BCRYPT_COST } from "@/lib/auth-constants";

const PERMISSIONS_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes (reduced from 30 for faster permission propagation)

// Custom code surfaced by NextAuth so the server action can distinguish
// rate-limit errors from generic "wrong credentials".
class RateLimitError extends CredentialsSignin {
  code = "RateLimit";
}

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
            select: { role: true, name: true, isActive: true, permissionGroup: true },
          });
          if (!dbUser || !dbUser.isActive) {
            // User deactivated or deleted — invalidate token
            return { ...token, id: null, role: null, permissions: null };
          }
          token.role = dbUser.role;
          token.name = dbUser.name;
          token.permissions = dbUser.permissionGroup
            ? extractPermissions(dbUser.permissionGroup as unknown as Record<string, unknown>)
            : getDefaultPermissions(dbUser.role);
          token.permissionsUpdatedAt = Date.now();
        } catch (error) {
          logger.warn("auth.jwt", "Failed to refresh permissions from database", { error });
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

        // Resolve IP + user-agent early so we can rate-limit before hitting the DB
        let ipAddress = "unknown";
        let userAgent = "unknown";
        try {
          const hdrs = await headers();
          ipAddress = hdrs.get("x-forwarded-for") || hdrs.get("x-real-ip") || "unknown";
          userAgent = hdrs.get("user-agent") || "unknown";
        } catch { /* headers not available */ }

        // Rate limit by IP. Returns a 429 Response if over the limit.
        // We translate it into a CredentialsSignin throw so NextAuth surfaces
        // the error instead of silently returning null.
        const rateLimited = loginLimiter.check(ipAddress);
        if (rateLimited) {
          logger.warn("auth.authorize", "Login rate limit hit", { ipAddress });
          throw new RateLimitError();
        }

        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email as string,
              isActive: true,
            },
            include: { permissionGroup: true },
          });

          // Always run bcrypt.compare to equalize timing between
          // "user not found" and "user found, wrong password". Without this,
          // attackers can enumerate emails by measuring response times.
          const hash = user?.password ?? DUMMY_BCRYPT_HASH;
          const isValid = await bcrypt.compare(
            credentials.password as string,
            hash,
          );

          if (!user || !isValid) return null;

          // Silent rehash: if the stored hash uses fewer rounds than the
          // current BCRYPT_COST (e.g. imported from a legacy system), upgrade
          // it now that we have the plaintext. Non-blocking — login succeeds
          // whether or not the re-hash lands.
          try {
            const currentRounds = bcrypt.getRounds(user.password);
            if (currentRounds < BCRYPT_COST) {
              bcrypt
                .hash(credentials.password as string, BCRYPT_COST)
                .then((rehashed) =>
                  prisma.user.update({
                    where: { id: user.id },
                    data: { password: rehashed },
                  }),
                )
                .catch((error) =>
                  logger.warn("auth.authorize", "Silent rehash failed", {
                    error,
                    userId: user.id,
                  }),
                );
            }
          } catch (error) {
            // getRounds throws on malformed hashes — log but don't fail login
            logger.warn("auth.authorize", "Could not inspect bcrypt rounds", {
              error,
              userId: user.id,
            });
          }

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
          }).catch((error) =>
            logger.warn("auth.authorize", "Failed to create login history", {
              error,
              userId: user.id,
            })
          );

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
            }).catch((error) =>
              logger.warn("auth.authorize", "Failed to upsert attendance", {
                error,
                userId: user.id,
              })
            );
          }).catch((error) =>
            logger.warn("auth.authorize", "Failed to load attendance settings", {
              error,
              userId: user.id,
            })
          );

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
          logger.error("auth.authorize", "Failed to authorize credentials", error, {
            email: credentials.email as string,
          });
          return null;
        }
      },
    }),
  ],
});
