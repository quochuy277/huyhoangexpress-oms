import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — List change requests (user: own, admin: all pending)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const user = session.user as { id: string; role: string };
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;

  const where = user.role === "ADMIN"
    ? { ...(status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" } : {}) }
    : { userId: user.id };

  const requests = await prisma.infoChangeRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { name: true, email: true } } },
  });

  return NextResponse.json(requests);
}

// POST — Submit info change request
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await req.json();
  const { fieldName, fieldLabel, oldValue, newValue } = body;

  if (!fieldName || !fieldLabel || !newValue?.trim()) {
    return NextResponse.json({ error: "Vui lòng điền đầy đủ thông tin" }, { status: 400 });
  }

  const request = await prisma.infoChangeRequest.create({
    data: {
      userId,
      fieldName,
      fieldLabel,
      oldValue: oldValue || null,
      newValue: newValue.trim(),
    },
  });

  return NextResponse.json(request, { status: 201 });
}
