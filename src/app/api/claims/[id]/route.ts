import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireClaimsPermission } from "@/lib/claims-permissions";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    const denied = requireClaimsPermission(session.user, "canViewClaims");
    if (denied) {
      return denied;
    }

    const { id } = await params;

    const claim = await prisma.claimOrder.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            requestCode: true,
            carrierOrderCode: true,
            carrierName: true,
            shopName: true,
            status: true,
            deliveryStatus: true,
            codAmount: true,
            totalFee: true,
            pickupTime: true,
            regionGroup: true,
            internalNotes: true,
            staffNotes: true,
            receiverPhone: true,
            receiverName: true,
            receiverAddress: true,
          },
        },
        createdBy: { select: { name: true } },
        statusHistory: {
          orderBy: { changedAt: "desc" },
          take: 50,
        },
        changeLogs: {
          orderBy: { changedAt: "desc" },
          take: 50,
        },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    }

    return NextResponse.json(claim);
  } catch (error) {
    console.error("GET /api/claims/[id] error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    const denied = requireClaimsPermission(session.user, "canUpdateClaim");
    if (denied) {
      return denied;
    }

    const { id } = await params;
    const body = await req.json();
    const {
      claimStatus,
      processingContent,
      carrierCompensation,
      customerCompensation,
      deadline,
      isCompleted,
      issueDescription,
      issueType,
      statusNote,
    } = body;

    // Get current claim for change tracking
    const current = await prisma.claimOrder.findUnique({
      where: { id },
      select: {
        claimStatus: true,
        issueType: true,
        issueDescription: true,
        processingContent: true,
        carrierCompensation: true,
        customerCompensation: true,
        deadline: true,
      },
    });
    if (!current) {
      return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    }

    const changedBy = session.user.name || "Unknown";

    // Build update data and collect change logs
    const data: any = { updatedAt: new Date() };
    const changeLogs: { fieldName: string; oldValue: string | null; newValue: string | null; changedBy: string }[] = [];

    if (claimStatus !== undefined && claimStatus !== current.claimStatus) {
      data.claimStatus = claimStatus;
      changeLogs.push({
        fieldName: "claimStatus",
        oldValue: current.claimStatus,
        newValue: claimStatus,
        changedBy,
      });
    }

    if (issueType !== undefined && issueType !== current.issueType) {
      data.issueType = issueType;
      changeLogs.push({
        fieldName: "issueType",
        oldValue: current.issueType,
        newValue: issueType,
        changedBy,
      });
    }

    if (issueDescription !== undefined && issueDescription !== current.issueDescription) {
      data.issueDescription = issueDescription;
      changeLogs.push({
        fieldName: "issueDescription",
        oldValue: current.issueDescription || null,
        newValue: issueDescription,
        changedBy,
      });
    }

    if (processingContent !== undefined && processingContent !== current.processingContent) {
      data.processingContent = processingContent;
      changeLogs.push({
        fieldName: "processingContent",
        oldValue: current.processingContent || null,
        newValue: processingContent,
        changedBy,
      });
    }

    if (carrierCompensation !== undefined && carrierCompensation !== current.carrierCompensation) {
      data.carrierCompensation = carrierCompensation;
      changeLogs.push({
        fieldName: "carrierCompensation",
        oldValue: String(current.carrierCompensation),
        newValue: String(carrierCompensation),
        changedBy,
      });
    }

    if (customerCompensation !== undefined && customerCompensation !== current.customerCompensation) {
      data.customerCompensation = customerCompensation;
      changeLogs.push({
        fieldName: "customerCompensation",
        oldValue: String(current.customerCompensation),
        newValue: String(customerCompensation),
        changedBy,
      });
    }

    if (deadline !== undefined) {
      const newDeadline = deadline ? new Date(deadline) : null;
      const oldDeadlineStr = current.deadline ? current.deadline.toISOString().split("T")[0] : null;
      const newDeadlineStr = newDeadline ? newDeadline.toISOString().split("T")[0] : null;
      if (oldDeadlineStr !== newDeadlineStr) {
        data.deadline = newDeadline;
        changeLogs.push({
          fieldName: "deadline",
          oldValue: oldDeadlineStr,
          newValue: newDeadlineStr,
          changedBy,
        });
      }
    }

    if (isCompleted === true) {
      data.isCompleted = true;
      data.completedAt = new Date();
      data.completedBy = session.user.name;
    } else if (isCompleted === false) {
      data.isCompleted = false;
      data.completedAt = null;
      data.completedBy = null;
    }

    // Create status history entry if status changed
    const statusChanged = claimStatus && claimStatus !== current.claimStatus;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.claimOrder.update({
        where: { id },
        data: {
          ...data,
          ...(statusChanged
            ? {
                statusHistory: {
                  create: {
                    fromStatus: current.claimStatus,
                    toStatus: claimStatus,
                    changedBy,
                    note: statusNote || null,
                  },
                },
              }
            : {}),
        },
        include: {
          order: {
            select: {
              requestCode: true,
              carrierOrderCode: true,
              carrierName: true,
              shopName: true,
              status: true,
              deliveryStatus: true,
              codAmount: true,
              totalFee: true,
              pickupTime: true,
              regionGroup: true,
              internalNotes: true,
              staffNotes: true,
              receiverPhone: true,
              receiverName: true,
              receiverAddress: true,
            },
          },
          createdBy: { select: { name: true } },
          statusHistory: { orderBy: { changedAt: "desc" }, take: 50 },
          changeLogs: { orderBy: { changedAt: "desc" }, take: 50 },
        },
      });

      // Create change log entries
      if (changeLogs.length > 0) {
        await tx.claimChangeLog.createMany({
          data: changeLogs.map(log => ({
            claimOrderId: id,
            ...log,
          })),
        });
      }

      return result;
    });

    return NextResponse.json({ success: true, claim: updated });
  } catch (error) {
    console.error("PATCH /api/claims/[id] error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    const denied = requireClaimsPermission(session.user, "canDeleteClaim");
    if (denied) {
      return denied;
    }

    const { id } = await params;

    const claim = await prisma.claimOrder.findUnique({
      where: { id },
      select: { orderId: true },
    });
    if (!claim) {
      return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    }

    // ClaimStatusHistory and ClaimChangeLog have onDelete: Cascade,
    // so deleting the claimOrder will auto-delete children
    await prisma.$transaction([
      prisma.claimOrder.delete({ where: { id } }),
      prisma.order.update({
        where: { id: claim.orderId },
        data: { claimLocked: false },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/claims/[id] error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
