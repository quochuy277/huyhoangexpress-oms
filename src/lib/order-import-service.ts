import { prisma } from "@/lib/prisma";
import { parseExcelBuffer, buildOrderData } from "@/lib/excel-parser";
import { detectOrderChanges } from "@/lib/change-detector";
import { createAutoDetectedClaims } from "@/lib/claim-detector";
import type { DetectedChange } from "@/lib/change-detector";
import type { ParsedOrder } from "@/lib/excel-parser";
import { Prisma, PrismaClient } from "@prisma/client";

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

const BATCH_SIZE = 500;
const SQL_SUB_BATCH = 250;

export interface ImportResult {
  success: boolean;
  summary: {
    totalRows: number;
    validRows: number;
    newOrders: number;
    updatedOrders: number;
    skippedRows: number;
    failedRows: number;
    parseErrors: number;
    processingTime: number;
    totalChanges: number;
  };
  errors: Array<{ row?: number; field?: string; value?: string; message: string }>;
}

function generateCuid(): string {
  return crypto.randomUUID();
}

async function bulkUpsertSubBatch(orders: ParsedOrder[], client: TxClient = prisma): Promise<void> {
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

  await client.$executeRaw`
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
      "receiverPhone" = CASE
        WHEN EXCLUDED."receiverPhone" IS NOT NULL
          AND EXCLUDED."receiverPhone" NOT LIKE '%*%'
        THEN EXCLUDED."receiverPhone"
        WHEN "Order"."receiverPhone" IS NOT NULL
          AND "Order"."receiverPhone" NOT LIKE '%*%'
        THEN "Order"."receiverPhone"
        ELSE EXCLUDED."receiverPhone"
      END,
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

// Cache system user ID across requests within the same serverless instance
let cachedSystemUserId: string | null = null;

export async function getSystemUserId(): Promise<string> {
  if (cachedSystemUserId) return cachedSystemUserId;

  const systemUser = await prisma.user.upsert({
    where: { email: "system@auto-import" },
    update: {},
    create: {
      email: "system@auto-import",
      password: "",
      name: "Auto Import",
      role: "STAFF",
      isActive: false,
    },
    select: { id: true },
  });

  cachedSystemUserId = systemUser.id;
  return cachedSystemUserId;
}

export async function processOrderImport(opts: {
  buffer: ArrayBuffer;
  fileName: string;
  fileSize: number;
  uploadedById: string;
}): Promise<ImportResult> {
  const startTime = Date.now();

  // 1. Parse Excel
  const parseResult = parseExcelBuffer(opts.buffer);

  if (parseResult.orders.length === 0) {
    return {
      success: false,
      summary: {
        ...parseResult.summary,
        newOrders: 0,
        updatedOrders: 0,
        failedRows: parseResult.summary.errorRows,
        parseErrors: parseResult.summary.errorRows,
        processingTime: Date.now() - startTime,
        totalChanges: 0,
      },
      errors: parseResult.errors.slice(0, 50),
    };
  }

  // 2. Batch upsert with change detection
  let newCount = 0;
  let updatedCount = 0;
  let failedCount = 0;
  const allDetectedChanges: DetectedChange[] = [];
  const upsertErrors: Array<{ row: number; requestCode: string; message: string }> = [];

  for (let batchStart = 0; batchStart < parseResult.orders.length; batchStart += BATCH_SIZE) {
    const batch = parseResult.orders.slice(batchStart, batchStart + BATCH_SIZE);
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
    const existingMap = new Map(existingOrders.map((o) => [o.requestCode, o]));

    // b. Detect changes in memory
    for (const order of batch) {
      const existing = existingMap.get(order.requestCode);
      if (existing) {
        const changes = detectOrderChanges(existing, order.deliveryStatus, order.internalNotes);
        allDetectedChanges.push(...changes);
      }
    }

    // c. Bulk upsert using sub-batches of raw SQL (within a transaction)
    try {
      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < batch.length; i += SQL_SUB_BATCH) {
          const subBatch = batch.slice(i, i + SQL_SUB_BATCH);
          await bulkUpsertSubBatch(subBatch, tx);
        }
      });

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
  const totalChanges = allDetectedChanges.length;

  // 3. Save upload history
  let uploadHistoryId: string | null = null;
  try {
    const uploadHistory = await prisma.uploadHistory.create({
      data: {
        fileName: opts.fileName,
        fileSize: opts.fileSize,
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
        uploadedById: opts.uploadedById,
        processingTime,
        totalChanges,
      },
    });
    uploadHistoryId = uploadHistory.id;
  } catch (err) {
    console.error("Failed to create UploadHistory:", err);
  }

  // 4. Bulk insert change logs
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

  // 5. Auto-detect claims (non-blocking)
  createAutoDetectedClaims(opts.uploadedById).catch((err) =>
    console.error("Auto-detect claims after upload failed:", err)
  );

  // 6. Return result
  return {
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
  };
}
