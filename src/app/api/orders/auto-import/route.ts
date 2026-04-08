import { NextRequest, NextResponse } from "next/server";
import { autoImportLimiter } from "@/lib/rate-limiter";
import { processOrderImport, getSystemUserId } from "@/lib/order-import-service";

// Vercel serverless max duration (seconds)
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!process.env.AUTO_IMPORT_API_KEY || apiKey !== process.env.AUTO_IMPORT_API_KEY) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // 1. Rate limit
  const rateLimited = autoImportLimiter.check("auto-import");
  if (rateLimited) return rateLimited;

  // 2. Get file from form data
  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Thiếu file trong form data" },
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
  const userId = await getSystemUserId();
  const buffer = await file.arrayBuffer();
  const result = await processOrderImport({
    buffer,
    fileName: file.name,
    fileSize: file.size,
    uploadedById: userId,
  });

  return NextResponse.json(result);
}
