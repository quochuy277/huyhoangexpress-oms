import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { processDelayedOrder, ProcessedDelayedOrder } from '@/lib/delay-analyzer';
import type { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    const search = searchParams.get('search') || '';
    const shopFilter = searchParams.get('shop') || '';
    const carrierFilter = searchParams.get('carrier') || '';
    const riskFilter = searchParams.get('risk') || '';
    const reasonFilter = searchParams.get('reason') || '';
    const delayCountFilter = searchParams.get('delay') || '';
    const statusFilter = searchParams.get('status') || '';

    // Base delayed condition
    const baseCondition: Prisma.OrderWhereInput = {
      claimLocked: false,
      OR: [
        { deliveryStatus: { in: ['DELIVERY_DELAYED', 'RETURN_CONFIRMED'] } },
        {
          AND: [
            { deliveryStatus: 'DELIVERING' },
            { publicNotes: { contains: 'Hoãn giao hàng' } }
          ]
        }
      ]
    };

    // Add server-side SQL filters
    const AND: Prisma.OrderWhereInput[] = [];

    if (search) {
      AND.push({
        OR: [
          { requestCode: { contains: search, mode: 'insensitive' } },
          { shopName: { contains: search, mode: 'insensitive' } },
          { receiverName: { contains: search, mode: 'insensitive' } },
          { receiverPhone: { contains: search } },
          { carrierOrderCode: { contains: search, mode: 'insensitive' } },
          { customerOrderCode: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (shopFilter) AND.push({ shopName: shopFilter });
    if (carrierFilter) AND.push({ carrierName: carrierFilter });
    if (statusFilter) AND.push({ status: statusFilter });

    const where: Prisma.OrderWhereInput = {
      ...baseCondition,
      ...(AND.length > 0 ? { AND } : {}),
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
      }
    });

    // Process all orders (compute risk, delays, reasons)
    let processedOrders: ProcessedDelayedOrder[] = orders.map(order => processDelayedOrder(order));

    // Apply post-processing filters (risk, reason, delayCount)
    if (riskFilter && riskFilter !== 'all') {
      processedOrders = processedOrders.filter(o => o.risk === riskFilter);
    }
    if (reasonFilter) {
      processedOrders = processedOrders.filter(o => o.uniqueReasons.includes(reasonFilter));
    }
    if (delayCountFilter) {
      if (delayCountFilter === '4+') {
        processedOrders = processedOrders.filter(o => o.delayCount >= 4);
      } else {
        processedOrders = processedOrders.filter(o => o.delayCount.toString() === delayCountFilter);
      }
    }

    // Compute stats on ALL filtered orders (before pagination)
    let totalCOD = 0;
    let highCOD = 0;
    let high = 0;
    let medium = 0;
    let low = 0;

    processedOrders.forEach(o => {
      totalCOD += o.codAmount;
      if (o.risk === 'high') {
        high++;
        highCOD += o.codAmount;
      } else if (o.risk === 'medium') {
        medium++;
      } else {
        low++;
      }
    });

    // Paginate
    const total = processedOrders.length;
    const start = (page - 1) * pageSize;
    const paginatedOrders = processedOrders.slice(start, start + pageSize);

    return NextResponse.json({
      success: true,
      data: {
        orders: paginatedOrders,
        stats: {
          total,
          high,
          medium,
          low,
          totalCOD,
          highCOD
        },
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        }
      }
    });

  } catch (error) {
    console.error('Error fetching delayed orders:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch delayed orders' }, { status: 500 });
  }
}

