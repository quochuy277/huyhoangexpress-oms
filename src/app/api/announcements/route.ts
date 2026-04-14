import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/route-permissions";
import { logger } from "@/lib/logger";

// GET — List announcements (all users, paginated)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(50, parseInt(url.searchParams.get("pageSize") || "20"));
    const userId = (session.user as { id: string }).id;

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          reads: { where: { userId }, select: { readAt: true } },
          _count: { select: { reads: true } },
        },
      }),
      prisma.announcement.count(),
    ]);

    const data = announcements.map(a => ({
      id: a.id,
      title: a.title,
      content: a.content,
      attachmentUrl: a.attachmentUrl,
      attachmentName: a.attachmentName,
      isPinned: a.isPinned,
      createdBy: a.createdBy,
      createdByName: a.createdByName,
      createdAt: a.createdAt,
      isRead: a.reads.length > 0,
      readCount: a._count.reads,
    }));

    return NextResponse.json({ announcements: data, total, page, pageSize });
  } catch (error) {
    logger.error("GET /api/announcements", "page=" + new URL(req.url).searchParams.get("page"), error);
    return NextResponse.json({ error: "Không thể tải thông báo" }, { status: 500 });
  }
}

// POST — Create announcement (Admin or canCreateAnnouncement)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const denied = requirePermission(session.user, "canCreateAnnouncement", "Không có quyền tạo thông báo");
    if (denied) return denied;

    const user = session.user as { id: string; name?: string };

    const body = await req.json();
    const { title, content, attachmentUrl, attachmentName, isPinned } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Tiêu đề và nội dung không được để trống" }, { status: 400 });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        attachmentUrl: attachmentUrl || null,
        attachmentName: attachmentName || null,
        isPinned: !!isPinned,
        createdBy: user.id,
        createdByName: user.name || "Admin",
      },
    });

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    logger.error("POST /api/announcements", "Error", error);
    return NextResponse.json({ error: "Không thể tạo thông báo" }, { status: 500 });
  }
}
