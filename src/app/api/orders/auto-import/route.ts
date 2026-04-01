import { NextRequest, NextResponse } from "next/server";
import { autoImportLimiter } from "@/lib/rate-limiter";
import { processOrderImport, getSystemUserId } from "@/lib/order-import-service";

// Vercel serverless max duration (seconds)
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // 1. Rate limit
  const rateLimited = autoImportLimiter.check("auto-import");
  if (rateLimited) return rateLimited;

  // 2. Get file from form data
  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing file in form data" },
      { status: 400 }
    );
  }

  // 3. Validate file
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: "File too large. Max: 10MB" },
      { status: 400 }
    );
  }

  const validExtensions = [".xlsx", ".xls"];
  const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
  if (!validExtensions.includes(ext)) {
    return NextResponse.json(
      { error: "Invalid file format. Only .xlsx and .xls accepted" },
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
