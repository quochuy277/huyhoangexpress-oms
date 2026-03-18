import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — Get current user's profile info
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      dateOfBirth: true,
      hometown: true,
      permanentAddress: true,
      currentAddress: true,
      citizenId: true,
      phone: true,
      socialLink: true,
      role: true,
      department: true,
      position: true,
      avatar: true,
      createdAt: true,
      permissionGroup: { select: { id: true, name: true } },
    },
  });

  if (!user) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  return NextResponse.json(user);
}
