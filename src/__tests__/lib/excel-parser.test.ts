import { describe, it, expect, vi } from "vitest";
import { parseExcelBuffer, buildOrderData } from "@/lib/excel-parser";
import type { ParsedOrder } from "@/lib/excel-parser";
import * as XLSX from "xlsx";

// ============================================================
// Helper: create minimal Excel buffer with given headers & data
// ============================================================
function createExcelBuffer(
    headers: string[],
    rows: (string | number | null)[][]
): ArrayBuffer {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    return buf;
}

// ============================================================
// parseExcelBuffer
// ============================================================
describe("parseExcelBuffer", () => {
    it("handles empty workbook gracefully", () => {
        // XLSX.write throws for truly empty workbooks — test with empty sheet instead
        const ws = XLSX.utils.aoa_to_sheet([]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
        const result = parseExcelBuffer(buf);
        expect(result.orders).toHaveLength(0);
    });

    it("returns error when file has no data rows", () => {
        const buf = createExcelBuffer(["Mã Yêu Cầu", "Trạng thái"], []);
        const result = parseExcelBuffer(buf);
        expect(result.orders).toHaveLength(0);
        expect(result.errors[0].message).toContain("không có dữ liệu");
    });

    it("returns error when requestCode column is missing", () => {
        const buf = createExcelBuffer(
            ["Tên cửa hàng", "Trạng thái"],
            [["Shop A", "Đang giao hàng"]]
        );
        const result = parseExcelBuffer(buf);
        expect(result.orders).toHaveLength(0);
        expect(result.errors[0].message).toContain("Mã Yêu Cầu");
    });

    it("parses valid rows correctly", () => {
        const buf = createExcelBuffer(
            ["Mã Yêu Cầu", "Trạng thái", "Tên cửa hàng", "Thu hộ", "Tổng phí"],
            [["REQ001", "Đang giao hàng", "Shop A", 500000, 30000]]
        );
        const result = parseExcelBuffer(buf);
        expect(result.orders).toHaveLength(1);
        expect(result.orders[0].requestCode).toBe("REQ001");
        expect(result.orders[0].shopName).toBe("Shop A");
        expect(result.orders[0].codAmount).toBe(500000);
        expect(result.orders[0].totalFee).toBe(30000);
        expect(result.summary.validRows).toBe(1);
        expect(result.summary.errorRows).toBe(0);
    });

    it("skips rows with no requestCode (truly empty rows)", () => {
        const buf = createExcelBuffer(
            ["Mã Yêu Cầu", "Trạng thái"],
            [
                ["REQ001", "Đang giao hàng"],
                [null, null], // empty row
            ]
        );
        const result = parseExcelBuffer(buf);
        expect(result.orders).toHaveLength(1);
        expect(result.orders[0].requestCode).toBe("REQ001");
    });

    it("reports error for rows with data but missing requestCode", () => {
        const buf = createExcelBuffer(
            ["Mã Yêu Cầu", "Trạng thái", "Tên cửa hàng"],
            [
                [null, "Đang giao hàng", "Shop A"], // has data but no requestCode
            ]
        );
        const result = parseExcelBuffer(buf);
        expect(result.orders).toHaveLength(0);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].field).toBe("requestCode");
    });

    it("handles case-insensitive header matching", () => {
        const buf = createExcelBuffer(
            ["mã yêu cầu", "TRẠNG THÁI", "THU HỘ"],
            [["REQ001", "Đã giao hàng", 100000]]
        );
        const result = parseExcelBuffer(buf);
        expect(result.orders).toHaveLength(1);
        expect(result.orders[0].requestCode).toBe("REQ001");
        expect(result.orders[0].codAmount).toBe(100000);
    });

    it("maps deliveryStatus correctly from Vietnamese status", () => {
        const buf = createExcelBuffer(
            ["Mã Yêu Cầu", "Trạng thái"],
            [
                ["REQ001", "Đang giao hàng"],
                ["REQ002", "Hoãn giao hàng"],
                ["REQ003", "Đã đối soát giao hàng"],
            ]
        );
        const result = parseExcelBuffer(buf);
        expect(result.orders[0].deliveryStatus).toBe("DELIVERING");
        expect(result.orders[1].deliveryStatus).toBe("DELIVERY_DELAYED");
        expect(result.orders[2].deliveryStatus).toBe("RECONCILED");
    });

    it("calculates revenue for RECONCILED orders", () => {
        const buf = createExcelBuffer(
            ["Mã Yêu Cầu", "Trạng thái", "Tổng phí", "Phí đối tác thu"],
            [
                ["REQ001", "Đã đối soát giao hàng", 50000, 30000],
                ["REQ002", "Đang giao hàng", 50000, 30000],
            ]
        );
        const result = parseExcelBuffer(buf);
        expect(result.orders[0].revenue).toBe(20000); // RECONCILED: totalFee - carrierFee
        expect(result.orders[1].revenue).toBe(0); // DELIVERING: revenue = 0
    });

    it("handles numeric fields defaulting to 0", () => {
        const buf = createExcelBuffer(
            ["Mã Yêu Cầu", "Trạng thái", "Thu hộ"],
            [["REQ001", "Đang giao hàng", null]]
        );
        const result = parseExcelBuffer(buf);
        expect(result.orders[0].codAmount).toBe(0);
        expect(result.orders[0].shippingFee).toBe(0);
        expect(result.orders[0].totalFee).toBe(0);
    });

    it("handles nullable numeric fields (weight)", () => {
        const buf = createExcelBuffer(
            ["Mã Yêu Cầu", "Trạng thái", "Khối lượng khách hàng", "Khối lượng NVC"],
            [
                ["REQ001", "Đang giao hàng", 500, null],
            ]
        );
        const result = parseExcelBuffer(buf);
        expect(result.orders[0].customerWeight).toBe(500);
        expect(result.orders[0].carrierWeight).toBeNull();
    });

    it("parses multiple valid rows with summary", () => {
        const rows = Array.from({ length: 5 }, (_, i) => [
            `REQ${String(i + 1).padStart(3, "0")}`,
            "Đang giao hàng",
        ]);
        const buf = createExcelBuffer(["Mã Yêu Cầu", "Trạng thái"], rows);
        const result = parseExcelBuffer(buf);
        expect(result.orders).toHaveLength(5);
        expect(result.summary.totalRows).toBe(5);
        expect(result.summary.validRows).toBe(5);
    });
});

// ============================================================
// buildOrderData
// ============================================================
describe("buildOrderData", () => {
    const mockOrder: ParsedOrder = {
        requestCode: "REQ001",
        status: "Đang giao hàng",
        deliveryStatus: "DELIVERING" as ParsedOrder["deliveryStatus"],
        reconciliationCode: null,
        reconciliationDate: null,
        shopName: "Shop A",
        customerOrderCode: "CUST001",
        createdTime: new Date("2024-01-01"),
        pickupTime: null,
        codAmount: 500000,
        codOriginal: 500000,
        declaredValue: 0,
        shippingFee: 30000,
        surcharge: 0,
        overweightFee: 0,
        insuranceFee: 0,
        codServiceFee: 0,
        returnFee: 0,
        totalFee: 30000,
        carrierFee: 20000,
        ghsvInsuranceFee: 0,
        revenue: 0,
        creatorShopName: null,
        creatorPhone: null,
        creatorStaff: null,
        creatorAddress: null,
        creatorWard: null,
        creatorDistrict: null,
        creatorProvince: null,
        senderShopName: null,
        senderPhone: null,
        senderAddress: null,
        senderWard: null,
        senderDistrict: null,
        senderProvince: null,
        receiverName: "Nguyễn Văn A",
        receiverPhone: "0901234567",
        receiverAddress: "123 Đường ABC",
        receiverWard: null,
        receiverDistrict: null,
        receiverProvince: "Hồ Chí Minh",
        deliveryNotes: null,
        productDescription: "Áo thun",
        paymentConfirmDate: null,
        internalNotes: null,
        publicNotes: null,
        lastUpdated: null,
        carrierName: "SVExpress",
        carrierAccount: null,
        carrierOrderCode: "SV001",
        regionGroup: null,
        customerWeight: 500,
        carrierWeight: null,
        deliveredDate: null,
        pickupShipper: null,
        deliveryShipper: null,
        orderSource: null,
        partialOrderType: null,
        partialOrderCode: null,
        salesStaff: null,
    };

    it("maps all fields from ParsedOrder", () => {
        const data = buildOrderData(mockOrder);
        expect(data.status).toBe("Đang giao hàng");
        expect(data.shopName).toBe("Shop A");
        expect(data.codAmount).toBe(500000);
        expect(data.receiverName).toBe("Nguyễn Văn A");
        expect(data.carrierName).toBe("SVExpress");
    });

    it("does NOT include staffNotes (preserved manually)", () => {
        const data = buildOrderData(mockOrder);
        expect(data).not.toHaveProperty("staffNotes");
    });

    it("does NOT include importedAt (preserved from first import)", () => {
        const data = buildOrderData(mockOrder);
        expect(data).not.toHaveProperty("importedAt");
    });

    it("does NOT include requestCode (it's the unique key, not data)", () => {
        const data = buildOrderData(mockOrder);
        expect(data).not.toHaveProperty("requestCode");
    });
});
