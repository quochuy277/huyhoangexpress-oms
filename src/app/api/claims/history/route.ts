import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — Claims activity history (all actions across all claims)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20");
  const action = url.searchParams.get("action") || "";
  const staff = url.searchParams.get("staff") || "";
  const search = url.searchParams.get("search") || "";
  const dateFrom = url.searchParams.get("dateFrom") || "";
  const dateTo = url.searchParams.get("dateTo") || "";

  // Build combined query from ClaimStatusHistory + ClaimChangeLog
  // We'll use raw SQL for the UNION query to combine different tables
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (search) {
    conditions.push(`(o."requestCode" ILIKE $${paramIndex} OR h."changedBy" ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }
  if (staff) {
    conditions.push(`h."changedBy" = $${paramIndex}`);
    params.push(staff);
    paramIndex++;
  }
  if (dateFrom) {
    conditions.push(`h."changedAt" >= $${paramIndex}::timestamp`);
    params.push(dateFrom);
    paramIndex++;
  }
  if (dateTo) {
    conditions.push(`h."changedAt" <= ($${paramIndex}::timestamp + interval '1 day')`);
    params.push(dateTo);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Action type filter mapping
  let actionFilter = "";
  if (action === "new") actionFilter = `AND h."actionType" IN ('Thêm đơn có vấn đề', 'Tự động phát hiện')`;
  else if (action === "status") actionFilter = `AND h."actionType" = 'Chuyển trạng thái'`;
  else if (action === "update") actionFilter = `AND h."actionType" = 'Cập nhật nội dung xử lý'`;
  else if (action === "compensation") actionFilter = `AND h."actionType" IN ('Nhập tiền NVC đền bù', 'Nhập tiền đền bù KH')`;
  else if (action === "complete") actionFilter = `AND h."actionType" IN ('Đánh dấu hoàn tất', 'Hủy hoàn tất')`;
  else if (action === "auto") actionFilter = `AND h."actionType" = 'Tự động phát hiện'`;

  try {
    // Combined query: status changes + change logs + creation events
    const countQuery = `
      SELECT COUNT(*) as total FROM (
        SELECT sh."id"
        FROM "ClaimStatusHistory" sh
        JOIN "ClaimOrder" co ON co."id" = sh."claimOrderId"
        JOIN "Order" o ON o."id" = co."orderId"
        CROSS JOIN LATERAL (
          SELECT sh."changedBy", sh."changedAt",
          CASE
            WHEN sh."fromStatus" IS NULL THEN 'Thêm đơn có vấn đề'
            ELSE 'Chuyển trạng thái'
          END as "actionType"
        ) h
        ${whereClause} ${actionFilter}

        UNION ALL

        SELECT cl."id"
        FROM "ClaimChangeLog" cl
        JOIN "ClaimOrder" co ON co."id" = cl."claimOrderId"
        JOIN "Order" o ON o."id" = co."orderId"
        CROSS JOIN LATERAL (
          SELECT cl."changedBy", cl."changedAt",
          CASE
            WHEN cl."fieldName" = 'processingContent' THEN 'Cập nhật nội dung xử lý'
            WHEN cl."fieldName" = 'carrierCompensation' THEN 'Nhập tiền NVC đền bù'
            WHEN cl."fieldName" = 'customerCompensation' THEN 'Nhập tiền đền bù KH'
            WHEN cl."fieldName" = 'isCompleted' AND cl."newValue" = 'true' THEN 'Đánh dấu hoàn tất'
            WHEN cl."fieldName" = 'isCompleted' AND cl."newValue" = 'false' THEN 'Hủy hoàn tất'
            ELSE 'Cập nhật'
          END as "actionType"
        ) h
        ${whereClause} ${actionFilter}
      ) combined
    `;

    const dataQuery = `
      SELECT * FROM (
        SELECT sh."id", sh."changedAt" as "timestamp", sh."changedBy" as "staff",
          o."requestCode",
          CASE
            WHEN sh."fromStatus" IS NULL THEN 'Thêm đơn có vấn đề'
            ELSE 'Chuyển trạng thái'
          END as "action",
          CASE
            WHEN sh."fromStatus" IS NULL THEN 'Tạo đơn mới - ' || co."issueType"
            ELSE COALESCE(sh."fromStatus", '') || ' → ' || sh."toStatus"
          END as "detail",
          CASE
            WHEN sh."fromStatus" IS NULL THEN 'blue'
            ELSE 'yellow'
          END as "dotColor"
        FROM "ClaimStatusHistory" sh
        JOIN "ClaimOrder" co ON co."id" = sh."claimOrderId"
        JOIN "Order" o ON o."id" = co."orderId"
        CROSS JOIN LATERAL (
          SELECT sh."changedBy", sh."changedAt",
          CASE
            WHEN sh."fromStatus" IS NULL THEN 'Thêm đơn có vấn đề'
            ELSE 'Chuyển trạng thái'
          END as "actionType"
        ) h
        ${whereClause} ${actionFilter}

        UNION ALL

        SELECT cl."id", cl."changedAt" as "timestamp", cl."changedBy" as "staff",
          o."requestCode",
          CASE
            WHEN cl."fieldName" = 'processingContent' THEN 'Cập nhật nội dung xử lý'
            WHEN cl."fieldName" = 'carrierCompensation' THEN 'Nhập tiền NVC đền bù'
            WHEN cl."fieldName" = 'customerCompensation' THEN 'Nhập tiền đền bù KH'
            WHEN cl."fieldName" = 'isCompleted' AND cl."newValue" = 'true' THEN 'Đánh dấu hoàn tất'
            WHEN cl."fieldName" = 'isCompleted' AND cl."newValue" = 'false' THEN 'Hủy hoàn tất'
            ELSE 'Cập nhật'
          END as "action",
          COALESCE(cl."oldValue", '—') || ' → ' || COALESCE(cl."newValue", '—') as "detail",
          CASE
            WHEN cl."fieldName" IN ('carrierCompensation', 'customerCompensation') THEN 'green'
            WHEN cl."fieldName" = 'isCompleted' AND cl."newValue" = 'true' THEN 'green'
            WHEN cl."fieldName" = 'isCompleted' AND cl."newValue" = 'false' THEN 'red'
            ELSE 'yellow'
          END as "dotColor"
        FROM "ClaimChangeLog" cl
        JOIN "ClaimOrder" co ON co."id" = cl."claimOrderId"
        JOIN "Order" o ON o."id" = co."orderId"
        CROSS JOIN LATERAL (
          SELECT cl."changedBy", cl."changedAt",
          CASE
            WHEN cl."fieldName" = 'processingContent' THEN 'Cập nhật nội dung xử lý'
            WHEN cl."fieldName" = 'carrierCompensation' THEN 'Nhập tiền NVC đền bù'
            WHEN cl."fieldName" = 'customerCompensation' THEN 'Nhập tiền đền bù KH'
            WHEN cl."fieldName" = 'isCompleted' AND cl."newValue" = 'true' THEN 'Đánh dấu hoàn tất'
            WHEN cl."fieldName" = 'isCompleted' AND cl."newValue" = 'false' THEN 'Hủy hoàn tất'
            ELSE 'Cập nhật'
          END as "actionType"
        ) h
        ${whereClause} ${actionFilter}
      ) combined
      ORDER BY "timestamp" DESC
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
    `;

    const [countResult, activities]: [any, any] = await Promise.all([
      prisma.$queryRawUnsafe(countQuery, ...params),
      prisma.$queryRawUnsafe(dataQuery, ...params),
    ]);

    const total = Number(countResult[0]?.total || 0);

    // Get unique staff names for filter dropdown
    const staffNames = await prisma.$queryRaw`
      SELECT DISTINCT "changedBy" as name FROM "ClaimStatusHistory"
      UNION
      SELECT DISTINCT "changedBy" as name FROM "ClaimChangeLog"
      ORDER BY name
    `;

    return NextResponse.json({
      activities,
      staffNames,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (e) {
    console.error("History error:", e);
    return NextResponse.json({ activities: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 }, staffNames: [] });
  }
}
