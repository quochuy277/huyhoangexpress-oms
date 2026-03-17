import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

const GROUP_MAP: Record<string, string> = {
  "COD": "COD",
  "Đối soát cho shop": "SHOP_PAYOUT",
  "Phí đối soát": "RECONCILIATION_FEE",
  "Nạp tiền": "TOP_UP",
  "Đền bù": "COMPENSATION",
  "Phí hợp tác": "COOPERATION_FEE",
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

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
      // Check if first row contains expected headers
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = s[XLSX.utils.encode_cell({ r: range.s.r, c })];
        if (cell?.v && String(cell.v).includes("Mã phiếu")) { sheet = s; break; }
      }
      if (sheet) break;
    }

    if (!sheet) {
      // Fallback — use first sheet
      sheet = workbook.Sheets[workbook.SheetNames[0]];
    }

    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    let newRows = 0, duplicateRows = 0;
    let dateFrom: Date | null = null, dateTo: Date | null = null;

    for (const row of rows) {
      // Map column names (flexible)
      const timeStr = row["Thời gian tính nợ"] || row["Thời gian"] || "";
      const receiptCode = String(row["Mã phiếu"] || "").trim();
      const groupStr = String(row["Nhóm phiếu"] || row["Nhóm"] || "").trim();
      const content = String(row["Nội dung"] || "").trim();
      const amount = parseFloat(String(row["Số tiền"] || "0").replace(/,/g, "")) || 0;
      const balance = parseFloat(String(row["Tồn"] || row["Số dư"] || "0").replace(/,/g, "")) || 0;

      if (!receiptCode || !timeStr) continue;

      // Parse date
      let transactionTime: Date;
      if (typeof timeStr === "number") {
        // Excel serial date
        transactionTime = new Date((timeStr - 25569) * 86400 * 1000);
      } else {
        transactionTime = new Date(timeStr);
      }
      if (isNaN(transactionTime.getTime())) continue;

      // Track date range
      if (!dateFrom || transactionTime < dateFrom) dateFrom = transactionTime;
      if (!dateTo || transactionTime > dateTo) dateTo = transactionTime;

      // Map group
      const groupType = (GROUP_MAP[groupStr] || "OTHER") as any;

      // Parse extra fields from content
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

      // Check duplicate
      const existing = await prisma.cashbookEntry.findUnique({ where: { receiptCode } });
      if (existing) { duplicateRows++; continue; }

      await prisma.cashbookEntry.create({
        data: {
          transactionTime,
          receiptCode,
          groupType,
          content,
          amount,
          balance,
          rawCod,
          shippingFee,
          shopName,
          uploadedBy: session.user.name || session.user.id!,
        },
      });
      newRows++;
    }

    // Record upload
    await prisma.cashbookUpload.create({
      data: {
        fileName: file.name,
        rowCount: rows.length,
        newRows,
        duplicateRows,
        dateFrom,
        dateTo,
        uploadedBy: session.user.name || session.user.id!,
      },
    });

    return NextResponse.json({ newRows, duplicateRows, total: rows.length, dateFrom, dateTo });
  } catch (error) {
    console.error("Cashbook upload error:", error);
    return NextResponse.json({ error: "Lỗi xử lý file" }, { status: 500 });
  }
}
