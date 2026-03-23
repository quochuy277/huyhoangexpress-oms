import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { requireFinanceAccess } from "@/lib/finance-auth";
import type { Prisma } from "@prisma/client";
import { CashbookGroup } from "@prisma/client";

export const maxDuration = 60;

const GROUP_MAP: Record<string, CashbookGroup> = {
  "COD": CashbookGroup.COD,
  "Đối soát cho shop": CashbookGroup.SHOP_PAYOUT,
  "Phí đối soát": CashbookGroup.RECONCILIATION_FEE,
  "Nạp tiền": CashbookGroup.TOP_UP,
  "Đền bù": CashbookGroup.COMPENSATION,
  "Phí hợp tác": CashbookGroup.COOPERATION_FEE,
};

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireFinanceAccess();
    if (error) return error;

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "Thiếu file" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });

    // Find the right sheet
    let sheet: XLSX.WorkSheet | null = null;
    for (const name of workbook.SheetNames) {
      const s = workbook.Sheets[name];
      const range = XLSX.utils.decode_range(s["!ref"] || "A1");
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = s[XLSX.utils.encode_cell({ r: range.s.r, c })];
        if (cell?.v && String(cell.v).includes("Mã phiếu")) { sheet = s; break; }
      }
      if (sheet) break;
    }

    if (!sheet) {
      sheet = workbook.Sheets[workbook.SheetNames[0]];
    }

    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    const uploadedBy = session.user.name || session.user.id!;
    let dateFrom: Date | null = null;
    let dateTo: Date | null = null;

    // 1. Parse all rows into entries array (in memory)
    const entries: Prisma.CashbookEntryCreateManyInput[] = [];

    for (const row of rows) {
      const timeStr = row["Thời gian tính nợ"] || row["Thời gian"] || "";
      const receiptCode = String(row["Mã phiếu"] || "").trim();
      const groupStr = String(row["Nhóm phiếu"] || row["Nhóm"] || "").trim();
      const content = String(row["Nội dung"] || "").trim();
      const amount = parseFloat(String(row["Số tiền"] || "0").replace(/,/g, "")) || 0;
      const balance = parseFloat(String(row["Tồn"] || row["Số dư"] || "0").replace(/,/g, "")) || 0;

      if (!receiptCode || !timeStr) continue;

      let transactionTime: Date;
      if (typeof timeStr === "number") {
        transactionTime = new Date((timeStr - 25569) * 86400 * 1000);
      } else {
        transactionTime = new Date(timeStr);
      }
      if (isNaN(transactionTime.getTime())) continue;

      if (!dateFrom || transactionTime < dateFrom) dateFrom = transactionTime;
      if (!dateTo || transactionTime > dateTo) dateTo = transactionTime;

      const groupType = GROUP_MAP[groupStr] || CashbookGroup.OTHER;

      let rawCod: number | null = null;
      let shippingFee: number | null = null;
      let shopName: string | null = null;

      if (groupType === "COD") {
        const codMatch = content.match(/COD:\s*([\d,]+)/);
        const feeMatch = content.match(/Phí vận chuyển:\s*([\d,]+)/);
        if (codMatch) rawCod = parseFloat(codMatch[1].replace(/,/g, ""));
        if (feeMatch) shippingFee = parseFloat(feeMatch[1].replace(/,/g, ""));
      }

      if (groupType === "SHOP_PAYOUT" || groupType === "RECONCILIATION_FEE") {
        const parts = content.split(",");
        if (parts.length > 1) shopName = parts.slice(1).join(",").trim();
      }

      entries.push({
        transactionTime,
        receiptCode,
        groupType,
        content,
        amount,
        balance,
        rawCod,
        shippingFee,
        shopName,
        uploadedBy,
      });
    }

    // 2. Bulk insert using createMany (batches of 500)
    const BATCH_SIZE = 500;
    let newRows = 0;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      const result = await prisma.cashbookEntry.createMany({
        data: batch,
        skipDuplicates: true,
      });
      newRows += result.count;
    }

    // 3. Record upload
    await prisma.cashbookUpload.create({
      data: {
        fileName: file.name,
        rowCount: rows.length,
        newRows,
        duplicateRows: entries.length - newRows,
        dateFrom,
        dateTo,
        uploadedBy,
      },
    });

    return NextResponse.json({
      newRows,
      duplicateRows: entries.length - newRows,
      total: rows.length,
      dateFrom,
      dateTo,
    });
  } catch (error) {
    console.error("Cashbook upload error:", error);
    return NextResponse.json({ error: "Lỗi xử lý file" }, { status: 500 });
  }
}
