import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFinanceAccess } from "@/lib/finance-auth";

export async function GET() {
  try {
    const { error } = await requireFinanceAccess();
    if (error) return error;

    const uploads = await prisma.cashbookUpload.findMany({
      orderBy: { uploadedAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ uploads });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
