import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { OrderStaffNoteDialog } from "@/components/orders/OrderStaffNoteDialog";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  DialogDescription: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p className={className}>{children}</p>
  ),
  DialogFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  DialogHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  DialogTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 className={className}>{children}</h2>
  ),
}));

const order = {
  requestCode: "REQ-001",
  shopName: "Shop A",
  receiverName: "Nguyễn Văn A",
  staffNotes: "Đã gọi khách trước khi giao.",
};

describe("OrderStaffNoteDialog", () => {
  it("renders read-only mode without a save action", () => {
    const html = renderToStaticMarkup(
      <OrderStaffNoteDialog
        open={true}
        onOpenChange={() => undefined}
        order={order}
        canEditStaffNotes={false}
        onSaved={() => undefined}
      />,
    );

    expect(html).toContain("Ghi chú nội bộ");
    expect(html).toContain("Đóng");
    expect(html).not.toContain("Lưu ghi chú");
    expect(html).toContain("disabled");
    expect(html).toContain("Bạn đang ở chế độ chỉ xem.");
  });

  it("renders save controls when editing is allowed", () => {
    const html = renderToStaticMarkup(
      <OrderStaffNoteDialog
        open={true}
        onOpenChange={() => undefined}
        order={order}
        canEditStaffNotes={true}
        onSaved={() => undefined}
      />,
    );

    expect(html).toContain("Lưu ghi chú");
    expect(html).toContain("Ghi chú được lưu trực tiếp vào đơn hàng.");
    expect(html).not.toContain("disabled=\"\"");
  });
});
