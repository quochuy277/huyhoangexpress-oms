"use client";

import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp, TrendingDown, DollarSign, AlertCircle, Download,
  Loader2, ChevronDown, ChevronRight, Search,
} from "lucide-react";
import { CLAIMS_MOBILE_BREAKPOINT } from "@/components/claims/claims-table/claimsResponsive";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const cardStyle: React.CSSProperties = {
  background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "12px",
  padding: "16px 20px",
};

const PERIOD_OPTIONS = [
  { value: "month", label: "Tháng này" },
  { value: "last_month", label: "Tháng trước" },
  { value: "quarter", label: "Quý này" },
  { value: "half", label: "6 tháng" },
  { value: "year", label: "Năm nay" },
  { value: "all", label: "Tất cả" },
];

const formatVND = (n: number) => n.toLocaleString("vi-VN") + "đ";

export default function ClaimsCompensationTab() {
  const [period, setPeriod] = useState("month");
  const [expandedShop, setExpandedShop] = useState<string | null>(null);
  const [shopSearch, setShopSearch] = useState("");

  const { data, isLoading: loading } = useQuery({
    queryKey: ["claims-compensation", period],
    queryFn: async () => {
      const res = await fetch(`/api/claims/compensation?period=${period}`);
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 phút cache
  });

  const handleExportExcel = () => {
    if (!data?.shops) return;
    const headers = ["STT", "Cửa Hàng", "Số Đơn VĐ", "Đang Xử Lý", "Đã ĐB KH", "Từ Chối ĐB", "Tổng Tiền Đã ĐB", "Tổng Tiền Chờ ĐB"];
    const rows = data.shops.map((s: any, i: number) => [
      i + 1, s.shopName, s.totalClaims, s.processing, s.compensated, s.rejected,
      s.totalPaid, s.totalPending,
    ]);
    const csv = [headers.join(","), ...rows.map((r: any[]) => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `doi-soat-den-bu-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "80px", color: "#6b7280" }}>
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  if (!data) return null;

  const { summary, shops, monthlyData, issueDistribution } = data;
  const filteredShops = (shops || []).filter((s: any) =>
    !shopSearch || s.shopName.toLowerCase().includes(shopSearch.toLowerCase())
  );

  const summaryCards = [
    {
      label: "Tổng tiền NVC đã đền bù",
      value: formatVND(summary?.carrierTotal || 0),
      subtitle: `${summary?.carrierCount || 0} đơn`,
      color: "#16a34a", bgColor: "#f0fdf4", borderColor: "#16a34a",
      icon: <TrendingUp size={20} />,
    },
    {
      label: "Tổng tiền đã đền bù KH",
      value: formatVND(summary?.customerTotal || 0),
      subtitle: `${summary?.customerCount || 0} đơn`,
      color: "#dc2626", bgColor: "#fef2f2", borderColor: "#dc2626",
      icon: <TrendingDown size={20} />,
    },
    {
      label: "Chênh lệch (Lời/Lỗ)",
      value: formatVND(Math.abs(summary?.difference || 0)),
      subtitle: (summary?.difference || 0) >= 0 ? `Lời ${formatVND(summary?.difference || 0)}` : `Lỗ ${formatVND(Math.abs(summary?.difference || 0))}`,
      color: (summary?.difference || 0) >= 0 ? "#2563eb" : "#dc2626",
      bgColor: (summary?.difference || 0) >= 0 ? "#eff6ff" : "#fef2f2",
      borderColor: (summary?.difference || 0) >= 0 ? "#2563eb" : "#dc2626",
      icon: <DollarSign size={20} />,
    },
    {
      label: "Đơn chờ đền bù KH",
      value: String(summary?.pendingCount || 0),
      subtitle: "Cần xử lý",
      color: "#d97706", bgColor: "#fffbeb", borderColor: "#d97706",
      icon: <AlertCircle size={20} />,
    },
  ];

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
      {/* Period filter */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <select
          value={period}
          onChange={e => setPeriod(e.target.value)}
          style={{
            padding: "7px 12px", border: "1.5px solid #2563EB", borderRadius: "8px",
            fontSize: "13px", fontWeight: 600, color: "#2563EB", background: "#eff6ff",
            cursor: "pointer", outline: "none",
          }}
        >
          {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((c, i) => (
          <div key={i} style={{
            background: c.bgColor, border: `0.5px solid ${c.borderColor}30`,
            borderRadius: "12px", padding: "18px 20px",
            borderLeft: `4px solid ${c.borderColor}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>{c.label}</div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: c.color, marginTop: "6px" }}>{c.value}</div>
                <div style={{ fontSize: "11px", color: c.color, fontWeight: 500, marginTop: "2px" }}>{c.subtitle}</div>
              </div>
              <div style={{ color: c.color, opacity: 0.4 }}>{c.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Shop compensation table */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>📊 Đối soát theo Cửa hàng</div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", width: "100%", justifyContent: "flex-end" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "8px", color: "#9ca3af" }} />
              <input
                style={{ padding: "6px 10px 6px 30px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "12px", width: "100%", maxWidth: "180px", outline: "none" }}
                placeholder="Tìm cửa hàng..."
                value={shopSearch}
                onChange={e => setShopSearch(e.target.value)}
                aria-label="Tìm cửa hàng bồi hoàn"
              />
            </div>
            <button onClick={handleExportExcel} style={{
              display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px",
              borderRadius: "8px", border: "1px solid #BFDBFE", background: "#EFF6FF",
              fontSize: "12px", fontWeight: 600, color: "#2563EB", cursor: "pointer",
            }} aria-label="Xuất Excel đối soát đền bù">
              <Download size={13} /> Xuất Excel
            </button>
          </div>
        </div>

        <div className="claims-compensation-shop-table" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e5e7eb" }}>
                {["Cửa Hàng", "Số Đơn VĐ", "Đang Xử Lý", "Đã ĐB KH", "Từ Chối ĐB", "Tổng Tiền Đã ĐB", "Tổng Tiền Chờ ĐB", "Chi Tiết"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#475569" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredShops.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "#9ca3af" }}>Không có dữ liệu</td></tr>
              ) : filteredShops.map((s: any, i: number) => (
                <Fragment key={s.shopName}>
                  <tr key={`${s.shopName}-row`} style={{ borderBottom: expandedShop === s.shopName ? "none" : "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                    <td style={{ padding: "8px 10px", fontWeight: 600, color: "#1e293b", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.shopName}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 600 }}>{s.totalClaims}</td>
                    <td style={{ padding: "8px 10px" }}>{s.processing}</td>
                    <td style={{ padding: "8px 10px", color: "#16a34a", fontWeight: 600 }}>{s.compensated}</td>
                    <td style={{ padding: "8px 10px", color: "#dc2626", fontWeight: 600 }}>{s.rejected}</td>
                    <td style={{ padding: "8px 10px", color: "#16a34a", fontWeight: 600 }}>{formatVND(s.totalPaid)}</td>
                    <td style={{ padding: "8px 10px", color: "#d97706", fontWeight: 600 }}>{formatVND(s.totalPending)}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <button
                        onClick={() => setExpandedShop(expandedShop === s.shopName ? null : s.shopName)}
                        style={{
                          display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px",
                          borderRadius: "6px", border: "1px solid #d1d5db", background: "#fff",
                          fontSize: "11px", fontWeight: 600, color: "#2563EB", cursor: "pointer",
                        }}
                        aria-label={`Xem cửa hàng ${s.shopName}`}
                      >
                        {expandedShop === s.shopName ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        Xem
                      </button>
                    </td>
                  </tr>
                  {expandedShop === s.shopName && (
                    <tr key={`${s.shopName}-detail`} style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      <td colSpan={8} style={{ padding: "12px 14px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "12px" }} className="resp-grid-1-2">
                          <div><strong style={{ display: "block", color: "#1e293b" }}>Tổng đơn</strong><span style={{ fontSize: "12px", color: "#64748b" }}>{s.totalClaims} đơn vấn đề</span></div>
                          <div><strong style={{ display: "block", color: "#1e293b" }}>Đang xử lý</strong><span style={{ fontSize: "12px", color: "#64748b" }}>{s.processing} đơn</span></div>
                          <div><strong style={{ display: "block", color: "#1e293b" }}>Đã đền bù KH</strong><span style={{ fontSize: "12px", color: "#16a34a" }}>{formatVND(s.totalPaid)}</span></div>
                          <div><strong style={{ display: "block", color: "#1e293b" }}>Chờ xử lý</strong><span style={{ fontSize: "12px", color: "#d97706" }}>{formatVND(s.totalPending)}</span></div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="claims-compensation-shop-cards" data-testid="claims-compensation-shop-cards" style={{ display: "none", flexDirection: "column", gap: "10px" }}>
          {filteredShops.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px", color: "#9ca3af" }}>Không có dữ liệu</div>
          ) : filteredShops.map((s: any) => (
            <article key={`${s.shopName}-card`} style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px", background: "#fff" }}>
              <button
                onClick={() => setExpandedShop(expandedShop === s.shopName ? null : s.shopName)}
                style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
                aria-label={`Xem cửa hàng ${s.shopName}`}
              >
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>{s.shopName}</div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{s.totalClaims} đơn vấn đề</div>
                </div>
                {expandedShop === s.shopName ? <ChevronDown size={16} color="#2563EB" /> : <ChevronRight size={16} color="#2563EB" />}
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "10px" }}>
                <div style={{ fontSize: "12px", color: "#475569" }}>Đang xử lý: <strong>{s.processing}</strong></div>
                <div style={{ fontSize: "12px", color: "#475569" }}>Đã ĐB KH: <strong>{s.compensated}</strong></div>
                <div style={{ fontSize: "12px", color: "#16a34a" }}>Đã trả: <strong>{formatVND(s.totalPaid)}</strong></div>
                <div style={{ fontSize: "12px", color: "#d97706" }}>Chờ xử lý: <strong>{formatVND(s.totalPending)}</strong></div>
              </div>
              {expandedShop === s.shopName && (
                <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #e5e7eb", fontSize: "12px", color: "#64748b", lineHeight: "1.5" }}>
                  <div>Từ chối đền bù: <strong style={{ color: "#dc2626" }}>{s.rejected}</strong></div>
                  <div>Tổng shop payout theo kỳ đã chọn: <strong style={{ color: "#1e293b" }}>{formatVND(s.totalPaid + s.totalPending)}</strong></div>
                </div>
              )}
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
            <BarChart data={monthlyData || []} barGap={4}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: any) => `${(Number(v) / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: any, name: any) => [formatVND(Number(value)), name === "carrier" ? "NVC đền bù" : "Đền bù KH"]}
                labelFormatter={(l: any) => `Tháng ${l}`}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }}
              />
              <Legend
                formatter={v => v === "carrier" ? "NVC đền bù" : "Đền bù KH"}
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
                data={(issueDistribution || []).filter((d: any) => d.count > 0)}
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
                {(issueDistribution || []).filter((d: any) => d.count > 0).map((d: any, index: number) => (
                  <Cell key={index} fill={d.color} />
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
    </div>
  );
}
