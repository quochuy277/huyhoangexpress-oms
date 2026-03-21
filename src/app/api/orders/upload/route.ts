import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseExcelBuffer, buildOrderData } from "@/lib/excel-parser";
import { uploadLimiter } from "@/lib/rate-limiter";
import { detectOrderChanges } from "@/lib/change-detector";
import type { DetectedChange } from "@/lib/change-detector";

const BATCH_SIZE = 500;

export async function POST(req: NextRequest) {
  // 1. Auth check
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  // Rate limit
  const rateLimited = uploadLimiter.check(session.user.id!);
  if (rateLimited) return rateLimited;
  const permissions = session.user.permissions;
  if (!permissions?.canUploadExcel) {
    return NextResponse.json(
      { error: "Bạn không có quyền tải lên file" },
      { status: 403 }
    );
  }

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

  const startTime = Date.now();

  // 4. Parse Excel
  const buffer = await file.arrayBuffer();
  const parseResult = parseExcelBuffer(buffer);

  if (parseResult.orders.length === 0) {
    return NextResponse.json({
      success: false,
      summary: parseResult.summary,
      errors: parseResult.errors.slice(0, 50),
    });
  }

  // 5. Batch upsert with change detection
  // Strategy: query existing BEFORE upsert (outside transaction),
  // detect changes in memory, then upsert in parallel (original pattern),
  // then bulk insert change logs.
  let newCount = 0;
  let updatedCount = 0;
  let failedCount = 0;
  let totalChanges = 0;
  const allDetectedChanges: DetectedChange[] = [];
  const upsertErrors: Array<{
    row: number;
    requestCode: string;
    message: string;
  }> = [];

  for (
    let batchStart = 0;
    batchStart < parseResult.orders.length;
    batchStart += BATCH_SIZE
  ) {
    const batch = parseResult.orders.slice(
      batchStart,
      batchStart + BATCH_SIZE
    );
    const requestCodes = batch.map((o) => o.requestCode);

    // a. Query existing orders BEFORE upsert — get old data for comparison
    const existingOrders = await prisma.order.findMany({
      where: { requestCode: { in: requestCodes } },
      select: {
        requestCode: true,
        deliveryStatus: true,
        internalNotes: true,
      },
    });
    const existingMap = new Map(
      existingOrders.map((o) => [o.requestCode, o])
    );

    // b. Detect changes in memory (BEFORE any upserts)
    for (const order of batch) {
      const existing = existingMap.get(order.requestCode);
      if (existing) {
        const changes = detectOrderChanges(
          existing,
          order.deliveryStatus,
          order.internalNotes
        );
        allDetectedChanges.push(...changes);
      }
    }

    // c. Upsert orders in parallel (original pattern — no transaction wrapper)
    const promises = batch.map(async (order, idx) => {
      try {
        const data = buildOrderData(order);
        const isExisting = existingMap.has(order.requestCode);

        await prisma.order.upsert({
          where: { requestCode: order.requestCode },
          create: {
            requestCode: order.requestCode,
            ...data,
          },
          update: data,
        });

        if (isExisting) {
          updatedCount++;
        } else {
          newCount++;
        }
      } catch (err) {
        failedCount++;
        upsertErrors.push({
          row: batchStart + idx + 2,
          requestCode: order.requestCode,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    });

    await Promise.all(promises);
  }

  const processingTime = Date.now() - startTime;
  totalChanges = allDetectedChanges.length;

  // 6. Save upload history
  let uploadHistoryId: string | null = null;
  try {
    const uploadHistory = await prisma.uploadHistory.create({
      data: {
        fileName: file.name,
        fileSize: file.size,
        totalRows: parseResult.summary.totalRows,
        newOrders: newCount,
        updatedOrders: updatedCount,
        skippedRows: parseResult.summary.skippedRows,
        failedRows: failedCount + parseResult.summary.errorRows,
        errorLog:
          upsertErrors.length > 0 || parseResult.errors.length > 0
            ? JSON.stringify({
                parseErrors: parseResult.errors.slice(0, 20),
                upsertErrors: upsertErrors.slice(0, 20),
              })
            : null,
        carrierName: parseResult.orders[0]?.carrierName || null,
        uploadedById: session.user.id,
        processingTime,
        totalChanges,
      },
    });
    uploadHistoryId = uploadHistory.id;
  } catch (err) {
    console.error("Failed to create UploadHistory:", err);
  }

  // 7. Bulk insert change logs (after upserts complete)
  if (allDetectedChanges.length > 0 && uploadHistoryId) {
    try {
      // Insert in chunks of 1000 to avoid query size limits
      const CHUNK_SIZE = 1000;
      for (let i = 0; i < allDetectedChanges.length; i += CHUNK_SIZE) {
        const chunk = allDetectedChanges.slice(i, i + CHUNK_SIZE);
        await prisma.orderChangeLog.createMany({
          data: chunk.map((c) => ({
            requestCode: c.requestCode,
            uploadHistoryId: uploadHistoryId!,
            changeType: c.changeType,
            previousValue: c.previousValue,
            newValue: c.newValue,
            changeDetail: c.changeDetail,
            changeTimestamp: c.changeTimestamp,
          })),
        });
      }
    } catch (err) {
      console.error("Failed to insert change logs:", err);
    }
  }

  // 8. Return result
  return NextResponse.json({
    success: true,
    summary: {
      totalRows: parseResult.summary.totalRows,
      validRows: parseResult.summary.validRows,
      newOrders: newCount,
      updatedOrders: updatedCount,
      skippedRows: parseResult.summary.skippedRows,
      failedRows: failedCount,
      parseErrors: parseResult.summary.errorRows,
      processingTime,
      totalChanges,
    },
    errors: [
      ...parseResult.errors.slice(0, 25),
      ...upsertErrors.slice(0, 25).map((e) => ({
        row: e.row,
        field: "upsert",
        value: e.requestCode,
        message: e.message,
      })),
    ],
  });
}
