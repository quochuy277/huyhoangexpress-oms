import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { processDelayedOrder, ProcessedDelayedOrder } from '@/lib/delay-analyzer';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { deliveryStatus: { in: ['DELIVERY_DELAYED', 'RETURN_CONFIRMED'] } },
          {
            AND: [
              { deliveryStatus: 'DELIVERING' },
              { publicNotes: { contains: 'Hoãn giao hàng' } }
            ]
          }
        ]
      },      select: {
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
      }
    });

    const processedOrders: ProcessedDelayedOrder[] = orders.map(order => processDelayedOrder(order));

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

    return NextResponse.json({
      success: true,
      data: {
        orders: processedOrders,
        stats: {
          total: processedOrders.length,
          high,
          medium,
          low,
          totalCOD,
          highCOD
        }
      }
    });

  } catch (error) {
    console.error('Error fetching delayed orders:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch delayed orders' }, { status: 500 });
  }
}
