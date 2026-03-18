import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — Count unread announcements for current user
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ count: 0 });

  const userId = (session.user as { id: string }).id;

  const total = await prisma.announcement.count();
  const read = await prisma.announcementRead.count({ where: { userId } });

  return NextResponse.json({ count: Math.max(0, total - read) });
}
