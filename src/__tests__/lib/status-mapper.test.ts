import { describe, it, expect } from "vitest";
import {
    mapStatusToEnum,
    mapStatusToVietnamese,
    hasDelayHistory,
    getStatusOptions,
    STATUS_CATEGORIES,
    STATUS_COLORS,
} from "@/lib/status-mapper";
import { DeliveryStatus } from "@prisma/client";

// ============================================================
// mapStatusToEnum
// ============================================================
describe("mapStatusToEnum", () => {
    it("maps 'Đang chuyển kho giao' → IN_TRANSIT", () => {
        expect(mapStatusToEnum("Đang chuyển kho giao")).toBe(DeliveryStatus.IN_TRANSIT);
    });

    it("maps 'Đang giao hàng' → DELIVERING", () => {
        expect(mapStatusToEnum("Đang giao hàng")).toBe(DeliveryStatus.DELIVERING);
    });

    it("maps 'Đã giao hàng' → DELIVERED", () => {
        expect(mapStatusToEnum("Đã giao hàng")).toBe(DeliveryStatus.DELIVERED);
    });

    it("maps 'Đã đối soát giao hàng' → RECONCILED", () => {
        expect(mapStatusToEnum("Đã đối soát giao hàng")).toBe(DeliveryStatus.RECONCILED);
    });

    it("maps 'Hoãn giao hàng' → DELIVERY_DELAYED", () => {
        expect(mapStatusToEnum("Hoãn giao hàng")).toBe(DeliveryStatus.DELIVERY_DELAYED);
    });

    it("maps 'Xác nhận hoàn' → RETURN_CONFIRMED", () => {
        expect(mapStatusToEnum("Xác nhận hoàn")).toBe(DeliveryStatus.RETURN_CONFIRMED);
    });

    it("maps 'Đang chuyển kho trả toàn bộ' → RETURNING_FULL", () => {
        expect(mapStatusToEnum("Đang chuyển kho trả toàn bộ")).toBe(DeliveryStatus.RETURNING_FULL);
    });

    it("maps 'Hoãn trả hàng' → RETURN_DELAYED", () => {
        expect(mapStatusToEnum("Hoãn trả hàng")).toBe(DeliveryStatus.RETURN_DELAYED);
    });

    it("maps 'Đã trả hàng toàn bộ' → RETURNED_FULL", () => {
        expect(mapStatusToEnum("Đã trả hàng toàn bộ")).toBe(DeliveryStatus.RETURNED_FULL);
    });

    it("maps 'Đã trả hàng một phần' → RETURNED_PARTIAL", () => {
        expect(mapStatusToEnum("Đã trả hàng một phần")).toBe(DeliveryStatus.RETURNED_PARTIAL);
    });

    it("returns PROCESSING for empty string", () => {
        expect(mapStatusToEnum("")).toBe(DeliveryStatus.PROCESSING);
    });

    it("returns PROCESSING for unknown status", () => {
        expect(mapStatusToEnum("Trạng thái không xác định")).toBe(DeliveryStatus.PROCESSING);
    });

    it("handles whitespace trimming", () => {
        expect(mapStatusToEnum("  Đang giao hàng  ")).toBe(DeliveryStatus.DELIVERING);
    });

    it("matches partial text (case-insensitive)", () => {
        expect(mapStatusToEnum("Đã giao hàng cho khách")).toBe(DeliveryStatus.DELIVERED);
    });
});

// ============================================================
// mapStatusToVietnamese
// ============================================================
describe("mapStatusToVietnamese", () => {
    it("maps IN_TRANSIT → 'Đang chuyển kho giao'", () => {
        expect(mapStatusToVietnamese(DeliveryStatus.IN_TRANSIT)).toBe("Đang chuyển kho giao");
    });

    it("maps DELIVERED → 'Đã giao hàng'", () => {
        expect(mapStatusToVietnamese(DeliveryStatus.DELIVERED)).toBe("Đã giao hàng");
    });

    it("maps PROCESSING → 'Đang xử lý'", () => {
        expect(mapStatusToVietnamese(DeliveryStatus.PROCESSING)).toBe("Đang xử lý");
    });

    it("maps all enum values without returning 'Không xác định'", () => {
        for (const status of Object.values(DeliveryStatus)) {
            const result = mapStatusToVietnamese(status);
            expect(result, `${status} should have a Vietnamese label`).not.toBe("Không xác định");
        }
    });
});

// ============================================================
// hasDelayHistory
// ============================================================
describe("hasDelayHistory", () => {
    it("returns true when publicNotes contains 'Hoãn giao hàng'", () => {
        expect(hasDelayHistory("14:30 - 20/03/2026 Hoãn giao hàng vì khách không nhận")).toBe(true);
    });

    it("returns false when publicNotes does not contain delay text", () => {
        expect(hasDelayHistory("Đang giao hàng bình thường")).toBe(false);
    });

    it("returns false for null", () => {
        expect(hasDelayHistory(null)).toBe(false);
    });

    it("returns false for undefined", () => {
        expect(hasDelayHistory(undefined)).toBe(false);
    });
});

// ============================================================
// getStatusOptions
// ============================================================
describe("getStatusOptions", () => {
    it("returns all 11 delivery statuses", () => {
        const options = getStatusOptions();
        expect(options).toHaveLength(11);
    });

    it("each option has value and label", () => {
        const options = getStatusOptions();
        for (const opt of options) {
            expect(opt.value).toBeDefined();
            expect(opt.label).toBeDefined();
            expect(typeof opt.label).toBe("string");
        }
    });
});

// ============================================================
// STATUS_CATEGORIES
// ============================================================
describe("STATUS_CATEGORIES", () => {
    it("ACTIVE includes IN_TRANSIT and DELIVERING", () => {
        expect(STATUS_CATEGORIES.ACTIVE).toContain(DeliveryStatus.IN_TRANSIT);
        expect(STATUS_CATEGORIES.ACTIVE).toContain(DeliveryStatus.DELIVERING);
    });

    it("PROBLEM includes DELIVERY_DELAYED and RETURN_CONFIRMED", () => {
        expect(STATUS_CATEGORIES.PROBLEM).toContain(DeliveryStatus.DELIVERY_DELAYED);
        expect(STATUS_CATEGORIES.PROBLEM).toContain(DeliveryStatus.RETURN_CONFIRMED);
    });

    it("RETURNING includes RETURN_DELAYED and RETURNING_FULL", () => {
        expect(STATUS_CATEGORIES.RETURNING).toContain(DeliveryStatus.RETURN_DELAYED);
        expect(STATUS_CATEGORIES.RETURNING).toContain(DeliveryStatus.RETURNING_FULL);
    });
});

// ============================================================
// STATUS_COLORS
// ============================================================
describe("STATUS_COLORS", () => {
    it("has color for every DeliveryStatus value", () => {
        for (const status of Object.values(DeliveryStatus)) {
            expect(STATUS_COLORS[status], `Missing color for ${status}`).toBeDefined();
        }
    });
});
