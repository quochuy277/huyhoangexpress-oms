import * as XLSX from "xlsx";

/**
 * Build an XLSX workbook buffer from column headers and row data.
 *
 * Returns an ArrayBuffer suitable for streaming back as a Response body.
 * Vietnamese diacritics are preserved via the default UTF-8 encoding that
 * SheetJS uses internally for .xlsx files.
 */
export function buildXlsxBuffer(
  headers: readonly string[],
  rows: readonly (readonly unknown[])[],
  sheetName = "Sheet1",
): ArrayBuffer {
  const aoa: unknown[][] = [headers.slice(), ...rows.map((r) => [...r])];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}
