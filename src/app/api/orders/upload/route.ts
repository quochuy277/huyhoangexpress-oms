import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadLimiter } from "@/lib/rate-limiter";
import { processOrderImport } from "@/lib/order-import-service";
import { requirePermission } from "@/lib/route-permissions";

// Vercel serverless max duration (seconds)
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // 1. Auth check
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const denied = requirePermission(session.user, "canUploadExcel", "Bạn không có quyền tải lên file");
  if (denied) return denied;

  // Rate limit
  const rateLimited = uploadLimiter.check(session.user.id!);
  if (rateLimited) return rateLimited;

  // 2. Get file from form data
  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Vui lòng chọn file Excel (.xlsx, .xls)" },
      { status: 400 }
    );
  }

  // 3. Validate file
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: "File quá lớn. Kích thước tối đa: 10MB" },
      { status: 400 }
    );
  }

  const validExtensions = [".xlsx", ".xls"];
  const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
  if (!validExtensions.includes(ext)) {
    return NextResponse.json(
      { error: "Định dạng file không hỗ trợ. Chỉ chấp nhận .xlsx và .xls" },
      { status: 400 }
    );
  }

  // 4. Process import
  const buffer = await file.arrayBuffer();
  const result = await processOrderImport({
    buffer,
    fileName: file.name,
    fileSize: file.size,
    uploadedById: session.user.id!,
  });

  return NextResponse.json(result);
}
