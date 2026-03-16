export type ReturnOrder = {
  id: string;
  requestCode: string;
  carrierOrderCode: string | null;
  shopName: string | null;
  status: string;
  deliveryStatus: string;
  deliveredDate: string | null;
  lastUpdated: string | null;
  publicNotes: string | null;
  partialOrderType: string | null;
  partialOrderCode: string | null;
  staffNotes: string | null;
  warehouseArrivalDate: string | null;
  customerConfirmAsked: boolean;
  confirmedAskedBy: string | null;
  confirmedAskedAt: string | null;
  customerConfirmed: boolean;
  customerConfirmedBy: string | null;
  customerConfirmedAt: string | null;
  codAmount: number;
  receiverName: string | null;
  receiverPhone: string | null;
  // computed server-side
  lastDelayDate: string | null;
  daysReturning: number;
  // claim info (left join)
  claimOrder?: { issueType: string } | null;
};
