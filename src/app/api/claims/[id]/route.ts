import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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

    const { id } = await params;

    const claim = await prisma.claimOrder.findUnique({
      where: { id },
      include: {
        order: true,
        createdBy: { select: { name: true } },
        statusHistory: {
          orderBy: { changedAt: "desc" },
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
      statusNote,
    } = body;

    // Get current claim for status history
    const current = await prisma.claimOrder.findUnique({
      where: { id },
      select: { claimStatus: true },
    });
    if (!current) {
      return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    }

    // Build update data
    const data: any = { updatedAt: new Date() };

    if (claimStatus !== undefined && claimStatus !== current.claimStatus) {
      data.claimStatus = claimStatus;
    }
    if (processingContent !== undefined) data.processingContent = processingContent;
    if (carrierCompensation !== undefined) data.carrierCompensation = carrierCompensation;
    if (customerCompensation !== undefined) data.customerCompensation = customerCompensation;
    if (deadline !== undefined) data.deadline = deadline ? new Date(deadline) : null;
    if (issueDescription !== undefined) data.issueDescription = issueDescription;

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

    const updated = await prisma.claimOrder.update({
      where: { id },
      data: {
        ...data,
        ...(statusChanged
          ? {
              statusHistory: {
                create: {
                  fromStatus: current.claimStatus,
                  toStatus: claimStatus,
                  changedBy: session.user.name || "Unknown",
                  note: statusNote || null,
                },
              },
            }
          : {}),
      },
      include: {
        order: { select: { requestCode: true } },
      },
    });

    return NextResponse.json({ success: true, claim: updated });
  } catch (error) {
    console.error("PATCH /api/claims/[id] error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
