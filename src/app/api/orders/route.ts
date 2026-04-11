import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ordersQuerySchema, parseSearchParams } from "@/lib/validations";
import { requirePermission } from "@/lib/route-permissions";
import { getOrdersList } from "@/lib/orders-list";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const denied = requirePermission(session.user, "canViewOrders", "Bạn không có quyền xem đơn hàng");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const parsed = ordersQuerySchema.safeParse(parseSearchParams(searchParams));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Tham số không hợp lệ", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    page, pageSize, search, status: statusFilter,
    fromDate, toDate, dateField,
    hasNotes, shopName: shopNameFilter,
    salesStaff: salesStaffFilter, partialOrderType, regionGroup,
    valueField, valueCondition, valueAmount,
    sortBy, sortOrder,
  } = parsed.data;

  const result = await getOrdersList({
    page,
    pageSize,
    search,
    status: statusFilter,
    fromDate,
    toDate,
    dateField,
    hasNotes,
    shopName: shopNameFilter,
    salesStaff: salesStaffFilter,
    partialOrderType,
    regionGroup,
    valueField,
    valueCondition,
    valueAmount,
    sortBy,
    sortOrder,
  });

  return NextResponse.json(result);
}
