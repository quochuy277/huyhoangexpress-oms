const fmtVND = (n: number) =>
  `${new Intl.NumberFormat("vi-VN").format(Math.round(Math.abs(n)))}đ`;

const fmtSignedVND = (n: number) => `${n >= 0 ? "+" : "-"}${fmtVND(n)}`;

const fmtDate = (date: string | null | undefined) =>
  date ? new Date(date).toLocaleDateString("vi-VN") : "—";

const fmtDateTime = (date: string) =>
  new Date(date).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function shouldUseMobileCards(width: number) {
  return width < 768;
}

export function buildExpenseSummary(expense: {
  id: string;
  title: string;
  amount: number;
  note?: string | null;
  date: string;
  category?: { name?: string | null } | null;
}) {
  return {
    id: expense.id,
    title: expense.title,
    categoryName: expense.category?.name || "—",
    amountLabel: fmtVND(expense.amount),
    noteLabel: expense.note || "—",
    dateLabel: fmtDate(expense.date),
  };
}

export function buildBudgetSummary(item: {
  categoryId: string;
  categoryName: string;
  budgetAmount: number;
  spent: number;
  remaining: number;
  ratio: number;
}) {
  const statusTone = item.ratio > 90 ? "danger" : item.ratio > 70 ? "warning" : "ok";
  const statusLabel =
    item.ratio > 90 ? "Sắp vượt" : item.ratio > 70 ? "Gần hết" : "Bình thường";

  return {
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    budgetLabel: item.budgetAmount > 0 ? fmtVND(item.budgetAmount) : "—",
    spentLabel: fmtVND(item.spent),
    remainingLabel: item.budgetAmount > 0 ? fmtVND(item.remaining) : "—",
    ratioLabel: `${item.ratio}%`,
    statusTone,
    statusLabel,
  };
}

export function buildPnlSections(pnl: {
  revenue: {
    totalFeeFromShop: number;
    totalCarrierFee: number;
    netRevenue: number;
  };
  claims: {
    customerComp: number;
    carrierComp: number;
    claimDiff: number;
  };
  grossProfit: number;
  operatingExpenses: Array<{ name: string; total: number }>;
  totalOperatingExpenses: number;
  netProfit: number;
}) {
  return [
    {
      key: "revenue",
      title: "Doanh thu",
      summary: fmtVND(pnl.revenue.netRevenue),
      rows: [
        { label: "Tổng phí thu từ shop", value: fmtVND(pnl.revenue.totalFeeFromShop) },
        { label: "Trừ phí NVC", value: `-${fmtVND(pnl.revenue.totalCarrierFee)}` },
        { label: "Doanh thu ròng", value: fmtVND(pnl.revenue.netRevenue) },
      ],
    },
    {
      key: "claims",
      title: "Chi phí trực tiếp",
      summary:
        pnl.claims.claimDiff >= 0
          ? fmtVND(pnl.claims.claimDiff)
          : `-${fmtVND(pnl.claims.claimDiff)}`,
      rows: [
        { label: "Đền bù KH", value: `-${fmtVND(pnl.claims.customerComp)}` },
        { label: "NVC đền bù", value: fmtVND(pnl.claims.carrierComp) },
        {
          label: "Chênh lệch đền bù",
          value:
            pnl.claims.claimDiff >= 0
              ? fmtVND(pnl.claims.claimDiff)
              : `-${fmtVND(pnl.claims.claimDiff)}`,
        },
        { label: "Lợi nhuận gộp", value: fmtVND(pnl.grossProfit) },
      ],
    },
    {
      key: "opex",
      title: "Chi phí vận hành",
      summary: fmtVND(pnl.totalOperatingExpenses),
      rows: [
        ...pnl.operatingExpenses.map((item) => ({
          label: item.name,
          value: `-${fmtVND(item.total)}`,
        })),
        {
          label: "Tổng chi phí vận hành",
          value: `-${fmtVND(pnl.totalOperatingExpenses)}`,
        },
      ],
    },
    {
      key: "netProfit",
      title: "Lợi nhuận",
      summary: pnl.netProfit >= 0 ? fmtVND(pnl.netProfit) : `-${fmtVND(pnl.netProfit)}`,
      rows: [
        {
          label: "Lợi nhuận ròng",
          value: pnl.netProfit >= 0 ? fmtVND(pnl.netProfit) : `-${fmtVND(pnl.netProfit)}`,
        },
      ],
    },
  ];
}

export function buildCarrierSummary(item: {
  carrier: string;
  orderCount: number;
  revenue: number;
  margin: number;
  negativeCount: number;
  codTotal: number;
}) {
  return {
    title: item.carrier,
    orderCountLabel: item.orderCount.toLocaleString("vi-VN"),
    revenueLabel: fmtVND(item.revenue),
    marginLabel: `${item.margin}%`,
    negativeCountLabel: `${item.negativeCount}`,
    codTotalLabel: fmtVND(item.codTotal),
  };
}

export function buildShopSummary(item: {
  shop: string;
  total: number;
  revenue: number;
  deliveryRate: number;
  returnRate: number;
  codTotal: number;
  avgFee: number;
}) {
  return {
    title: item.shop,
    totalLabel: item.total.toLocaleString("vi-VN"),
    revenueLabel: fmtVND(item.revenue),
    deliveryRateLabel: `${item.deliveryRate}%`,
    returnRateLabel: `${item.returnRate}%`,
    codTotalLabel: fmtVND(item.codTotal),
    avgFeeLabel: fmtVND(item.avgFee),
  };
}

export function buildNegativeRevenueSummary(item: {
  requestCode: string;
  carrierName: string;
  creatorShopName: string;
  status: string;
  revenue: number;
  codAmount: number;
  regionGroup?: string | null;
}) {
  return {
    title: item.requestCode,
    carrierName: item.carrierName,
    shopName: item.creatorShopName,
    status: item.status,
    revenueLabel: item.revenue >= 0 ? fmtVND(item.revenue) : `-${fmtVND(item.revenue)}`,
    codLabel: fmtVND(item.codAmount),
    regionLabel: item.regionGroup || "—",
  };
}

const CASHBOOK_GROUP_LABELS: Record<string, string> = {
  COD: "COD",
  SHOP_PAYOUT: "Trả shop",
  RECONCILIATION_FEE: "Phí ĐS",
  TOP_UP: "Nạp tiền",
  COMPENSATION: "Đền bù",
  COOPERATION_FEE: "Phí HT",
  OTHER: "Khác",
};

export function buildCashbookTransactionSummary(item: {
  id: string;
  transactionTime: string;
  receiptCode: string;
  content: string;
  amount: number;
  balance: number;
  groupType: string;
}) {
  return {
    id: item.id,
    receiptCode: item.receiptCode,
    content: item.content,
    timeLabel: fmtDateTime(item.transactionTime),
    amountLabel: fmtSignedVND(item.amount),
    balanceLabel: fmtVND(item.balance),
    groupLabel: CASHBOOK_GROUP_LABELS[item.groupType] || CASHBOOK_GROUP_LABELS.OTHER,
  };
}

export function buildShopPayoutSummary(item: {
  shop: string;
  count: number;
  total: number;
  fee: number;
  lastDate?: string | null;
}) {
  return {
    title: item.shop,
    countLabel: `${item.count}`,
    totalLabel: fmtVND(item.total),
    feeLabel: fmtVND(item.fee),
    lastDateLabel: fmtDate(item.lastDate),
  };
}
