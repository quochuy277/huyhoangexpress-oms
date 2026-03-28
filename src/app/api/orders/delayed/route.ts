import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processDelayedOrder, type ProcessedDelayedOrder } from "@/lib/delay-analyzer";
import {
  applyDelayedFilters,
  buildDelayedFacets,
  buildDelayedSummary,
  paginateDelayedOrders,
  sortDelayedOrders,
} from "@/lib/delayed-data";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Chua dang nhap" }, { status: 401 });
    }

    if (!session.user.permissions?.canViewDelayed) {
      return NextResponse.json({ error: "Khong co quyen xem don hoan" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);
    const search = searchParams.get("search") || "";
    const shopFilter = searchParams.get("shop") || "";
    const carrierFilter = searchParams.get("carrier") || "";
    const riskFilter = searchParams.get("risk") || "";
    const reasonFilter = searchParams.get("reason") || "";
    const delayCountFilter = searchParams.get("delay") || "";
    const statusFilter = searchParams.get("status") || "";
    const sortKey = (searchParams.get("sortKey") || "delayCount") as keyof ProcessedDelayedOrder;
    const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

    const baseCondition: Prisma.OrderWhereInput = {
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
    };

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

    if (shopFilter) {
      andConditions.push({ shopName: shopFilter });
    }

    if (carrierFilter) {
      andConditions.push({ carrierName: carrierFilter });
    }

    if (statusFilter) {
      andConditions.push({ status: statusFilter });
    }

    const where: Prisma.OrderWhereInput = {
      ...baseCondition,
      ...(andConditions.length > 0 ? { AND: andConditions } : {}),
    };

    const orders = await prisma.order.findMany({
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
    });

    let processedOrders: ProcessedDelayedOrder[] = orders.map((order) => processDelayedOrder(order));

    processedOrders = applyDelayedFilters(processedOrders, {
      search,
      shop: shopFilter,
      status: statusFilter,
      delay: delayCountFilter,
      reason: reasonFilter,
      risk: riskFilter || "all",
    });
    processedOrders = sortDelayedOrders(processedOrders, sortKey, sortDir);

    const summary = buildDelayedSummary(processedOrders);
    const facets = buildDelayedFacets(processedOrders);
    const { rows, pagination } = paginateDelayedOrders(processedOrders, page, pageSize);

    return NextResponse.json({
      success: true,
      data: {
        rows,
        summary,
        facets,
        pagination,
      },
    });
  } catch (error) {
    console.error("Error fetching delayed orders:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch delayed orders" },
      { status: 500 },
    );
  }
}
