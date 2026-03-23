import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * TEMPORARY endpoint to clear all order-related data.
 * DELETE THIS FILE after use!
 * 
 * Call: POST /api/admin/reset-orders with body { confirm: "XOA-TAT-CA-DON-HANG" }
 */
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Chỉ admin mới có quyền" }, { status: 403 });
        }

        const body = await req.json();
        if (body.confirm !== "XOA-TAT-CA-DON-HANG") {
            return NextResponse.json({
                error: "Vui lòng gửi { confirm: 'XOA-TAT-CA-DON-HANG' } để xác nhận"
            }, { status: 400 });
        }

        // Delete in correct order (child tables first, respecting foreign keys)
        // 1. ClaimStatusHistory & ClaimChangeLog (cascade from ClaimOrder, but explicit is safer)
        const delClaimHistory = await prisma.claimStatusHistory.deleteMany({});
        const delClaimLog = await prisma.claimChangeLog.deleteMany({});

        // 2. ClaimOrder
        const delClaims = await prisma.claimOrder.deleteMany({});

        // 3. ReturnTracking
        const delReturns = await prisma.returnTracking.deleteMany({});

        // 4. OrderChangeLog
        const delOrderLogs = await prisma.orderChangeLog.deleteMany({});

        // 5. Nullify linkedOrderId in TodoItem (optional FK)
        await prisma.todoItem.updateMany({
            where: { linkedOrderId: { not: null } },
            data: { linkedOrderId: null },
        });

        // 6. UploadHistory
        const delUploads = await prisma.uploadHistory.deleteMany({});

        // 7. Orders (main table — last)
        const delOrders = await prisma.order.deleteMany({});

        return NextResponse.json({
            success: true,
            deleted: {
                claimStatusHistory: delClaimHistory.count,
                claimChangeLog: delClaimLog.count,
                claimOrders: delClaims.count,
                returnTracking: delReturns.count,
                orderChangeLogs: delOrderLogs.count,
                uploadHistory: delUploads.count,
                orders: delOrders.count,
            },
            message: "Đã xóa toàn bộ dữ liệu đơn hàng. HÃY XÓA FILE NÀY SAU KHI DÙNG XONG!",
        });
    } catch (error: any) {
        console.error("RESET-ORDERS ERROR:", error);
        return NextResponse.json({ error: error.message || "Lỗi hệ thống" }, { status: 500 });
    }
}
