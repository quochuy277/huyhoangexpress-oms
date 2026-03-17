import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";

// GET — Download document file
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  try {
    const filePath = path.join(process.cwd(), "public", doc.filePath);
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(doc.fileName).toLowerCase();

    const mimeMap: Record<string, string> = {
      ".pdf": "application/pdf",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".doc": "application/msword",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".xls": "application/vnd.ms-excel",
    };

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeMap[ext] || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.fileName)}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File không tồn tại" }, { status: 404 });
  }
}
