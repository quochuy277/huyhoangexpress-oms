import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — List all links sorted by sortOrder
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const links = await prisma.importantLink.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ links });
}

// POST — Create link (admin only)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const { title, url, description } = await req.json();
  if (!title || !url) return NextResponse.json({ error: "Thiếu tiêu đề hoặc URL" }, { status: 400 });

  // Get max sortOrder
  const maxLink = await prisma.importantLink.findFirst({ orderBy: { sortOrder: "desc" } });
  const sortOrder = (maxLink?.sortOrder ?? -1) + 1;

  const link = await prisma.importantLink.create({
    data: {
      title,
      url,
      description: description || null,
      sortOrder,
      createdBy: session.user.name || "Admin",
    },
  });
  return NextResponse.json({ link });
}

// PATCH — Reorder links (admin only)
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const { orderedIds } = await req.json();
  if (!Array.isArray(orderedIds)) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  await Promise.all(
    orderedIds.map((id: string, index: number) =>
      prisma.importantLink.update({ where: { id }, data: { sortOrder: index } })
    )
  );
  return NextResponse.json({ success: true });
}
