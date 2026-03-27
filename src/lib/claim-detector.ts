import { prisma } from "@/lib/prisma";
import { AUTO_SCAN_EXCLUDED_ISSUE_TYPES } from "@/lib/claims-config";

const FINAL_STATUSES = ["RECONCILED", "RETURNED_FULL", "RETURNED_PARTIAL"];
const AUTO_SCAN_PENDING_STATUS = "PENDING";
const AUTO_SCAN_CHANGED_BY = "Hệ thống";

type AutoDetectedClaimInput = {
  orderId: string;
  issueType: "SLOW_JOURNEY" | "OTHER";
  issueDescription?: string;
  source: "AUTO_SLOW_JOURNEY" | "AUTO_INTERNAL_NOTE";
  note: string;
};

/**
 * Auto-complete existing claims whose orders have reached a final delivery status.
 * Rule 1: Only non-excluded auto-scan groups are auto-completed by delivery status
 *         (SUSPICIOUS, DAMAGED, LOST, OTHER, FEE_COMPLAINT are excluded — require manual handling).
 * Rule 2: Claims of ANY issueType with claimStatus RESOLVED or CUSTOMER_COMPENSATED
 *         are also auto-completed.
 * Returns count of auto-completed claims.
 */
export async function autoCompleteResolvedClaims(): Promise<number> {
  const byDeliveryStatus = await prisma.claimOrder.findMany({
    where: {
      isCompleted: false,
      issueType: { notIn: AUTO_SCAN_EXCLUDED_ISSUE_TYPES as any[] },
      order: { deliveryStatus: { in: FINAL_STATUSES as any[] } },
    },
    select: { id: true },
  });

  const byClaimStatus = await prisma.claimOrder.findMany({
    where: {
      isCompleted: false,
      claimStatus: { in: ["RESOLVED", "CUSTOMER_COMPENSATED"] as any[] },
    },
    select: { id: true },
  });

  const idSet = new Set([
    ...byDeliveryStatus.map(c => c.id),
    ...byClaimStatus.map(c => c.id),
  ]);

  if (idSet.size === 0) return 0;

  const ids = [...idSet];
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
        changedBy: AUTO_SCAN_CHANGED_BY,
        changedAt: now,
        note: "Tự động hoàn tất",
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
 * Create or reopen ClaimOrder records for auto-detected orders + auto-complete resolved ones.
 */
export async function createAutoDetectedClaims(
  userId: string
): Promise<{ newClaims: number; reopenedClaims: number; autoCompleted: number }> {
  const [slowIds, noteIds, autoCompleted] = await Promise.all([
    detectSlowJourneyOrders(),
    detectInternalNoteIssues(),
    autoCompleteResolvedClaims(),
  ]);

  let created = 0;
  let reopened = 0;
  const now = new Date();
  const deadline = new Date(now.getTime() + 15 * 86400000);

  const allDetectedClaims: AutoDetectedClaimInput[] = [
    ...slowIds.map(id => ({
      orderId: id,
      issueType: "SLOW_JOURNEY" as const,
      source: "AUTO_SLOW_JOURNEY" as const,
      note: "Tự động phát hiện: Hành trình chậm",
    })),
    ...noteIds.map(id => ({
      orderId: id,
      issueType: "OTHER" as const,
      issueDescription: "Phát hiện từ ghi chú nội bộ",
      source: "AUTO_INTERNAL_NOTE" as const,
      note: "Tự động phát hiện: Từ ghi chú nội bộ",
    })),
  ];

  for (const claim of allDetectedClaims) {
    const existingClaim = await prisma.claimOrder.findUnique({
      where: { orderId: claim.orderId },
      select: {
        id: true,
        issueType: true,
        claimStatus: true,
        isCompleted: true,
      },
    });

    if (!existingClaim) {
      await prisma.claimOrder.create({
        data: {
          orderId: claim.orderId,
          issueType: claim.issueType,
          issueDescription: claim.issueDescription,
          detectedDate: now,
          deadline,
          source: claim.source,
          createdById: userId,
          statusHistory: {
            create: {
              toStatus: AUTO_SCAN_PENDING_STATUS as any,
              changedBy: AUTO_SCAN_CHANGED_BY,
              note: claim.note,
            },
          },
        },
      });
      created++;
      continue;
    }

    if (!existingClaim.isCompleted) continue;
    if (existingClaim.issueType === claim.issueType) continue;

    await prisma.claimOrder.update({
      where: { id: existingClaim.id },
      data: {
        issueType: claim.issueType,
        issueDescription: claim.issueDescription ?? null,
        detectedDate: now,
        deadline,
        source: claim.source,
        claimStatus: AUTO_SCAN_PENDING_STATUS as any,
        isCompleted: false,
        completedAt: null,
        completedBy: null,
        statusHistory: {
          create: {
            fromStatus: existingClaim.claimStatus as any,
            toStatus: AUTO_SCAN_PENDING_STATUS as any,
            changedBy: AUTO_SCAN_CHANGED_BY,
            note: `Tự động mở lại do phát hiện loại vấn đề mới: ${existingClaim.issueType} -> ${claim.issueType}`,
          },
        },
      },
    });
    reopened++;
  }

  return { newClaims: created, reopenedClaims: reopened, autoCompleted };
}
