import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseExcelBuffer, buildOrderData } from "@/lib/excel-parser";
import { uploadLimiter } from "@/lib/rate-limiter";
import { detectOrderChanges } from "@/lib/change-detector";
import type { DetectedChange } from "@/lib/change-detector";
import type { ParsedOrder } from "@/lib/excel-parser";
import { Prisma } from "@prisma/client";

const BATCH_SIZE = 500;
const SQL_SUB_BATCH = 250; // Rows per raw SQL INSERT (~15k params, within PostgreSQL 65535 limit)

// Vercel serverless max duration (seconds)
export const maxDuration = 60;

/**
 * Bulk upsert a sub-batch of orders using Prisma.sql tagged template.
 * Uses INSERT ... ON CONFLICT DO UPDATE for maximum performance.
 * Prisma.sql handles parameter binding correctly (including enum casting).
 */
async function bulkUpsertSubBatch(orders: ParsedOrder[]): Promise<void> {
  if (orders.length === 0) return;

  const rowSqls = orders.map((order) => {
    const data = buildOrderData(order);
    const id = generateCuid();

    return Prisma.sql`(
      ${id}, ${order.requestCode}, ${data.status},
      ${data.deliveryStatus}::"DeliveryStatus",
      ${data.reconciliationCode}, ${data.reconciliationDate},
      ${data.shopName}, ${data.customerOrderCode},
      ${data.createdTime}, ${data.pickupTime},
      ${data.codAmount}, ${data.codOriginal}, ${data.declaredValue}, ${data.shippingFee},
      ${data.surcharge}, ${data.overweightFee}, ${data.insuranceFee}, ${data.codServiceFee},
      ${data.returnFee}, ${data.totalFee}, ${data.carrierFee}, ${data.ghsvInsuranceFee}, ${data.revenue},
      ${data.creatorShopName}, ${data.creatorPhone}, ${data.creatorStaff}, ${data.creatorAddress},
      ${data.creatorWard}, ${data.creatorDistrict}, ${data.creatorProvince},
      ${data.senderShopName}, ${data.senderPhone}, ${data.senderAddress},
      ${data.senderWard}, ${data.senderDistrict}, ${data.senderProvince},
      ${data.receiverName}, ${data.receiverPhone}, ${data.receiverAddress},
      ${data.receiverWard}, ${data.receiverDistrict}, ${data.receiverProvince},
      ${data.deliveryNotes}, ${data.productDescription}, ${data.paymentConfirmDate},
      ${data.internalNotes}, ${data.publicNotes}, ${data.lastUpdated},
      ${data.carrierName}, ${data.carrierAccount}, ${data.carrierOrderCode}, ${data.regionGroup},
      ${data.customerWeight ?? null}, ${data.carrierWeight ?? null}, ${data.deliveredDate},
      ${data.pickupShipper}, ${data.deliveryShipper}, ${data.orderSource},
      ${data.partialOrderType}, ${data.partialOrderCode}, ${data.salesStaff},
      NOW()
    )`;
  });

  await prisma.$executeRaw`
    INSERT INTO "Order" (
      "id", "requestCode", "status", "deliveryStatus",
      "reconciliationCode", "reconciliationDate", "shopName", "customerOrderCode",
      "createdTime", "pickupTime",
      "codAmount", "codOriginal", "declaredValue", "shippingFee",
      "surcharge", "overweightFee", "insuranceFee", "codServiceFee",
      "returnFee", "totalFee", "carrierFee", "ghsvInsuranceFee", "revenue",
      "creatorShopName", "creatorPhone", "creatorStaff", "creatorAddress",
      "creatorWard", "creatorDistrict", "creatorProvince",
      "senderShopName", "senderPhone", "senderAddress",
      "senderWard", "senderDistrict", "senderProvince",
      "receiverName", "receiverPhone", "receiverAddress",
      "receiverWard", "receiverDistrict", "receiverProvince",
      "deliveryNotes", "productDescription", "paymentConfirmDate",
      "internalNotes", "publicNotes", "lastUpdated",
      "carrierName", "carrierAccount", "carrierOrderCode", "regionGroup",
      "customerWeight", "carrierWeight", "deliveredDate",
      "pickupShipper", "deliveryShipper", "orderSource",
      "partialOrderType", "partialOrderCode", "salesStaff",
      "updatedInDb"
    )
    VALUES ${Prisma.join(rowSqls)}
    ON CONFLICT ("requestCode") DO UPDATE SET
      "status" = EXCLUDED."status",
      "deliveryStatus" = EXCLUDED."deliveryStatus",
      "reconciliationCode" = EXCLUDED."reconciliationCode",
      "reconciliationDate" = EXCLUDED."reconciliationDate",
      "shopName" = EXCLUDED."shopName",
      "customerOrderCode" = EXCLUDED."customerOrderCode",
      "createdTime" = EXCLUDED."createdTime",
      "pickupTime" = EXCLUDED."pickupTime",
      "codAmount" = EXCLUDED."codAmount",
      "codOriginal" = EXCLUDED."codOriginal",
      "declaredValue" = EXCLUDED."declaredValue",
      "shippingFee" = EXCLUDED."shippingFee",
      "surcharge" = EXCLUDED."surcharge",
      "overweightFee" = EXCLUDED."overweightFee",
      "insuranceFee" = EXCLUDED."insuranceFee",
      "codServiceFee" = EXCLUDED."codServiceFee",
      "returnFee" = EXCLUDED."returnFee",
      "totalFee" = EXCLUDED."totalFee",
      "carrierFee" = EXCLUDED."carrierFee",
      "ghsvInsuranceFee" = EXCLUDED."ghsvInsuranceFee",
      "revenue" = EXCLUDED."revenue",
      "creatorShopName" = EXCLUDED."creatorShopName",
      "creatorPhone" = EXCLUDED."creatorPhone",
      "creatorStaff" = EXCLUDED."creatorStaff",
      "creatorAddress" = EXCLUDED."creatorAddress",
      "creatorWard" = EXCLUDED."creatorWard",
      "creatorDistrict" = EXCLUDED."creatorDistrict",
      "creatorProvince" = EXCLUDED."creatorProvince",
      "senderShopName" = EXCLUDED."senderShopName",
      "senderPhone" = EXCLUDED."senderPhone",
      "senderAddress" = EXCLUDED."senderAddress",
      "senderWard" = EXCLUDED."senderWard",
      "senderDistrict" = EXCLUDED."senderDistrict",
      "senderProvince" = EXCLUDED."senderProvince",
      "receiverName" = EXCLUDED."receiverName",
      "receiverPhone" = EXCLUDED."receiverPhone",
      "receiverAddress" = EXCLUDED."receiverAddress",
      "receiverWard" = EXCLUDED."receiverWard",
      "receiverDistrict" = EXCLUDED."receiverDistrict",
      "receiverProvince" = EXCLUDED."receiverProvince",
      "deliveryNotes" = EXCLUDED."deliveryNotes",
      "productDescription" = EXCLUDED."productDescription",
      "paymentConfirmDate" = EXCLUDED."paymentConfirmDate",
      "internalNotes" = EXCLUDED."internalNotes",
      "publicNotes" = EXCLUDED."publicNotes",
      "lastUpdated" = EXCLUDED."lastUpdated",
      "carrierName" = EXCLUDED."carrierName",
      "carrierAccount" = EXCLUDED."carrierAccount",
      "carrierOrderCode" = EXCLUDED."carrierOrderCode",
      "regionGroup" = EXCLUDED."regionGroup",
      "customerWeight" = EXCLUDED."customerWeight",
      "carrierWeight" = EXCLUDED."carrierWeight",
      "deliveredDate" = EXCLUDED."deliveredDate",
      "pickupShipper" = EXCLUDED."pickupShipper",
      "deliveryShipper" = EXCLUDED."deliveryShipper",
      "orderSource" = EXCLUDED."orderSource",
      "partialOrderType" = EXCLUDED."partialOrderType",
      "partialOrderCode" = EXCLUDED."partialOrderCode",
      "salesStaff" = EXCLUDED."salesStaff",
      "updatedInDb" = NOW()
  `;
}

function generateCuid(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  const counter = Math.floor(Math.random() * 1000).toString(36);
  return `c${timestamp}${random}${counter}`;
}

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

    // a. Query existing orders BEFORE upsert
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

    // b. Detect changes in memory
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

    // c. Bulk upsert using sub-batches of raw SQL
    try {
      for (let i = 0; i < batch.length; i += SQL_SUB_BATCH) {
        const subBatch = batch.slice(i, i + SQL_SUB_BATCH);
        await bulkUpsertSubBatch(subBatch);
      }

      // Count new vs updated
      for (const order of batch) {
        if (existingMap.has(order.requestCode)) {
          updatedCount++;
        } else {
          newCount++;
        }
      }
    } catch (err) {
      failedCount += batch.length;
      upsertErrors.push({
        row: batchStart + 2,
        requestCode: batch[0]?.requestCode ?? "unknown",
        message: `Batch failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
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

  // 7. Bulk insert change logs
  if (allDetectedChanges.length > 0 && uploadHistoryId) {
    try {
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
