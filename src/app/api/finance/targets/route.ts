import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAccess } from "@/lib/finance-auth";
import { getFinanceTargets, setFinanceTargets } from "@/lib/finance/targets";

export async function GET(req: NextRequest) {
  const { error } = await requireFinanceAccess();
  if (error) return error;
  const month = new URL(req.url).searchParams.get("month") || new Date().toISOString().slice(0, 7);
  return NextResponse.json(await getFinanceTargets(month));
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireFinanceAccess();
  if (error) return error;
  if (session!.user.role !== "ADMIN") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const { month, netRevenue, netProfit } = await req.json();
  const createdBy = session!.user.email ?? session!.user.id ?? "unknown";
  await setFinanceTargets(month, { netRevenue: netRevenue ?? null, netProfit: netProfit ?? null }, createdBy);
  return NextResponse.json({ success: true });
}
