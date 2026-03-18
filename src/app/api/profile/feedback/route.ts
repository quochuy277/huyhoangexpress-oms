import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — List feedbacks (admin: all, user: own)
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const user = session.user as { id: string; role: string };

  const feedbacks = await prisma.feedback.findMany({
    where: user.role === "ADMIN" ? {} : { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(feedbacks);
}

// POST — Submit feedback
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const user = session.user as { id: string; name?: string };
  const { content } = await req.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: "Nội dung không được để trống" }, { status: 400 });
  }

  const feedback = await prisma.feedback.create({
    data: {
      userId: user.id,
      userName: user.name || "Unknown",
      content: content.trim(),
    },
  });

  return NextResponse.json(feedback, { status: 201 });
}
