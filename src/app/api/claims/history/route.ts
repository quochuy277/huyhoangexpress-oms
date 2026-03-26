import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Helper: map ClaimChangeLog fieldName → action label
function getActionFromField(fieldName: string, newValue: string | null): { action: string; dotColor: string; actionType: string } {
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

// Map action filter → allowed fieldNames for ClaimChangeLog
const ACTION_FILTER_FIELDS: Record<string, string[]> = {
  update: ["issueType", "issueDescription", "processingContent", "deadline"],
  compensation: ["carrierCompensation", "customerCompensation"],
  complete: ["isCompleted"],
};

// GET — Claims activity history with DB-level filtering & pagination
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "20")));
  const actionFilter = url.searchParams.get("action") || "";
  const staffFilter = url.searchParams.get("staff") || "";
  const search = url.searchParams.get("search") || "";
  const dateFrom = url.searchParams.get("dateFrom") || "";
  const dateTo = url.searchParams.get("dateTo") || "";

  try {
    // Build shared date filter
    const dateWhere: Prisma.ClaimStatusHistoryWhereInput = {};
    const clDateWhere: Prisma.ClaimChangeLogWhereInput = {};
    if (dateFrom) {
      const from = new Date(dateFrom);
      dateWhere.changedAt = { ...dateWhere.changedAt as any, gte: from };
      clDateWhere.changedAt = { ...clDateWhere.changedAt as any, gte: from };
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      dateWhere.changedAt = { ...dateWhere.changedAt as any, lte: toDate };
      clDateWhere.changedAt = { ...clDateWhere.changedAt as any, lte: toDate };
    }

    // Build staff filter at DB level
    if (staffFilter) {
      dateWhere.changedBy = staffFilter;
      clDateWhere.changedBy = staffFilter;
    }

    // Build search filter at DB level (search by requestCode or staff name)
    if (search) {
      dateWhere.OR = [
        { changedBy: { contains: search, mode: "insensitive" } },
        { claimOrder: { order: { requestCode: { contains: search, mode: "insensitive" } } } },
      ];
      clDateWhere.OR = [
        { changedBy: { contains: search, mode: "insensitive" } },
        { claimOrder: { order: { requestCode: { contains: search, mode: "insensitive" } } } },
      ];
    }

    // Determine which sources to query based on action filter
    const includeStatusHistory = !actionFilter || ["new", "status", "auto"].includes(actionFilter);
    const includeChangeLogs = !actionFilter || ["update", "compensation", "complete"].includes(actionFilter);

    // Add fieldName filter for change logs based on action type
    if (actionFilter && ACTION_FILTER_FIELDS[actionFilter]) {
      clDateWhere.fieldName = { in: ACTION_FILTER_FIELDS[actionFilter] };
    }

    // For status history: filter by fromStatus for "new" vs "status"
    if (actionFilter === "new") {
      dateWhere.fromStatus = null;
    } else if (actionFilter === "status") {
      dateWhere.fromStatus = { not: null };
    }

    // Build select for claimOrder to avoid over-fetching
    const claimOrderSelect = {
      id: true,
      issueType: true,
      order: { select: { requestCode: true } },
    };

    // Count + fetch in parallel, using skip/take for true DB pagination
    // We need to merge two sources, so we use a strategy:
    // 1. Count both sources
    // 2. Fetch both with generous limit, merge, sort, then paginate in memory
    //    BUT with DB-level filters already applied, the dataset is much smaller

    const MAX_FETCH = pageSize * page; // Only fetch what we need up to current page

    const promises: Promise<any>[] = [];

    if (includeStatusHistory) {
      promises.push(
        prisma.claimStatusHistory.findMany({
          where: dateWhere,
          include: { claimOrder: { select: claimOrderSelect } },
          orderBy: { changedAt: "desc" },
          take: MAX_FETCH,
        }),
        prisma.claimStatusHistory.count({ where: dateWhere }),
      );
    } else {
      promises.push(Promise.resolve([]), Promise.resolve(0));
    }

    if (includeChangeLogs) {
      promises.push(
        prisma.claimChangeLog.findMany({
          where: { fieldName: { not: "claimStatus" }, ...clDateWhere },
          include: { claimOrder: { select: claimOrderSelect } },
          orderBy: { changedAt: "desc" },
          take: MAX_FETCH,
        }),
        prisma.claimChangeLog.count({
          where: { fieldName: { not: "claimStatus" }, ...clDateWhere },
        }),
      );
    } else {
      promises.push(Promise.resolve([]), Promise.resolve(0));
    }

    // Fetch staff names in parallel (only distinct changedBy)
    promises.push(
      prisma.claimStatusHistory.findMany({
        select: { changedBy: true },
        distinct: ["changedBy"],
        orderBy: { changedBy: "asc" },
      }),
    );

    const [statusHistories, statusCount, changeLogs, changeLogCount, staffList] = await Promise.all(promises);

    // Transform into unified activities
    type Activity = {
      id: string;
      claimId: string;
      timestamp: Date;
      staff: string;
      requestCode: string;
      action: string;
      detail: string;
      dotColor: string;
      actionType: string;
    };

    const activities: Activity[] = [];

    for (const sh of statusHistories) {
      const requestCode = sh.claimOrder?.order?.requestCode || "—";
      const isNew = sh.fromStatus === null;
      activities.push({
        id: sh.id,
        claimId: sh.claimOrder?.id || "",
        timestamp: sh.changedAt,
        staff: sh.changedBy,
        requestCode,
        action: isNew ? "Thêm đơn có vấn đề" : "Chuyển trạng thái",
        detail: isNew
          ? `Tạo đơn mới - ${sh.claimOrder?.issueType || ""}`
          : `${sh.fromStatus || ""} → ${sh.toStatus}`,
        dotColor: isNew ? "blue" : "yellow",
        actionType: isNew ? "Thêm đơn có vấn đề" : "Chuyển trạng thái",
      });
    }

    for (const cl of changeLogs) {
      const requestCode = cl.claimOrder?.order?.requestCode || "—";
      const { action, dotColor, actionType } = getActionFromField(cl.fieldName, cl.newValue);
      activities.push({
        id: cl.id,
        claimId: cl.claimOrder?.id || "",
        timestamp: cl.changedAt,
        staff: cl.changedBy,
        requestCode,
        action,
        detail: `${cl.oldValue || "—"} → ${cl.newValue || "—"}`,
        dotColor,
        actionType,
      });
    }

    // Sort merged results by timestamp descending
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Paginate the merged result
    const total = activities.length;
    const totalPages = Math.ceil(total / pageSize);
    const paged = activities.slice((page - 1) * pageSize, page * pageSize);

    // Staff names from distinct query
    const staffNames = (staffList || [])
      .map((s: any) => ({ name: s.changedBy }))
      .filter((s: any) => s.name);

    return NextResponse.json({
      activities: paged,
      staffNames,
      pagination: { page, pageSize, total, totalPages, dbTotal: statusCount + changeLogCount },
    });
  } catch (e) {
    console.error("History error:", e);
    return NextResponse.json({
      activities: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      staffNames: [],
    });
  }
}
