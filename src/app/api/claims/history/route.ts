import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { requireClaimsPermission } from "@/lib/claims-permissions";
import { prisma } from "@/lib/prisma";

function getActionFromField(fieldName: string, newValue: string | null): {
  action: string;
  dotColor: string;
  actionType: string;
} {
  switch (fieldName) {
    case "claimStatus":
      return { action: "Chuyển trạng thái", dotColor: "yellow", actionType: "Chuyển trạng thái" };
    case "issueType":
      return { action: "Cập nhật loại vấn đề", dotColor: "blue", actionType: "Cập nhật loại vấn đề" };
    case "issueDescription":
      return { action: "Cập nhật nội dung VĐ", dotColor: "blue", actionType: "Cập nhật nội dung VĐ" };
    case "processingContent":
      return { action: "Cập nhật nội dung xử lý", dotColor: "yellow", actionType: "Cập nhật nội dung xử lý" };
    case "carrierCompensation":
      return { action: "Nhập tiền NVC đền bù", dotColor: "green", actionType: "Nhập tiền NVC đền bù" };
    case "customerCompensation":
      return { action: "Nhập tiền đền bù KH", dotColor: "green", actionType: "Nhập tiền đền bù KH" };
    case "deadline":
      return { action: "Cập nhật thời hạn", dotColor: "blue", actionType: "Cập nhật thời hạn" };
    case "isCompleted":
      return newValue === "true"
        ? { action: "Đánh dấu hoàn tất", dotColor: "green", actionType: "Đánh dấu hoàn tất" }
        : { action: "Hủy hoàn tất", dotColor: "red", actionType: "Hủy hoàn tất" };
    default:
      return { action: "Cập nhật", dotColor: "yellow", actionType: "Cập nhật" };
  }
}

const ACTION_FILTER_FIELDS: Record<string, string[]> = {
  update: ["issueType", "issueDescription", "processingContent", "deadline"],
  compensation: ["carrierCompensation", "customerCompensation"],
  complete: ["isCompleted"],
};

type ActivityFeedRow = {
  id: string;
  claimId: string;
  timestamp: Date;
  staff: string;
  requestCode: string | null;
  sourceType: "status" | "change";
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  issueType: string | null;
  isNew: boolean;
};

function buildStatusActivityQuery(
  search: string,
  staffFilter: string,
  dateFrom: string,
  dateTo: string,
  actionFilter: string,
) {
  const conditions: Prisma.Sql[] = [];

  if (dateFrom) {
    conditions.push(Prisma.sql`sh."changedAt" >= ${new Date(dateFrom)}`);
  }

  if (dateTo) {
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    conditions.push(Prisma.sql`sh."changedAt" <= ${toDate}`);
  }

  if (staffFilter) {
    conditions.push(Prisma.sql`sh."changedBy" = ${staffFilter}`);
  }

  if (search) {
    const searchLike = `%${search}%`;
    conditions.push(
      Prisma.sql`(sh."changedBy" ILIKE ${searchLike} OR o."requestCode" ILIKE ${searchLike})`,
    );
  }

  if (actionFilter === "new") {
    conditions.push(Prisma.sql`sh."fromStatus" IS NULL`);
  } else if (actionFilter === "status") {
    conditions.push(Prisma.sql`sh."fromStatus" IS NOT NULL`);
  } else if (actionFilter === "auto") {
    conditions.push(
      Prisma.sql`(sh."changedBy" = ${"Hệ thống"} OR COALESCE(sh."note", '') ILIKE ${"%Tự động%"})`,
    );
  }

  const whereClause = conditions.length
    ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty;

  return Prisma.sql`
    SELECT
      sh.id,
      sh."claimOrderId" AS "claimId",
      sh."changedAt" AS timestamp,
      sh."changedBy" AS staff,
      o."requestCode" AS "requestCode",
      'status' AS "sourceType",
      NULL::text AS "fieldName",
      sh."fromStatus"::text AS "oldValue",
      sh."toStatus"::text AS "newValue",
      co."issueType"::text AS "issueType",
      (sh."fromStatus" IS NULL) AS "isNew"
    FROM "ClaimStatusHistory" sh
    INNER JOIN "ClaimOrder" co ON co.id = sh."claimOrderId"
    INNER JOIN "Order" o ON o.id = co."orderId"
    ${whereClause}
  `;
}

function buildChangeActivityQuery(
  search: string,
  staffFilter: string,
  dateFrom: string,
  dateTo: string,
  actionFilter: string,
) {
  const conditions: Prisma.Sql[] = [Prisma.sql`cl."fieldName" <> 'claimStatus'`];

  if (dateFrom) {
    conditions.push(Prisma.sql`cl."changedAt" >= ${new Date(dateFrom)}`);
  }

  if (dateTo) {
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    conditions.push(Prisma.sql`cl."changedAt" <= ${toDate}`);
  }

  if (staffFilter) {
    conditions.push(Prisma.sql`cl."changedBy" = ${staffFilter}`);
  }

  if (search) {
    const searchLike = `%${search}%`;
    conditions.push(
      Prisma.sql`(cl."changedBy" ILIKE ${searchLike} OR o."requestCode" ILIKE ${searchLike})`,
    );
  }

  if (actionFilter && ACTION_FILTER_FIELDS[actionFilter]) {
    conditions.push(Prisma.sql`cl."fieldName" IN (${Prisma.join(ACTION_FILTER_FIELDS[actionFilter])})`);
  }

  const whereClause = conditions.length
    ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty;

  return Prisma.sql`
    SELECT
      cl.id,
      cl."claimOrderId" AS "claimId",
      cl."changedAt" AS timestamp,
      cl."changedBy" AS staff,
      o."requestCode" AS "requestCode",
      'change' AS "sourceType",
      cl."fieldName" AS "fieldName",
      cl."oldValue" AS "oldValue",
      cl."newValue" AS "newValue",
      NULL::text AS "issueType",
      FALSE AS "isNew"
    FROM "ClaimChangeLog" cl
    INNER JOIN "ClaimOrder" co ON co.id = cl."claimOrderId"
    INNER JOIN "Order" o ON o.id = co."orderId"
    ${whereClause}
  `;
}

function mapActivityRow(row: ActivityFeedRow) {
  if (row.sourceType === "status") {
    const isNew = Boolean(row.isNew);
    return {
      id: row.id,
      claimId: row.claimId,
      timestamp: row.timestamp,
      staff: row.staff,
      requestCode: row.requestCode || "—",
      action: isNew ? "Thêm đơn có vấn đề" : "Chuyển trạng thái",
      detail: isNew
        ? `Tạo đơn mới - ${row.issueType || ""}`
        : `${row.oldValue || "—"} → ${row.newValue || "—"}`,
      dotColor: isNew ? "blue" : "yellow",
      actionType: isNew ? "Thêm đơn có vấn đề" : "Chuyển trạng thái",
    };
  }

  const actionMeta = getActionFromField(row.fieldName || "", row.newValue);
  return {
    id: row.id,
    claimId: row.claimId,
    timestamp: row.timestamp,
    staff: row.staff,
    requestCode: row.requestCode || "—",
    action: actionMeta.action,
    detail: `${row.oldValue || "—"} → ${row.newValue || "—"}`,
    dotColor: actionMeta.dotColor,
    actionType: actionMeta.actionType,
  };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const denied = requireClaimsPermission(session.user, "canViewClaims");
  if (denied) {
    return denied;
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10)));
  const actionFilter = url.searchParams.get("action") || "";
  const staffFilter = url.searchParams.get("staff") || "";
  const search = url.searchParams.get("search")?.trim() || "";
  const dateFrom = url.searchParams.get("dateFrom") || "";
  const dateTo = url.searchParams.get("dateTo") || "";

  try {
    const includeStatusHistory = !actionFilter || ["new", "status", "auto"].includes(actionFilter);
    const includeChangeLogs = !actionFilter || ["update", "compensation", "complete"].includes(actionFilter);
    const offset = (page - 1) * pageSize;

    if (!includeStatusHistory && !includeChangeLogs) {
      return NextResponse.json({
        activities: [],
        staffNames: [],
        pagination: { page, pageSize, total: 0, totalPages: 0 },
      });
    }

    const sources: Prisma.Sql[] = [];
    if (includeStatusHistory) {
      sources.push(buildStatusActivityQuery(search, staffFilter, dateFrom, dateTo, actionFilter));
    }
    if (includeChangeLogs) {
      sources.push(buildChangeActivityQuery(search, staffFilter, dateFrom, dateTo, actionFilter));
    }

    const unionFeed = Prisma.join(sources, " UNION ALL ");

    const [countRows, activityRows, staffRows] = await Promise.all([
      prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
        SELECT COUNT(*)::int AS total
        FROM (${unionFeed}) AS activities
      `),
      prisma.$queryRaw<ActivityFeedRow[]>(Prisma.sql`
        SELECT *
        FROM (${unionFeed}) AS activities
        ORDER BY timestamp DESC, id DESC
        OFFSET ${offset}
        LIMIT ${pageSize}
      `),
      prisma.$queryRaw<Array<{ staff: string }>>(Prisma.sql`
        SELECT DISTINCT staff
        FROM (
          SELECT sh."changedBy" AS staff FROM "ClaimStatusHistory" sh
          UNION
          SELECT cl."changedBy" AS staff FROM "ClaimChangeLog" cl
        ) AS staff_feed
        WHERE staff IS NOT NULL AND staff <> ''
        ORDER BY staff ASC
      `),
    ]);

    const total = countRows[0]?.total ?? 0;
    return NextResponse.json({
      activities: activityRows.map(mapActivityRow),
      staffNames: staffRows.map((row) => ({ name: row.staff })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("History error:", error);
    return NextResponse.json({
      error: "Không thể tải lịch sử claims",
      activities: [],
      pagination: { page, pageSize, total: 0, totalPages: 0 },
      staffNames: [],
    }, { status: 500 });
  }
}
