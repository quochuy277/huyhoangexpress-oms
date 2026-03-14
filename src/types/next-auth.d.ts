import type { DefaultSession, DefaultUser } from "next-auth";
import type { Role } from "@prisma/client";
import type { PermissionSet } from "@/lib/permissions";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: Role;
      name: string;
      email: string;
      permissions: PermissionSet;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: Role;
    permissions: PermissionSet;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    permissions: PermissionSet;
  }
}
