"use server";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/route-permissions";
import path from "path";
import fs from "fs/promises";
import { logger } from "@/lib/logger";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "documents");

// GET — List all documents
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const documents = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ documents });
}

// POST — Upload document (admin only)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (!hasPermission(session.user, "canManageDocuments")) {
    return NextResponse.json({ error: "Không có quyền quản lý tài liệu" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const file = formData.get("file") as File;

    if (!name || !file) {
      return NextResponse.json({ error: "Thiếu tên tài liệu hoặc file" }, { status: 400 });
    }

    const allowedExts = [".docx", ".pdf", ".xlsx", ".xls", ".doc"];
    const ext = path.extname(file.name).toLowerCase();
    if (!allowedExts.includes(ext)) {
      return NextResponse.json({ error: "Chỉ hỗ trợ file .docx, .pdf, .xlsx" }, { status: 400 });
    }

    // Ensure upload directory exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    // Generate unique filename
    const uniqueName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const doc = await prisma.document.create({
      data: {
        name,
        fileName: file.name,
        fileSize: file.size,
        filePath: `/uploads/documents/${uniqueName}`,
        uploadedBy: session.user.name || "Admin",
      },
    });

    return NextResponse.json({ document: doc });
  } catch (e) {
    logger.error("POST /api/documents", "Upload error", e);
    return NextResponse.json({ error: "Lỗi tải lên" }, { status: 500 });
  }
}
