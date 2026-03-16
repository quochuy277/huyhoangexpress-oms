import { prisma } from "@/lib/prisma";

/**
 * Auto-detect orders with slow journey times based on region.
 * Region-based thresholds:
 *   0.x, 1.x, 2.x (Nội Tỉnh) → 4 days
 *   3.x, 4.x (Nội Miền) → 10 days
 *   5.x, 6.x (Liên Miền) → 15 days
 */
export async function detectSlowJourneyOrders(): Promise<string[]> {
  const now = new Date();

  const orders = await prisma.order.findMany({
    where: {
      pickupTime: { not: null },
      deliveryStatus: {
        notIn: ["DELIVERED", "RECONCILED", "RETURNED_FULL", "RETURNED_PARTIAL"],
      },
      claimOrder: null,
      claimLocked: false,
    },
    select: {
      id: true,
      requestCode: true,
      pickupTime: true,
      regionGroup: true,
    },
  });

  const slowOrders: string[] = [];

  for (const order of orders) {
    if (!order.pickupTime) continue;

    const daysSincePickup = Math.floor(
      (now.getTime() - new Date(order.pickupTime).getTime()) / 86400000
    );

    const region = order.regionGroup || "";
    let maxDays: number;

    if (
      region.startsWith("0.") ||
      region.startsWith("1.") ||
      region.startsWith("2.")
    ) {
      maxDays = 4;
    } else if (region.startsWith("3.") || region.startsWith("4.")) {
      maxDays = 10;
    } else if (region.startsWith("5.") || region.startsWith("6.")) {
      maxDays = 15;
    } else {
      maxDays = 15;
    }

    if (daysSincePickup > maxDays) {
      slowOrders.push(order.id);
    }
  }

  return slowOrders;
}

/**
 * Auto-detect orders with claim-related keywords in internalNotes.
 */
export async function detectInternalNoteIssues(): Promise<string[]> {
  const orders = await prisma.order.findMany({
    where: {
      claimOrder: null,
      claimLocked: false,
      deliveryStatus: {
        notIn: ["RECONCILED", "RETURNED_FULL", "RETURNED_PARTIAL"],
      },
      OR: [
        { internalNotes: { contains: "yêu cầu khiếu nại", mode: "insensitive" } },
        { internalNotes: { contains: "yêu cầu đền bù", mode: "insensitive" } },
        { internalNotes: { contains: "tạo ticket", mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });

  return orders.map((o) => o.id);
}

/**
 * Create ClaimOrder records for auto-detected orders.
 * Returns count of newly created claims.
 */
export async function createAutoDetectedClaims(
  userId: string
): Promise<number> {
  const [slowIds, noteIds] = await Promise.all([
    detectSlowJourneyOrders(),
    detectInternalNoteIssues(),
  ]);

  let created = 0;
  const now = new Date();
  const deadline = new Date(now.getTime() + 15 * 86400000);

  // Create claims for slow journey orders
  for (const orderId of slowIds) {
    try {
      await prisma.claimOrder.create({
        data: {
          orderId,
          issueType: "SLOW_JOURNEY",
          detectedDate: now,
          deadline,
          source: "AUTO_SLOW_JOURNEY",
          createdById: userId,
          statusHistory: {
            create: {
              toStatus: "PENDING",
              changedBy: "Hệ thống",
              note: "Tự động phát hiện: Hành trình chậm",
            },
          },
        },
      });
      created++;
    } catch {
      // Skip if already exists (unique constraint on orderId)
    }
  }

  // Create claims for internal note issues
  for (const orderId of noteIds) {
    try {
      await prisma.claimOrder.create({
        data: {
          orderId,
          issueType: "OTHER",
          issueDescription: "Phát hiện từ ghi chú nội bộ",
          detectedDate: now,
          deadline,
          source: "AUTO_INTERNAL_NOTE",
          createdById: userId,
          statusHistory: {
            create: {
              toStatus: "PENDING",
              changedBy: "Hệ thống",
              note: "Tự động phát hiện: Từ ghi chú nội bộ",
            },
          },
        },
      });
      created++;
    } catch {
      // Skip duplicates
    }
  }

  return created;
}
