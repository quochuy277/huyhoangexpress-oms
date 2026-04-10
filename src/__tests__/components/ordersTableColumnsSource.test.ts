import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Orders table columns source", () => {
  it("renders the approved desktop columns without standalone note or partial-order columns", () => {
    const source = readSource("src/components/orders/OrderTable.tsx");

    expect(source).toContain('label: "Mã yêu cầu"');
    expect(source).toContain('label: "Mã đơn đối tác"');
    expect(source).toContain('label: "Tên cửa hàng"');
    expect(source).toContain('label: "Thông tin người nhận"');
    expect(source).toContain('label: "Trạng thái"');
    expect(source).toContain('label: "Thời gian tạo"');
    expect(source).toContain('label: "Thu hộ"');
    expect(source).toContain('label: "Tổng phí"');
    expect(source).toContain('label: "Khối lượng"');
    expect(source).toContain('label: "Thao tác"');
    expect(source).not.toContain('label: "Ghi chú"');
    expect(source).not.toContain('label: "Đơn Hàng Một Phần"');
  });

  it("moves staff notes into the action area for both desktop and mobile flows", () => {
    const source = readSource("src/components/orders/OrderTable.tsx");

    expect(source).toContain("OrderStaffNoteDialog");
    expect(source).toContain("setNoteDialogOrder(order);");
    expect(source.split("setNoteDialogOrder(order);")).toHaveLength(3);
    expect(source).toContain("Ghi chú nội bộ");
    expect(source).not.toContain("function NoteCell");
  });

  it("keeps the mobile action row responsive after adding the note icon", () => {
    const source = readSource("src/components/orders/OrderTable.tsx");

    expect(source).toContain('className="mt-2 flex flex-wrap items-start justify-between gap-2"');
    expect(source).toContain('className="ml-auto flex shrink-0 items-center gap-1"');
  });
});
