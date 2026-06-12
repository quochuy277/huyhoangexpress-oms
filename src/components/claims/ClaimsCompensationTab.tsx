"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle, CheckCircle2, ChevronRight, Clock, DollarSign, Download,
  FileWarning, Loader2, Scale, Search, XCircle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { CLAIMS_MOBILE_BREAKPOINT } from "@/components/claims/claims-table/claimsResponsive";
import {
  CompensationFilterBar,
  createDefaultCompensationFilters,
  type CompensationFilters,
} from "@/components/claims/compensation/CompensationFilterBar";

const ShopClaimsDetailModal = dynamic(
  () => import("@/components/claims/compensation/ShopClaimsDetailModal").then((module) => ({
    default: module.ShopClaimsDetailModal,
  })),
  { loading: () => null },
);

type CompensationSummary = {
  totalClaims: number;
  processingCount: number;
  customerCompensatedCount: number;
  customerRejectedCount: number;
  pendingCount: number;
  carrierTotal: number;
  customerTotal: number;
  difference: number;
};

type CompensationShopRow = {
  shopName: string;
  totalClaims: number;
  processing: number;
  compensated: number;
  rejected: number;
  pending: number;
  totalPaid: number;
};

type CompensationResponse = {
  summary: CompensationSummary;
  shops: CompensationShopRow[];
  monthlyData: Array<{ month: string; carrier: number; customer: number }>;
  issueDistribution: Array<{ type: string; label: string; count: number; color: string }>;
};

const cardStyle: React.CSSProperties = {
  background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "12px",
  padding: "16px 20px",
};

const formatVND = (n: number) => n.toLocaleString("vi-VN") + "đ";

const SHOP_TABLE_HEADERS = ["Cửa Hàng", "Tổng VĐ", "Đang XL", "Đã ĐB KH", "Từ Chối ĐB", "Chờ ĐB", "Tiền ĐB KH", "Chi Tiết"];

export default function ClaimsCompensationTab() {
  const [filters, setFilters] = useState<CompensationFilters>(() => createDefaultCompensationFilters());
  const [shopSearch, setShopSearch] = useState("");
  const [detailShop, setDetailShop] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<CompensationResponse>({
    queryKey: ["claims-compensation", filters.dateFrom, filters.dateTo, filters.shopName],
    queryFn: async () => {
      const params = new URLSearchParams({ dateFrom: filters.dateFrom, dateTo: filters.dateTo });
      if (filters.shopName) params.set("shopName", filters.shopName);
      const res = await fetch(`/api/claims/compensation?${params.toString()}`);
      if (!res.ok) throw new Error("Không thể tải tổng hợp đền bù");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: filterOptions } = useQuery<{ shops: string[] }>({
    queryKey: ["claims-filter-options"],
    queryFn: async () => {
      const res = await fetch("/api/claims/filter-options");
      if (!res.ok) return { shops: [] };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const summary = data?.summary;
  const shops = data?.shops ?? [];
  const filteredShops = shops.filter((shop) =>
    !shopSearch || shop.shopName.toLowerCase().includes(shopSearch.toLowerCase()),
  );

  const totals = filteredShops.reduce(
    (acc, shop) => ({
      totalClaims: acc.totalClaims + shop.totalClaims,
      processing: acc.processing + shop.processing,
      compensated: acc.compensated + shop.compensated,
      rejected: acc.rejected + shop.rejected,
      pending: acc.pending + shop.pending,
      totalPaid: acc.totalPaid + shop.totalPaid,
    }),
    { totalClaims: 0, processing: 0, compensated: 0, rejected: 0, pending: 0, totalPaid: 0 },
  );

  const difference = summary?.difference || 0;

  const summaryCards = [
    {
      label: "Tổng số đơn có vấn đề",
      value: String(summary?.totalClaims || 0),
      subtitle: "Trong kỳ đã lọc",
      color: "#334155", bgColor: "#f8fafc", borderColor: "#64748b",
      icon: <FileWarning size={20} />,
    },
    {
      label: "Đơn đang xử lý",
      value: String(summary?.processingCount || 0),
      subtitle: "Chưa có kết quả cuối",
      color: "#2563eb", bgColor: "#eff6ff", borderColor: "#2563eb",
      icon: <Clock size={20} />,
    },
    {
      label: "Đơn đã đền bù KH",
      value: String(summary?.customerCompensatedCount || 0),
      subtitle: "Trạng thái Đã đền bù KH",
      color: "#16a34a", bgColor: "#f0fdf4", borderColor: "#16a34a",
      icon: <CheckCircle2 size={20} />,
    },
    {
      label: "Đơn từ chối ĐB",
      value: String(summary?.customerRejectedCount || 0),
      subtitle: "Trạng thái Từ chối ĐB KH",
      color: "#ea580c", bgColor: "#fff7ed", borderColor: "#ea580c",
      icon: <XCircle size={20} />,
    },
    {
      label: "Tổng tiền đền bù",
      value: formatVND(summary?.customerTotal || 0),
      subtitle: `${summary?.customerCompensatedCount || 0} đơn đã đền bù KH`,
      color: "#dc2626", bgColor: "#fef2f2", borderColor: "#dc2626",
      icon: <DollarSign size={20} />,
    },
    {
      label: "Chênh lệch (Lời/Lỗ)",
      value: `${difference >= 0 ? "" : "-"}${formatVND(Math.abs(difference))}`,
      subtitle: `NVC ĐB ${formatVND(summary?.carrierTotal || 0)} − ĐB KH ${formatVND(summary?.customerTotal || 0)}`,
      color: difference >= 0 ? "#2563eb" : "#dc2626",
      bgColor: difference >= 0 ? "#eff6ff" : "#fef2f2",
      borderColor: difference >= 0 ? "#2563eb" : "#dc2626",
      icon: <Scale size={20} />,
    },
    {
      label: "Đơn chờ đền bù",
      value: String(summary?.pendingCount || 0),
      subtitle: "NVC đã chốt, chờ quyết với KH",
      color: "#d97706", bgColor: "#fffbeb", borderColor: "#d97706",
      icon: <AlertCircle size={20} />,
    },
  ];

  const handleExportExcel = () => {
    if (filteredShops.length === 0) return;
    import("xlsx").then((XLSX) => {
      const headers = ["STT", "Cửa Hàng", "Tổng Đơn VĐ", "Đang Xử Lý", "Đã ĐB KH", "Từ Chối ĐB", "Chờ ĐB", "Tiền ĐB KH"];
      const rows = filteredShops.map((shop, index) => [
        index + 1, shop.shopName, shop.totalClaims, shop.processing,
        shop.compensated, shop.rejected, shop.pending, shop.totalPaid,
      ]);
      const aoa = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "DenBuTheoCuaHang");
      XLSX.writeFile(wb, `den-bu-theo-cua-hang-${new Date().toISOString().slice(0, 10)}.xlsx`);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <style>{`
        @media (max-width: ${CLAIMS_MOBILE_BREAKPOINT - 1}px) {
          .claims-compensation-shop-table { display: none !important; }
          .claims-compensation-shop-cards { display: flex !important; }
        }

        @media (min-width: ${CLAIMS_MOBILE_BREAKPOINT}px) {
          .claims-compensation-shop-cards { display: none !important; }
        }
      `}</style>

      <CompensationFilterBar
        filters={filters}
        shopOptions={filterOptions?.shops ?? []}
        onChange={setFilters}
      />

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "80px", color: "#6b7280" }}>
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : isError || !data ? (
        <div
          style={{
            border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c",
            borderRadius: "10px", padding: "10px 12px", fontSize: "13px", lineHeight: "1.5",
          }}
        >
          Không thể tải tổng hợp đền bù. Vui lòng thử lại.
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {summaryCards.map((card, index) => (
              <div
                key={index}
                style={{
                  background: card.bgColor, border: `0.5px solid ${card.borderColor}30`,
                  borderRadius: "12px", padding: "18px 20px",
                  borderLeft: `4px solid ${card.borderColor}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      {card.label}
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: 800, color: card.color, marginTop: "6px" }}>
                      {card.value}
                    </div>
                    <div style={{ fontSize: "11px", color: card.color, fontWeight: 500, marginTop: "2px" }}>
                      {card.subtitle}
                    </div>
                  </div>
                  <div style={{ color: card.color, opacity: 0.4 }}>{card.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Shop compensation detail table */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", gap: "10px", flexWrap: "wrap" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>📊 Chi tiết đền bù theo Cửa hàng</div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: "10px", top: "8px", color: "#9ca3af" }} />
                  <input
                    style={{ padding: "6px 10px 6px 30px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "12px", width: "100%", maxWidth: "180px", outline: "none" }}
                    placeholder="Tìm cửa hàng..."
                    value={shopSearch}
                    onChange={(e) => setShopSearch(e.target.value)}
                    aria-label="Tìm cửa hàng đền bù"
                  />
                </div>
                <button
                  onClick={handleExportExcel}
                  style={{
                    display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px",
                    borderRadius: "8px", border: "1px solid #BFDBFE", background: "#EFF6FF",
                    fontSize: "12px", fontWeight: 600, color: "#2563EB", cursor: "pointer",
                  }}
                  aria-label="Xuất Excel chi tiết đền bù theo cửa hàng"
                >
                  <Download size={13} /> Xuất Excel
                </button>
              </div>
            </div>

            <div className="claims-compensation-shop-table" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e5e7eb" }}>
                    {SHOP_TABLE_HEADERS.map((header) => (
                      <th key={header} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredShops.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "#9ca3af" }}>Không có dữ liệu</td>
                    </tr>
                  ) : filteredShops.map((shop, index) => (
                    <tr
                      key={shop.shopName}
                      style={{ borderBottom: "1px solid #f1f5f9", background: index % 2 === 0 ? "#fff" : "#f9fafb" }}
                    >
                      <td style={{ padding: "8px 10px", fontWeight: 600, color: "#1e293b", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={shop.shopName}>
                        {shop.shopName}
                      </td>
                      <td style={{ padding: "8px 10px", fontWeight: 600 }}>{shop.totalClaims}</td>
                      <td style={{ padding: "8px 10px", color: "#2563eb", fontWeight: 600 }}>{shop.processing}</td>
                      <td style={{ padding: "8px 10px", color: "#16a34a", fontWeight: 600 }}>{shop.compensated}</td>
                      <td style={{ padding: "8px 10px", color: "#ea580c", fontWeight: 600 }}>{shop.rejected}</td>
                      <td style={{ padding: "8px 10px", color: "#d97706", fontWeight: 600 }}>{shop.pending}</td>
                      <td style={{ padding: "8px 10px", color: "#dc2626", fontWeight: 600 }}>{formatVND(shop.totalPaid)}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <button
                          onClick={() => setDetailShop(shop.shopName)}
                          style={{
                            display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px",
                            borderRadius: "6px", border: "1px solid #d1d5db", background: "#fff",
                            fontSize: "11px", fontWeight: 600, color: "#2563EB", cursor: "pointer",
                          }}
                          aria-label={`Xem chi tiết đền bù cửa hàng ${shop.shopName}`}
                        >
                          <ChevronRight size={12} /> Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {filteredShops.length > 0 && (
                  <tfoot>
                    <tr style={{ background: "#f1f5f9", borderTop: "1.5px solid #e5e7eb" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "#1e293b" }}>Tổng cộng</td>
                      <td style={{ padding: "8px 10px", fontWeight: 700 }}>{totals.totalClaims}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "#2563eb" }}>{totals.processing}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "#16a34a" }}>{totals.compensated}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "#ea580c" }}>{totals.rejected}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "#d97706" }}>{totals.pending}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "#dc2626" }}>{formatVND(totals.totalPaid)}</td>
                      <td style={{ padding: "8px 10px" }} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <div
              className="claims-compensation-shop-cards"
              data-testid="claims-compensation-shop-cards"
              style={{ display: "none", flexDirection: "column", gap: "10px" }}
            >
              {filteredShops.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px", color: "#9ca3af" }}>Không có dữ liệu</div>
              ) : filteredShops.map((shop) => (
                <article
                  key={`${shop.shopName}-card`}
                  style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px", background: "#fff" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {shop.shopName}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{shop.totalClaims} đơn vấn đề</div>
                    </div>
                    <button
                      onClick={() => setDetailShop(shop.shopName)}
                      style={{
                        display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px",
                        borderRadius: "6px", border: "1px solid #d1d5db", background: "#fff",
                        fontSize: "11px", fontWeight: 600, color: "#2563EB", cursor: "pointer", flexShrink: 0,
                      }}
                      aria-label={`Xem chi tiết đền bù cửa hàng ${shop.shopName}`}
                    >
                      <ChevronRight size={12} /> Xem chi tiết
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "10px" }}>
                    <div style={{ fontSize: "12px", color: "#2563eb" }}>Đang XL: <strong>{shop.processing}</strong></div>
                    <div style={{ fontSize: "12px", color: "#16a34a" }}>Đã ĐB KH: <strong>{shop.compensated}</strong></div>
                    <div style={{ fontSize: "12px", color: "#ea580c" }}>Từ chối ĐB: <strong>{shop.rejected}</strong></div>
                    <div style={{ fontSize: "12px", color: "#d97706" }}>Chờ ĐB: <strong>{shop.pending}</strong></div>
                    <div style={{ fontSize: "12px", color: "#dc2626", gridColumn: "1 / -1" }}>
                      Tiền ĐB KH: <strong>{formatVND(shop.totalPaid)}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* Charts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }} className="resp-grid-1-2">
            {/* Bar Chart: Monthly compensation */}
            <div style={cardStyle}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginBottom: "16px" }}>Tiền đền bù theo tháng</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.monthlyData || []} barGap={4}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: any) => `${(Number(v) / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: any, name: any) => [formatVND(Number(value)), name === "carrier" ? "NVC đền bù" : "Đền bù KH"]}
                    labelFormatter={(l: any) => `Tháng ${l}`}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                  />
                  <Legend
                    formatter={(v) => v === "carrier" ? "NVC đền bù" : "Đền bù KH"}
                    wrapperStyle={{ fontSize: "12px" }}
                  />
                  <Bar dataKey="carrier" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="customer" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart: Issue type distribution */}
            <div style={cardStyle}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginBottom: "16px" }}>Đơn KN theo loại vấn đề</div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={(data.issueDistribution || []).filter((entry) => entry.count > 0)}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={45}
                    dataKey="count"
                    nameKey="label"
                    label={({ label, percent }: any) => `${label} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ strokeWidth: 1 }}
                    style={{ fontSize: "11px" }}
                  >
                    {(data.issueDistribution || []).filter((entry) => entry.count > 0).map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [value + " đơn", name]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {detailShop && (
        <ShopClaimsDetailModal
          shopName={detailShop}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onClose={() => setDetailShop(null)}
        />
      )}
    </div>
  );
}
