import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/route-permissions";
import { createServerTiming } from "@/lib/server-timing";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const denied = requirePermission(session.user, "canViewDashboard", "Không có quyền xem tổng quan");
    if (denied) return denied;

    const timing = createServerTiming();
    // Fetch all 4 data sources in parallel
    const [uploads, claims, returns, todos] = await timing.measure("db_queries", () => Promise.all([
    prisma.uploadHistory.findMany({
      orderBy: { uploadedAt: 'desc' },
      select: {
        uploadedAt: true,
        totalRows: true,
        newOrders: true,
        updatedOrders: true,
        carrierName: true,
        uploadedBy: { select: { name: true } }
      },
      take: 5
    }),
    prisma.claimOrder.findMany({
      orderBy: { createdAt: 'desc' },
      select: { 
        createdAt: true, 
        order: { select: { requestCode: true } }, 
        createdBy: { select: { name: true } } 
      },
      take: 5
    }),
    prisma.returnTracking.findMany({
      where: { returnStatus: 'RETURNED_TO_CUSTOMER' },
      orderBy: { updatedAt: 'desc' },
      select: {
        updatedAt: true,
        returnedByStaff: true,
        order: { select: { requestCode: true } }
      },
      take: 5
    }),
    prisma.todoItem.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        title: true,
        assignee: { select: { name: true } }
      },
      take: 5
    }),
  ]));

  // Định dạng mảng
  const activities = [];
  
  for (const u of uploads) {
    activities.push({
      type: "UPLOAD",
      user: u.uploadedBy?.name || "Hệ thống",
      description: `đã upload file Excel ${u.carrierName ? `(${u.carrierName})` : ''}`,
      action: `Thêm ${u.newOrders} đơn, cập nhật ${u.updatedOrders} đơn`,
      timestamp: u.uploadedAt.toISOString()
    });
  }

  for (const c of claims) {
    activities.push({
      type: "CLAIM",
      user: c.createdBy?.name || "Hệ thống",
      description: `đã tạo/cập nhật khiếu nại cho đơn ${c.order.requestCode}`,
      timestamp: c.createdAt.toISOString()
    });
  }

  for (const r of returns) {
    activities.push({
      type: "RETURN",
      user: r.returnedByStaff || "Hệ thống",
      description: `đã xác nhận trả hàng thành công đơn ${r.order.requestCode}`,
      timestamp: r.updatedAt.toISOString()
    });
  }

  for (const t of todos) {
    activities.push({
      type: "TODO",
      user: t.assignee?.name || "Hệ thống", 
      description: `đã tạo công việc mới: ${t.title}`,
      timestamp: t.createdAt.toISOString()
    });
  }

  // Sắp xếp giảm dần theo thời gian
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ recentActivities: activities.slice(0, 10) }, {
      headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60", ...timing.headers() },
    });
  } catch (error) {
    logger.error("GET /api/dashboard/activities", "Error", error);
    return NextResponse.json({ error: "Không thể tải hoạt động gần đây" }, { status: 500 });
  }
}
