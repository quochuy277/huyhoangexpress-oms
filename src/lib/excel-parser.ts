import * as XLSX from "xlsx";
import { mapStatusToEnum } from "@/lib/status-mapper";
import { parseVietnameseDate } from "@/lib/utils";
import type { DeliveryStatus } from "@prisma/client";

// ============================================================
// Types
// ============================================================

export interface ParsedOrder {
  reconciliationCode: string | null;
  reconciliationDate: Date | null;
  shopName: string | null;
  customerOrderCode: string | null;
  requestCode: string;
  status: string;
  deliveryStatus: DeliveryStatus;
  createdTime: Date | null;
  pickupTime: Date | null;
  codAmount: number;
  codOriginal: number;
  declaredValue: number;
  shippingFee: number;
  surcharge: number;
  overweightFee: number;
  insuranceFee: number;
  codServiceFee: number;
  returnFee: number;
  totalFee: number;
  carrierFee: number;
  ghsvInsuranceFee: number;
  revenue: number;
  creatorShopName: string | null;
  creatorPhone: string | null;
  creatorStaff: string | null;
  creatorAddress: string | null;
  creatorWard: string | null;
  creatorDistrict: string | null;
  creatorProvince: string | null;
  senderShopName: string | null;
  senderPhone: string | null;
  senderAddress: string | null;
  senderWard: string | null;
  senderDistrict: string | null;
  senderProvince: string | null;
  receiverName: string | null;
  receiverPhone: string | null;
  receiverAddress: string | null;
  receiverWard: string | null;
  receiverDistrict: string | null;
  receiverProvince: string | null;
  deliveryNotes: string | null;
  productDescription: string | null;
  paymentConfirmDate: Date | null;
  internalNotes: string | null;
  publicNotes: string | null;
  lastUpdated: Date | null;
  carrierName: string | null;
  carrierAccount: string | null;
  carrierOrderCode: string | null;
  regionGroup: string | null;
  customerWeight: number | null;
  carrierWeight: number | null;
  deliveredDate: Date | null;
  pickupShipper: string | null;
  deliveryShipper: string | null;
  orderSource: string | null;
  partialOrderType: string | null;
  partialOrderCode: string | null;
  salesStaff: string | null;
}

export interface ParseError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export interface ParseResult {
  orders: ParsedOrder[];
  errors: ParseError[];
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    skippedRows: number;
  };
}

// ============================================================
// Header-to-field mapping (matched by header text, case-insensitive)
// ============================================================

const COLUMN_MAPPING: Record<string, string> = {
  "stt": "_skip",
  "mã đối soát": "reconciliationCode",
  "ngày đối soát": "reconciliationDate",
  "tên cửa hàng": "shopName",
  "mã đơn khách hàng": "customerOrderCode",
  "mã yêu cầu": "requestCode",
  "trạng thái": "status",
  "thời gian tạo": "createdTime",
  "thời gian lấy hàng": "pickupTime",
  "thu hộ": "codAmount",
  "thu hộ ban đầu": "codOriginal",
  "trị giá": "declaredValue",
  "phí vận chuyển": "shippingFee",
  "phụ phí": "surcharge",
  "phí vượt khối lượng": "overweightFee",
  "phí bảo hiểm": "insuranceFee",
  "phí thu hộ tiền hàng": "codServiceFee",
  "phí hoàn hàng": "returnFee",
  "tổng phí": "totalFee",
  "phí đối tác thu": "carrierFee",
  "phí bảo hiểm ghsv": "ghsvInsuranceFee",
  "tên cửa hàng tạo": "creatorShopName",
  "sđt người tạo": "creatorPhone",
  "nhân viên tạo": "creatorStaff",
  "địa chỉ người tạo": "creatorAddress",
  "phường / xã tạo": "creatorWard",
  "quận / huyện tạo": "creatorDistrict",
  "tỉnh / thành phố tạo": "creatorProvince",
  "tên cửa hàng gửi hàng": "senderShopName",
  "sđt người gửi hàng": "senderPhone",
  "địa chỉ người gửi hàng": "senderAddress",
  "phường / xã gửi hàng": "senderWard",
  "quận / huyện gửi hàng": "senderDistrict",
  "tỉnh / thành phố gửi hàng": "senderProvince",
  "người nhận": "receiverName",
  "số điện thoại": "receiverPhone",
  "địa chỉ": "receiverAddress",
  "phường / xã": "receiverWard",
  "quận / huyện": "receiverDistrict",
  "tỉnh / thành phố": "receiverProvince",
  "ghi chú giao hàng": "deliveryNotes",
  "sản phẩm": "productDescription",
  "ngày xác nhận thu tiền": "paymentConfirmDate",
  "ghi chú nội bộ": "internalNotes",
  "ghi chú công khai": "publicNotes",
  "cập nhật lần cuối": "lastUpdated",
  "đơn vị vận chuyển": "carrierName",
  "tài khoản đối tác": "carrierAccount",
  "mã đơn đối tác": "carrierOrderCode",
  "nhóm vùng miền": "regionGroup",
  "khối lượng khách hàng": "customerWeight",
  "khối lượng nvc": "carrierWeight",
  "ngày giao thành công": "deliveredDate",
  "shipper lấy hàng (nb)": "pickupShipper",
  "shipper giao (nb)": "deliveryShipper",
  "nguồn lên đơn": "orderSource",
  "đơn hàng một phần": "partialOrderType",
  "mã đơn hàng một phần": "partialOrderCode",
  "nhân viên kinh doanh": "salesStaff",
};

// Date fields that need Vietnamese date parsing
const DATE_FIELDS = new Set([
  "reconciliationDate", "createdTime", "pickupTime",
  "paymentConfirmDate", "lastUpdated", "deliveredDate",
]);

// Numeric fields (return 0 if empty)
const NUM_FIELDS = new Set([
  "codAmount", "codOriginal", "declaredValue", "shippingFee",
  "surcharge", "overweightFee", "insuranceFee", "codServiceFee",
  "returnFee", "totalFee", "carrierFee", "ghsvInsuranceFee",
]);

// Nullable numeric fields (return null if empty)
const NUM_NULLABLE_FIELDS = new Set(["customerWeight", "carrierWeight"]);

// ============================================================
// Helpers
// ============================================================

function str(val: unknown): string | null {
  if (val === undefined || val === null || val === "") return null;
  return String(val).trim();
}

function num(val: unknown): number {
  if (val === undefined || val === null || val === "") return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function numOrNull(val: unknown): number | null {
  if (val === undefined || val === null || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function parseDate(val: unknown): Date | null {
  if (val === undefined || val === null || val === "") return null;
  if (val instanceof Date) return val;

  // SheetJS numeric date (Excel serial number)
  if (typeof val === "number") {
    try {
      const d = XLSX.SSF.parse_date_code(val);
      return new Date(d.y, d.m - 1, d.d, d.H || 0, d.M || 0, d.S || 0);
    } catch {
      return null;
    }
  }

  // Vietnamese format DD/MM/YYYY HH:mm:ss
  if (typeof val === "string") {
    return parseVietnameseDate(val);
  }

  return null;
}

/**
 * Build a mapping from Excel header names → DB field names.
 * Matches case-insensitively with trimming.
 */
function buildHeaderMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const header of headers) {
    const normalized = header.trim().toLowerCase();
    if (COLUMN_MAPPING[normalized]) {
      map[header] = COLUMN_MAPPING[normalized];
    }
  }
  return map;
}

// ============================================================
// Main Parser — Header-based mapping
// ============================================================

export function parseExcelBuffer(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      orders: [],
      errors: [{ row: 0, field: "file", value: "", message: "File Excel không có sheet nào" }],
      summary: { totalRows: 0, validRows: 0, errorRows: 0, skippedRows: 0 },
    };
  }

  const sheet = workbook.Sheets[sheetName];

  // Read as array of objects — SheetJS uses row 1 as keys
  const rawData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    blankrows: false,
  });

  if (rawData.length === 0) {
    return {
      orders: [],
      errors: [{ row: 0, field: "file", value: "", message: "File Excel không có dữ liệu" }],
      summary: { totalRows: 0, validRows: 0, errorRows: 0, skippedRows: 0 },
    };
  }

  // Build header map from keys of first row
  const excelHeaders = Object.keys(rawData[0]);
  const headerMap = buildHeaderMap(excelHeaders);

  if (!Object.values(headerMap).includes("requestCode")) {
    return {
      orders: [],
      errors: [{ row: 0, field: "header", value: "", message: "Không tìm thấy cột 'Mã Yêu Cầu' trong file Excel" }],
      summary: { totalRows: rawData.length, validRows: 0, errorRows: 1, skippedRows: 0 },
    };
  }

  const orders: ParsedOrder[] = [];
  const errors: ParseError[] = [];
  let skippedRows = 0;

  for (let i = 0; i < rawData.length; i++) {
    const rawRow = rawData[i];
    const rowNum = i + 2; // +2: row 1=header, data starts at row 2

    // Map Excel headers → field values
    const mapped: Record<string, unknown> = {};
    for (const [excelHeader, fieldName] of Object.entries(headerMap)) {
      if (fieldName === "_skip") continue;
      mapped[fieldName] = rawRow[excelHeader];
    }

    // requestCode is required
    const requestCode = str(mapped.requestCode);
    if (!requestCode) {
      // Skip truly empty rows silently
      const hasAnyData = Object.values(mapped).some((v) => v !== null && v !== undefined && v !== "");
      if (!hasAnyData) {
        skippedRows++;
        continue;
      }
      errors.push({
        row: rowNum,
        field: "requestCode",
        value: String(mapped.requestCode ?? ""),
        message: "Thiếu Mã Yêu Cầu",
      });
      continue;
    }

    // Parse status
    const statusRaw = str(mapped.status) || "";
    const deliveryStatus = mapStatusToEnum(statusRaw);

    // Parse all fields with proper type conversion
    const totalFee = num(mapped.totalFee);
    const carrierFee = num(mapped.carrierFee);

    try {
      const order: ParsedOrder = {
        requestCode,
        status: statusRaw,
        deliveryStatus,

        reconciliationCode: str(mapped.reconciliationCode),
        reconciliationDate: parseDate(mapped.reconciliationDate),
        shopName: str(mapped.shopName),
        customerOrderCode: str(mapped.customerOrderCode),
        createdTime: parseDate(mapped.createdTime),
        pickupTime: parseDate(mapped.pickupTime),

        codAmount: num(mapped.codAmount),
        codOriginal: num(mapped.codOriginal),
        declaredValue: num(mapped.declaredValue),
        shippingFee: num(mapped.shippingFee),
        surcharge: num(mapped.surcharge),
        overweightFee: num(mapped.overweightFee),
        insuranceFee: num(mapped.insuranceFee),
        codServiceFee: num(mapped.codServiceFee),
        returnFee: num(mapped.returnFee),
        totalFee,
        carrierFee,
        ghsvInsuranceFee: num(mapped.ghsvInsuranceFee),
        revenue: ['RECONCILED', 'RETURNED_FULL', 'RETURNED_PARTIAL'].includes(deliveryStatus) ? (totalFee - carrierFee) : 0,

        creatorShopName: str(mapped.creatorShopName),
        creatorPhone: str(mapped.creatorPhone),
        creatorStaff: str(mapped.creatorStaff),
        creatorAddress: str(mapped.creatorAddress),
        creatorWard: str(mapped.creatorWard),
        creatorDistrict: str(mapped.creatorDistrict),
        creatorProvince: str(mapped.creatorProvince),

        senderShopName: str(mapped.senderShopName),
        senderPhone: str(mapped.senderPhone),
        senderAddress: str(mapped.senderAddress),
        senderWard: str(mapped.senderWard),
        senderDistrict: str(mapped.senderDistrict),
        senderProvince: str(mapped.senderProvince),

        receiverName: str(mapped.receiverName),
        receiverPhone: str(mapped.receiverPhone),
        receiverAddress: str(mapped.receiverAddress),
        receiverWard: str(mapped.receiverWard),
        receiverDistrict: str(mapped.receiverDistrict),
        receiverProvince: str(mapped.receiverProvince),

        deliveryNotes: str(mapped.deliveryNotes),
        productDescription: str(mapped.productDescription),
        paymentConfirmDate: parseDate(mapped.paymentConfirmDate),
        internalNotes: str(mapped.internalNotes),
        publicNotes: str(mapped.publicNotes),
        lastUpdated: parseDate(mapped.lastUpdated),

        carrierName: str(mapped.carrierName),
        carrierAccount: str(mapped.carrierAccount),
        carrierOrderCode: str(mapped.carrierOrderCode),
        regionGroup: str(mapped.regionGroup),

        customerWeight: numOrNull(mapped.customerWeight),
        carrierWeight: numOrNull(mapped.carrierWeight),
        deliveredDate: parseDate(mapped.deliveredDate),

        pickupShipper: str(mapped.pickupShipper),
        deliveryShipper: str(mapped.deliveryShipper),
        orderSource: str(mapped.orderSource),
        partialOrderType: str(mapped.partialOrderType),
        partialOrderCode: str(mapped.partialOrderCode),
        salesStaff: str(mapped.salesStaff),
      };

      orders.push(order);
    } catch (err) {
      errors.push({
        row: rowNum,
        field: "parse",
        value: requestCode,
        message: `Lỗi xử lý dòng: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return {
    orders,
    errors,
    summary: {
      totalRows: rawData.length,
      validRows: orders.length,
      errorRows: errors.length,
      skippedRows,
    },
  };
}

/**
 * Build Prisma data object for create/update from a ParsedOrder.
 * Full overwrite mode — all Excel fields overwritten.
 * EXCEPTIONS: staffNotes and importedAt are NEVER touched by uploads.
 */
export function buildOrderData(order: ParsedOrder) {
  return {
    status: order.status,
    deliveryStatus: order.deliveryStatus,
    reconciliationCode: order.reconciliationCode,
    reconciliationDate: order.reconciliationDate,
    shopName: order.shopName,
    customerOrderCode: order.customerOrderCode,
    createdTime: order.createdTime,
    pickupTime: order.pickupTime,

    codAmount: order.codAmount,
    codOriginal: order.codOriginal,
    declaredValue: order.declaredValue,
    shippingFee: order.shippingFee,
    surcharge: order.surcharge,
    overweightFee: order.overweightFee,
    insuranceFee: order.insuranceFee,
    codServiceFee: order.codServiceFee,
    returnFee: order.returnFee,
    totalFee: order.totalFee,
    carrierFee: order.carrierFee,
    ghsvInsuranceFee: order.ghsvInsuranceFee,
    revenue: order.revenue,
    // staffNotes: NOT included — preserve staff's manual notes
    // importedAt: NOT included — preserve original import timestamp

    creatorShopName: order.creatorShopName,
    creatorPhone: order.creatorPhone,
    creatorStaff: order.creatorStaff,
    creatorAddress: order.creatorAddress,
    creatorWard: order.creatorWard,
    creatorDistrict: order.creatorDistrict,
    creatorProvince: order.creatorProvince,

    senderShopName: order.senderShopName,
    senderPhone: order.senderPhone,
    senderAddress: order.senderAddress,
    senderWard: order.senderWard,
    senderDistrict: order.senderDistrict,
    senderProvince: order.senderProvince,

    receiverName: order.receiverName,
    receiverPhone: order.receiverPhone,
    receiverAddress: order.receiverAddress,
    receiverWard: order.receiverWard,
    receiverDistrict: order.receiverDistrict,
    receiverProvince: order.receiverProvince,

    deliveryNotes: order.deliveryNotes,
    productDescription: order.productDescription,
    paymentConfirmDate: order.paymentConfirmDate,
    internalNotes: order.internalNotes,
    publicNotes: order.publicNotes,
    lastUpdated: order.lastUpdated,

    carrierName: order.carrierName,
    carrierAccount: order.carrierAccount,
    carrierOrderCode: order.carrierOrderCode,
    regionGroup: order.regionGroup,

    customerWeight: order.customerWeight,
    carrierWeight: order.carrierWeight,
    deliveredDate: order.deliveredDate,

    pickupShipper: order.pickupShipper,
    deliveryShipper: order.deliveryShipper,
    orderSource: order.orderSource,
    partialOrderType: order.partialOrderType,
    partialOrderCode: order.partialOrderCode,
    salesStaff: order.salesStaff,
  };
}
