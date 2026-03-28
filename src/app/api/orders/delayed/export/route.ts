import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processDelayedOrder, type ProcessedDelayedOrder } from "@/lib/delay-analyzer";
import {
  applyDelayedFilters,
  buildDelayedExportRows,
  sortDelayedOrders,
} from "@/lib/delayed-data";
import { exportLimiter } from "@/lib/rate-limiter";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Chua dang nhap" }, { status: 401 });
  }

  if (!session.user.permissions?.canViewDelayed) {
    return NextResponse.json({ error: "Khong co quyen xuat delayed" }, { status: 403 });
  }

  const rateLimited = exportLimiter.check(session.user.id!);
  if (rateLimited) {
    return rateLimited;
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const shopFilter = searchParams.get("shop") || "";
  const carrierFilter = searchParams.get("carrier") || "";
  const riskFilter = searchParams.get("risk") || "";
  const reasonFilter = searchParams.get("reason") || "";
  const delayCountFilter = searchParams.get("delay") || "";
  const statusFilter = searchParams.get("status") || "";
  const sortKey = (searchParams.get("sortKey") || "delayCount") as keyof ProcessedDelayedOrder;
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  const andConditions: Prisma.OrderWhereInput[] = [];

  if (search) {
    andConditions.push({
      OR: [
        { requestCode: { contains: search, mode: "insensitive" } },
        { shopName: { contains: search, mode: "insensitive" } },
        { receiverName: { contains: search, mode: "insensitive" } },
        { receiverPhone: { contains: search } },
        { carrierOrderCode: { contains: search, mode: "insensitive" } },
        { customerOrderCode: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (shopFilter) andConditions.push({ shopName: shopFilter });
  if (carrierFilter) andConditions.push({ carrierName: carrierFilter });
  if (statusFilter) andConditions.push({ status: statusFilter });

  const where: Prisma.OrderWhereInput = {
    claimLocked: false,
    OR: [
      { deliveryStatus: { in: ["DELIVERY_DELAYED", "RETURN_CONFIRMED"] } },
      {
        AND: [
          { deliveryStatus: "DELIVERING" },
          {
            OR: [
              { publicNotes: { contains: "Hoan giao hang", mode: "insensitive" } },
              { publicNotes: { contains: "Hoãn giao hàng" } },
              { publicNotes: { contains: "Delay giao hang", mode: "insensitive" } },
              { publicNotes: { contains: "Delay giao hàng" } },
            ],
          },
        ],
      },
    ],
    ...(andConditions.length > 0 ? { AND: andConditions } : {}),
  };

  const rawOrders = await prisma.order.findMany({
    where,
    select: {
      id: true,
      requestCode: true,
      customerOrderCode: true,
      carrierOrderCode: true,
      shopName: true,
      receiverName: true,
      receiverPhone: true,
      receiverAddress: true,
      receiverWard: true,
      receiverDistrict: true,
      receiverProvince: true,
      status: true,
      deliveryStatus: true,
      codAmount: true,
      createdTime: true,
      pickupTime: true,
      lastUpdated: true,
      publicNotes: true,
      carrierName: true,
      staffNotes: true,
      claimOrder: { select: { issueType: true } },
    },
    take: 10000,
  });

  let processedOrders = rawOrders.map((order) => processDelayedOrder(order));
  processedOrders = applyDelayedFilters(processedOrders, {
    search,
    shop: shopFilter,
    status: statusFilter,
    delay: delayCountFilter,
    reason: reasonFilter,
    risk: riskFilter || "all",
  });
  processedOrders = sortDelayedOrders(processedOrders, sortKey, sortDir);

  const rows = buildDelayedExportRows(processedOrders);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length, 14),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Delayed");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="delayed-${timestamp}.xlsx"`,
    },
  });
}
