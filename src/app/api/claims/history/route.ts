import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Helper: map ClaimChangeLog fieldName → action label
function getActionFromField(fieldName: string, newValue: string | null): { action: string; dotColor: string } {
  switch (fieldName) {
    case "claimStatus":
      return { action: "Chuyển trạng thái", dotColor: "yellow" };
    case "issueType":
      return { action: "Cập nhật loại vấn đề", dotColor: "blue" };
    case "issueDescription":
      return { action: "Cập nhật nội dung VĐ", dotColor: "blue" };
    case "processingContent":
      return { action: "Cập nhật nội dung xử lý", dotColor: "yellow" };
    case "carrierCompensation":
      return { action: "Nhập tiền NVC đền bù", dotColor: "green" };
    case "customerCompensation":
      return { action: "Nhập tiền đền bù KH", dotColor: "green" };
    case "deadline":
      return { action: "Cập nhật thời hạn", dotColor: "blue" };
    case "isCompleted":
      return newValue === "true"
        ? { action: "Đánh dấu hoàn tất", dotColor: "green" }
        : { action: "Hủy hoàn tất", dotColor: "red" };
    default:
      return { action: "Cập nhật", dotColor: "yellow" };
  }
}

// GET — Claims activity history (all actions across all claims)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "20")));
  const take = Math.min(500, Math.max(1, parseInt(url.searchParams.get("take") || "50")));
  const actionFilter = url.searchParams.get("action") || "";
  const staffFilter = url.searchParams.get("staff") || "";
  const search = url.searchParams.get("search") || "";
  const dateFrom = url.searchParams.get("dateFrom") || "";
  const dateTo = url.searchParams.get("dateTo") || "";

  // Build date filters for DB-level filtering
  const dateFilter: { changedAt?: { gte?: Date; lte?: Date } } = {};
  if (dateFrom) {
    dateFilter.changedAt = { ...dateFilter.changedAt, gte: new Date(dateFrom) };
  }
  if (dateTo) {
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    dateFilter.changedAt = { ...dateFilter.changedAt, lte: toDate };
  }

  try {
    // Fetch status history entries with DB-level date filtering and limits
    const [statusHistories, changeLogs, statusCount, changeLogCount] = await Promise.all([
      prisma.claimStatusHistory.findMany({
        where: dateFilter.changedAt ? { changedAt: dateFilter.changedAt } : undefined,
        include: {
          claimOrder: {
            include: {
              order: { select: { requestCode: true } },
            },
          },
        },
        orderBy: { changedAt: "desc" },
        take: take * page, // Fetch enough for current page depth
      }),
      prisma.claimChangeLog.findMany({
        where: {
          fieldName: { not: "claimStatus" },
          ...(dateFilter.changedAt ? { changedAt: dateFilter.changedAt } : {}),
        },
        include: {
          claimOrder: {
            include: {
              order: { select: { requestCode: true } },
            },
          },
        },
        orderBy: { changedAt: "desc" },
        take: take * page, // Fetch enough for current page depth
      }),
      prisma.claimStatusHistory.count({
        where: dateFilter.changedAt ? { changedAt: dateFilter.changedAt } : undefined,
      }),
      prisma.claimChangeLog.count({
        where: {
          fieldName: { not: "claimStatus" },
          ...(dateFilter.changedAt ? { changedAt: dateFilter.changedAt } : {}),
        },
      }),
    ]);

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

    // Add status history entries
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

    // Add change log entries
    for (const cl of changeLogs) {
      const requestCode = cl.claimOrder?.order?.requestCode || "—";
      const { action, dotColor } = getActionFromField(cl.fieldName, cl.newValue);
      activities.push({
        id: cl.id,
        claimId: cl.claimOrder?.id || "",
        timestamp: cl.changedAt,
        staff: cl.changedBy,
        requestCode,
        action,
        detail: `${cl.oldValue || "—"} → ${cl.newValue || "—"}`,
        dotColor,
        actionType: action,
      });
    }

    // Sort by timestamp descending
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply filters
    let filtered = activities;

    // Search filter (requestCode or staff)
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (a) => a.requestCode.toLowerCase().includes(q) || a.staff.toLowerCase().includes(q)
      );
    }

    // Staff filter
    if (staffFilter) {
      filtered = filtered.filter((a) => a.staff === staffFilter);
    }

    // Date range filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter((a) => a.timestamp >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter((a) => a.timestamp <= to);
    }

    // Action type filter
    if (actionFilter) {
      const actionMap: Record<string, string[]> = {
        new: ["Thêm đơn có vấn đề", "Tự động phát hiện"],
        status: ["Chuyển trạng thái"],
        update: ["Cập nhật nội dung xử lý", "Cập nhật loại vấn đề", "Cập nhật nội dung VĐ", "Cập nhật thời hạn", "Cập nhật"],
        compensation: ["Nhập tiền NVC đền bù", "Nhập tiền đền bù KH"],
        complete: ["Đánh dấu hoàn tất", "Hủy hoàn tất"],
        auto: ["Tự động phát hiện"],
      };
      const allowedActions = actionMap[actionFilter] || [];
      if (allowedActions.length > 0) {
        filtered = filtered.filter((a) => allowedActions.includes(a.actionType));
      }
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

    // Get unique staff names
    const staffSet = new Set<string>();
    activities.forEach((a) => { if (a.staff) staffSet.add(a.staff); });
    const staffNames = Array.from(staffSet).sort().map((name) => ({ name }));

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
