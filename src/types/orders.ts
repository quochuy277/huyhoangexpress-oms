import type { DeliveryStatus } from "@prisma/client";

export interface OrderRow {
  id: string;
  requestCode: string;
  carrierOrderCode: string | null;
  shopName: string | null;
  deliveryStatus: DeliveryStatus;
  status: string;
  createdTime: string | null;
  codAmount: number;
  totalFee: number;
  customerWeight: number | null;
  partialOrderType: string | null;
  staffNotes: string | null;
  revenue: number;
  receiverPhone: string | null;
  receiverName: string | null;
  claimOrder?: { issueType: string } | null;
}

export interface OrdersApiResponse {
  orders: OrderRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
