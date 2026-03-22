import { describe, it, expect } from "vitest";
import {
    normalizeNotes,
    parseNoteLine,
    classifyNoteChange,
    extractValues,
    detectOrderChanges,
} from "@/lib/change-detector";
import type { ExistingOrderData } from "@/lib/change-detector";

// ============================================================
// normalizeNotes
// ============================================================
describe("normalizeNotes", () => {
    it("returns empty array for null", () => {
        expect(normalizeNotes(null)).toEqual([]);
    });

    it("returns empty array for empty string", () => {
        expect(normalizeNotes("")).toEqual([]);
    });

    it("splits on newlines and trims", () => {
        const result = normalizeNotes("line1\n  line2  \nline3");
        expect(result).toEqual(["line1", "line2", "line3"]);
    });

    it("handles CRLF line endings", () => {
        const result = normalizeNotes("line1\r\nline2\r\nline3");
        expect(result).toEqual(["line1", "line2", "line3"]);
    });

    it("filters empty lines", () => {
        const result = normalizeNotes("line1\n\n\nline2");
        expect(result).toEqual(["line1", "line2"]);
    });
});

// ============================================================
// parseNoteLine
// ============================================================
describe("parseNoteLine", () => {
    it("parses timestamp format 'HH:MM - DD/MM/YYYY Content'", () => {
        const result = parseNoteLine("14:30 - 20/03/2026 Đổi khối lượng từ 500g thành 800g");
        expect(result.timestamp).not.toBeNull();
        expect(result.timestamp!.getDate()).toBe(20);
        expect(result.timestamp!.getMonth()).toBe(2); // March = 2
        expect(result.content).toBe("Đổi khối lượng từ 500g thành 800g");
    });

    it("handles dash-separated date 'HH:MM-DD-MM-YYYY Content'", () => {
        const result = parseNoteLine("08:15-15-06-2025 Xác nhận phí NVC thu 42,001đ");
        expect(result.timestamp).not.toBeNull();
        expect(result.content).toBe("Xác nhận phí NVC thu 42,001đ");
    });

    it("returns null timestamp for lines without timestamp", () => {
        const result = parseNoteLine("Đỗ Kim Huệ: Hoàn");
        expect(result.timestamp).toBeNull();
        expect(result.content).toBe("Đỗ Kim Huệ: Hoàn");
    });
});

// ============================================================
// classifyNoteChange
// ============================================================
describe("classifyNoteChange", () => {
    it("classifies weight change", () => {
        expect(classifyNoteChange("Đổi khối lượng NVC từ 500g thành 800g")).toBe("WEIGHT_CHANGE");
    });

    it("classifies webhook weight change", () => {
        expect(classifyNoteChange("Webhook đổi khối lượng KH từ 200 thành 300")).toBe("WEIGHT_CHANGE");
    });

    it("classifies carrier fee confirmation", () => {
        expect(classifyNoteChange("Xác nhận phí NVC thu 42,001đ")).toBe("CARRIER_FEE_CONFIRMED");
    });

    it("classifies recipient change", () => {
        expect(classifyNoteChange("Đổi thông tin người nhận")).toBe("RECIPIENT_CHANGE");
    });

    it("classifies surcharge change", () => {
        expect(classifyNoteChange("Đổi nội bộ phụ phí từ 0 thành 5000")).toBe("SURCHARGE_CHANGE");
    });

    it("classifies COD confirmed", () => {
        expect(classifyNoteChange("Xác nhận đã thanh toán COD")).toBe("COD_CONFIRMED");
    });

    it("classifies return completed", () => {
        expect(classifyNoteChange("Đã thực hiện trả hàng cho khách")).toBe("RETURN_COMPLETED");
    });

    it("classifies carrier switch", () => {
        expect(classifyNoteChange("Đổi đơn vị vận chuyển")).toBe("CARRIER_SWITCH");
    });

    it("classifies redeliver", () => {
        expect(classifyNoteChange("Kéo giao lại đơn hàng")).toBe("REDELIVER");
    });

    it("classifies internal status note", () => {
        expect(classifyNoteChange("Đổi nội bộ trạng thái")).toBe("INTERNAL_STATUS_NOTE");
    });

    it("classifies return approved", () => {
        expect(classifyNoteChange("Xác nhận duyệt hoàn")).toBe("RETURN_APPROVED");
    });

    it("classifies claim related", () => {
        expect(classifyNoteChange("Yêu cầu khiếu nại vì hàng bị hư")).toBe("CLAIM_RELATED");
    });

    it("classifies staff note pattern", () => {
        expect(classifyNoteChange("Đỗ Kim Huệ: Hoàn")).toBe("STAFF_NOTE");
    });

    it("returns null for ignored patterns (đã tạo đơn hàng)", () => {
        expect(classifyNoteChange("Đã tạo đơn hàng")).toBeNull();
    });

    it("returns null for ignored patterns (đang được lấy bởi shipper)", () => {
        expect(classifyNoteChange("Đang được lấy bởi shipper")).toBeNull();
    });

    it("returns OTHER for unrecognized content", () => {
        expect(classifyNoteChange("Random unrecognized text")).toBe("OTHER");
    });
});

// ============================================================
// extractValues
// ============================================================
describe("extractValues", () => {
    it("extracts 'từ ... thành ...' pattern", () => {
        const result = extractValues("Đổi khối lượng từ 500g thành 800g", "WEIGHT_CHANGE");
        expect(result.prev).toBe("500g");
        expect(result.next).toBe("800g");
    });

    it("handles names containing 'thành' (uses last match)", () => {
        const result = extractValues(
            "Đổi thông tin người nhận từ Nguyễn Thành Nam thành Trần Hoàng",
            "RECIPIENT_CHANGE"
        );
        expect(result.prev).toBe("Nguyễn Thành Nam");
        expect(result.next).toBe("Trần Hoàng");
    });

    it("extracts amount for carrier fee confirmation", () => {
        const result = extractValues(
            "Xác nhận phí NVC thu 42,001đ",
            "CARRIER_FEE_CONFIRMED"
        );
        expect(result.prev).toBeNull();
        expect(result.next).toBe("42,001đ");
    });

    it("returns nulls when no pattern matches", () => {
        const result = extractValues("Random text", "OTHER");
        expect(result.prev).toBeNull();
        expect(result.next).toBeNull();
    });
});

// ============================================================
// detectOrderChanges
// ============================================================
describe("detectOrderChanges", () => {
    it("detects STATUS_CHANGE when deliveryStatus differs", () => {
        const existing: ExistingOrderData = {
            requestCode: "REQ001",
            deliveryStatus: "DELIVERING",
            internalNotes: null,
        };
        const changes = detectOrderChanges(existing, "DELIVERED", null);
        expect(changes).toHaveLength(1);
        expect(changes[0].changeType).toBe("STATUS_CHANGE");
        expect(changes[0].previousValue).toContain("Đang giao hàng");
        expect(changes[0].newValue).toContain("Đã giao hàng");
    });

    it("returns empty array when nothing changed", () => {
        const existing: ExistingOrderData = {
            requestCode: "REQ001",
            deliveryStatus: "DELIVERING",
            internalNotes: "14:30 - 20/03/2026 Đã tạo đơn hàng",
        };
        const changes = detectOrderChanges(
            existing,
            "DELIVERING",
            "14:30 - 20/03/2026 Đã tạo đơn hàng"
        );
        expect(changes).toHaveLength(0);
    });

    it("detects new internal note lines as changes", () => {
        const existing: ExistingOrderData = {
            requestCode: "REQ001",
            deliveryStatus: "DELIVERING",
            internalNotes: "14:30 - 20/03/2026 Đã tạo đơn hàng",
        };
        const newNotes =
            "14:30 - 20/03/2026 Đã tạo đơn hàng\n15:00 - 20/03/2026 Đổi khối lượng từ 500g thành 800g";
        const changes = detectOrderChanges(existing, "DELIVERING", newNotes);
        expect(changes.length).toBeGreaterThanOrEqual(1);
        const weightChange = changes.find((c) => c.changeType === "WEIGHT_CHANGE");
        expect(weightChange).toBeDefined();
    });

    it("detects combined status + note changes", () => {
        const existing: ExistingOrderData = {
            requestCode: "REQ001",
            deliveryStatus: "DELIVERING",
            internalNotes: null,
        };
        const newNotes = "15:00 - 20/03/2026 Kéo giao lại đơn hàng";
        const changes = detectOrderChanges(existing, "DELIVERY_DELAYED", newNotes);
        expect(changes.length).toBe(2);
        const statusChange = changes.find((c) => c.changeType === "STATUS_CHANGE");
        const redeliverChange = changes.find((c) => c.changeType === "REDELIVER");
        expect(statusChange).toBeDefined();
        expect(redeliverChange).toBeDefined();
    });

    it("ignores normal operation notes", () => {
        const existing: ExistingOrderData = {
            requestCode: "REQ001",
            deliveryStatus: "DELIVERING",
            internalNotes: null,
        };
        const newNotes = "14:30 - 20/03/2026 Đã tạo đơn hàng";
        const changes = detectOrderChanges(existing, "DELIVERING", newNotes);
        // "Đã tạo đơn hàng" is in IGNORED_PATTERNS — should produce 0 changes
        expect(changes).toHaveLength(0);
    });
});
