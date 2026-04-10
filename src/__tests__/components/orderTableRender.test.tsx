import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrderTable } from "@/components/orders/OrderTable";
import type { OrdersApiResponse } from "@/types/orders";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => "/orders",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/orders/OrderStaffNoteDialog", () => ({
  OrderStaffNoteDialog: () => null,
}));

vi.mock("@/components/shared/AddTodoDialog", () => ({
  AddTodoDialog: () => null,
}));

vi.mock("@/components/shared/AddClaimFromPageDialog", () => ({
  AddClaimFromPageDialog: () => null,
}));

vi.mock("@/components/shared/OrderDetailDialog", () => ({
  OrderDetailDialog: () => null,
}));

vi.mock("@/components/tracking/TrackingPopup", () => ({
  TrackingPopup: () => null,
}));

const initialOrdersData: OrdersApiResponse = {
  orders: [
    {
      id: "order-1",
      requestCode: "REQ-001",
      carrierOrderCode: "GHN-001",
      shopName: "Shop A",
      deliveryStatus: "PENDING" as never,
      status: "PENDING",
      createdTime: "2026-04-10T08:00:00.000Z",
      codAmount: 120000,
      totalFee: 18000,
      customerWeight: 500,
      partialOrderType: null,
      staffNotes: "Có ghi chú",
      revenue: 0,
      receiverPhone: "0909123456",
      receiverName: "Nguyễn Văn A",
      receiverProvince: "Hồ Chí Minh",
      claimOrder: null,
    },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
  totalPages: 1,
};

function renderTable() {
  const queryClient = new QueryClient();

  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <OrderTable
        userRole="STAFF"
        canEditStaffNotes={true}
        selectedRows={[]}
        setSelectedRows={() => undefined}
        initialOrdersData={initialOrdersData}
      />
    </QueryClientProvider>,
  );
}

describe("OrderTable render", () => {
  beforeEach(() => {
    replaceMock.mockReset();
  });

  it("keeps the recipient phone clickable in the desktop recipient cell", () => {
    const html = renderTable();

    expect(html).toContain('href="tel:0909123456"');
    expect(html).toContain("0909123456");
    expect(html).toContain("Hồ Chí Minh");
  });
});
