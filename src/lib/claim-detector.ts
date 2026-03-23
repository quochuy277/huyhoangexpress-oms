import { prisma } from "@/lib/prisma";

const FINAL_STATUSES = ["RECONCILED", "RETURNED_FULL", "RETURNED_PARTIAL"];

/**
 * Auto-complete existing claims whose orders have reached a final delivery status.
 * Returns count of auto-completed claims.
 */
export async function autoCompleteResolvedClaims(): Promise<number> {
  const claimsToComplete = await prisma.claimOrder.findMany({
    where: {
      isCompleted: false,
      order: { deliveryStatus: { in: FINAL_STATUSES as any[] } },
    },
    select: { id: true },
  });

  if (claimsToComplete.length === 0) return 0;

  const ids = claimsToComplete.map(c => c.id);
  const now = new Date();

  await prisma.$transaction([
    prisma.claimOrder.updateMany({
      where: { id: { in: ids } },
      data: {
        claimStatus: "RESOLVED",
        isCompleted: true,
        completedAt: now,
        completedBy: "Hệ thống (tự động)",
      },
    }),
    prisma.claimStatusHistory.createMany({
      data: ids.map(id => ({
        claimOrderId: id,
        toStatus: "RESOLVED" as any,
        changedBy: "Hệ thống",
        changedAt: now,
        note: "Tự động hoàn tất: đơn đã đối soát/trả hàng",
      })),
    }),
  ]);

  return ids.length;
}

/**
 * Auto-detect orders with slow journey times based on region.
 */
export async function detectSlowJourneyOrders(): Promise<string[]> {
  const now = new Date();

  const orders = await prisma.order.findMany({
    where: {
      pickupTime: { not: null },
      deliveryStatus: { notIn: ["DELIVERED", ...FINAL_STATUSES] as any[] },
      claimOrder: null,
      claimLocked: false,
    },
    select: { id: true, pickupTime: true, regionGroup: true },
  });

  const slowOrders: string[] = [];
  for (const order of orders) {
    if (!order.pickupTime) continue;
    const days = Math.floor((now.getTime() - new Date(order.pickupTime).getTime()) / 86400000);
    const region = order.regionGroup || "";
    const maxDays = region.startsWith("0.") || region.startsWith("1.") || region.startsWith("2.")
      ? 4
      : region.startsWith("3.") || region.startsWith("4.")
        ? 10
        : 15;
    if (days > maxDays) slowOrders.push(order.id);
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
      deliveryStatus: { notIn: FINAL_STATUSES as any[] },
      OR: [
        { internalNotes: { contains: "yêu cầu khiếu nại", mode: "insensitive" } },
        { internalNotes: { contains: "yêu cầu đền bù", mode: "insensitive" } },
        { internalNotes: { contains: "tạo ticket", mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  return orders.map(o => o.id);
}

/**
 * Create ClaimOrder records for auto-detected orders + auto-complete resolved ones.
 */
export async function createAutoDetectedClaims(userId: string): Promise<{ newClaims: number; autoCompleted: number }> {
  // Run all detection + auto-complete in parallel
  const [slowIds, noteIds, autoCompleted] = await Promise.all([
    detectSlowJourneyOrders(),
    detectInternalNoteIssues(),
    autoCompleteResolvedClaims(),
  ]);

  let created = 0;
  const now = new Date();
  const deadline = new Date(now.getTime() + 15 * 86400000);

  // Batch create claims — use individual creates with try/catch to skip duplicates
  const allNewClaims = [
    ...slowIds.map(id => ({ orderId: id, issueType: "SLOW_JOURNEY" as const, source: "AUTO_SLOW_JOURNEY" as const, note: "Tự động phát hiện: Hành trình chậm" })),
    ...noteIds.map(id => ({ orderId: id, issueType: "OTHER" as const, issueDescription: "Phát hiện từ ghi chú nội bộ", source: "AUTO_INTERNAL_NOTE" as const, note: "Tự động phát hiện: Từ ghi chú nội bộ" })),
  ];

  for (const claim of allNewClaims) {
    try {
      await prisma.claimOrder.create({
        data: {
          orderId: claim.orderId,
          issueType: claim.issueType,
          issueDescription: "issueDescription" in claim ? claim.issueDescription : undefined,
          detectedDate: now,
          deadline,
          source: claim.source,
          createdById: userId,
          statusHistory: { create: { toStatus: "PENDING", changedBy: "Hệ thống", note: claim.note } },
        },
      });
      created++;
    } catch {
      // Skip duplicates (unique constraint on orderId)
    }
  }

  return { newClaims: created, autoCompleted };
}
