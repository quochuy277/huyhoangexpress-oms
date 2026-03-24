"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { OrderDetailDialog } from "@/components/shared/OrderDetailDialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";

const PERIODS = [
  { value: "month", label: "Tháng này" }, { value: "last_month", label: "Tháng trước" },
  { value: "quarter", label: "Quý này" }, { value: "year", label: "Năm nay" }, { value: "custom", label: "Tùy chọn" },
];
const VIEWS = [
  { id: "carrier", label: "Theo Đối tác" }, { id: "shop", label: "Theo Cửa hàng" }, { id: "negative", label: "Đơn doanh thu âm" },
];
const LINE_COLORS = ["#2563eb", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];
const fmtVND = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ";

export default function AnalysisTab() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const viewParam = searchParams.get("view") || "carrier";
  const shopParam = searchParams.get("shop") || "";
  const [view, setView] = useState(viewParam);
  const [period, setPeriod] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [carriers, setCarriers] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartShops, setChartShops] = useState<string[]>([]);
  const [granularity, setGranularity] = useState("day");
  const [negData, setNegData] = useState<any>(null);
  const [shopSearch, setShopSearch] = useState(shopParam);
  const [detailRequestCode, setDetailRequestCode] = useState<string | null>(null);

  useEffect(() => { setView(viewParam); }, [viewParam]);

  const switchView = (v: string) => {
    setView(v);
    const p = new URLSearchParams(searchParams.toString());
    p.set("view", v);
    if (v !== "shop") p.delete("shop");
    router.push(`/finance?tab=analysis&${p.toString()}`, { scroll: false });
  };

  const fetchCarriers = useCallback(async () => {
    const cp = period === "custom" && customFrom && customTo ? `&from=${customFrom}&to=${customTo}` : "";
    const r = await fetch(`/api/finance/carriers?period=${period}${cp}`);
    const d = await r.json(); setCarriers(d.carriers || []);
  }, [period, customFrom, customTo]);

  const fetchShops = useCallback(async () => {
    const cp = period === "custom" && customFrom && customTo ? `&from=${customFrom}&to=${customTo}` : "";
    const url = shopSearch ? `/api/finance/shops?period=${period}&shop=${encodeURIComponent(shopSearch)}${cp}` : `/api/finance/shops?period=${period}${cp}`;
    const [shopsRes, trendsRes] = await Promise.all([fetch(url).then(r => r.json()), fetch("/api/finance/shop-trends").then(r => r.json())]);
    setShops(shopsRes.shops || []);
    setTrends(trendsRes.trends || []);
    // Load chart for top 5
    const top5 = (shopsRes.shops || []).slice(0, 5).map((s: any) => s.shop);
    setChartShops(top5);
    if (top5.length > 0) {
      const cr = await fetch(`/api/finance/shop-chart?shops=${encodeURIComponent(top5.join(","))}&granularity=${granularity}`);
      const cd = await cr.json(); setChartData(cd.chartData || []);
    }
  }, [period, shopSearch, granularity, customFrom, customTo]);

  const fetchNeg = useCallback(async () => {
    const cp = period === "custom" && customFrom && customTo ? `&from=${customFrom}&to=${customTo}` : "";
    const r = await fetch(`/api/finance/negative-revenue?period=${period}${cp}`);
    setNegData(await r.json());
  }, [period, customFrom, customTo]);

  useEffect(() => { if (view === "carrier") fetchCarriers(); else if (view === "shop") fetchShops(); else fetchNeg(); }, [view, fetchCarriers, fetchShops, fetchNeg]);

  const updateChart = async (shops: string[], gran: string) => {
    if (shops.length === 0) { setChartData([]); return; }
    const r = await fetch(`/api/finance/shop-chart?shops=${encodeURIComponent(shops.join(","))}&granularity=${gran}`);
    const d = await r.json(); setChartData(d.chartData || []);
  };

  const trendMap: Record<string, any> = {};
  trends.forEach(t => { trendMap[t.shopName] = t; });
  const getTrend = (shopName: string) => trendMap[shopName];

  const cardStyle: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: "16px 20px", borderLeft: "4px solid #2563eb", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", flex: "1 1 200px" };
  const tableHeaderStyle: React.CSSProperties = { padding: 10, textAlign: "left", borderBottom: "2px solid #e2e8f0", background: "#f8fafc", fontSize: 12, fontWeight: 700 };

  return (
    <>
    <div>
      {/* Period + View toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)} style={{
              padding: "6px 14px", borderRadius: 8, border: "1px solid #e2e8f0", cursor: "pointer",
              background: period === p.value ? "#2563eb" : "#fff", color: period === p.value ? "#fff" : "#64748b", fontWeight: 600, fontSize: 13,
            }}>{p.label}</button>
          ))}
        </div>
        {period === "custom" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Từ:</label>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13 }} />
            <label style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Đến:</label>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13 }} />
          </div>
        )}
        <div style={{ display: "flex", gap: 4 }}>
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => switchView(v.id)} style={{
              padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", cursor: "pointer",
              background: view === v.id ? "#2563eb" : "#fff", color: view === v.id ? "#fff" : "#64748b", fontWeight: 600, fontSize: 13,
            }}>{v.label}</button>
          ))}
        </div>
      </div>

      {/* VIEW 1: Carrier */}
      {view === "carrier" && (
        <>
          <div style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflowX: "auto" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📊 So sánh Đối tác</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr>
                <th style={tableHeaderStyle}>#</th><th style={tableHeaderStyle}>Đối Tác</th><th style={tableHeaderStyle}>Số Đơn</th>
                <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Tổng Phí Thu KH</th><th style={{ ...tableHeaderStyle, textAlign: "right" }}>Phí Đối Tác</th>
                <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Doanh Thu</th><th style={{ ...tableHeaderStyle, textAlign: "center" }}>Margin %</th>
                <th style={{ ...tableHeaderStyle, textAlign: "center" }}>Đơn Lỗ</th><th style={{ ...tableHeaderStyle, textAlign: "right" }}>COD Tổng</th>
              </tr></thead>
              <tbody>
                {carriers.map((c, i) => (
                  <tr key={c.carrier} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: 8 }}>{i + 1}</td>
                    <td style={{ padding: 8, fontWeight: 600 }}>{c.carrier}</td>
                    <td style={{ padding: 8 }}>{c.orderCount.toLocaleString()}</td>
                    <td style={{ padding: 8, textAlign: "right" }}>{fmtVND(c.totalFee)}</td>
                    <td style={{ padding: 8, textAlign: "right", color: "#ef4444" }}>{fmtVND(c.carrierFee)}</td>
                    <td style={{ padding: 8, textAlign: "right", color: "#10b981", fontWeight: 600 }}>{fmtVND(c.revenue)}</td>
                    <td style={{ padding: 8, textAlign: "center", color: c.margin >= 10 ? "#10b981" : c.margin >= 5 ? "#f59e0b" : "#ef4444", fontWeight: 600 }}>{c.margin}%</td>
                    <td style={{ padding: 8, textAlign: "center", color: c.negativeCount > 0 ? "#ef4444" : "#94a3b8" }}>{c.negativeCount}</td>
                    <td style={{ padding: 8, textAlign: "right" }}>{fmtVND(c.codTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {carriers.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📊 Biểu đồ so sánh</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={carriers}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="carrier" fontSize={12} /><YAxis fontSize={11} tickFormatter={(v: any) => `${Math.round(v / 1e6)}M`} /><Tooltip formatter={(v: any) => fmtVND(Number(v))} /><Legend /><Bar dataKey="totalFee" name="Tổng Phí" fill="#2563eb" /><Bar dataKey="carrierFee" name="Phí ĐT" fill="#ef4444" /><Bar dataKey="revenue" name="Doanh Thu" fill="#10b981" /></BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* VIEW 2: Shop */}
      {view === "shop" && (
        <>
          <div style={{ marginBottom: 16 }}>
            <input placeholder="🔍 Tìm cửa hàng..." value={shopSearch} onChange={e => setShopSearch(e.target.value)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #d1d5db", width: "100%", maxWidth: 300, fontSize: 14 }} />
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflowX: "auto" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🏪 Xếp hạng Cửa hàng</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr>
                <th style={tableHeaderStyle}>#</th><th style={tableHeaderStyle}>Cửa Hàng</th><th style={{ ...tableHeaderStyle, textAlign: "center" }}>Xu Hướng</th>
                <th style={tableHeaderStyle}>Số Đơn</th><th style={{ ...tableHeaderStyle, textAlign: "right" }}>Doanh Thu</th>
                <th style={{ ...tableHeaderStyle, textAlign: "center" }}>Giao TC %</th><th style={{ ...tableHeaderStyle, textAlign: "center" }}>Hoàn %</th>
                <th style={{ ...tableHeaderStyle, textAlign: "right" }}>COD Tổng</th><th style={{ ...tableHeaderStyle, textAlign: "right" }}>TB Phí/Đơn</th>
              </tr></thead>
              <tbody>
                {shops.map((s, i) => {
                  const tr = getTrend(s.shop);
                  let trendEl = <span style={{ color: "#94a3b8" }}>—</span>;
                  if (tr) {
                    if (tr.alertLevel === "new") trendEl = <span style={{ background: "#dbeafe", color: "#2563eb", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>🆕 Mới</span>;
                    else if (tr.alertLevel === "growing") trendEl = <span style={{ color: "#10b981" }}>↑ +{tr.changePercent}%</span>;
                    else if (tr.alertLevel === "stable") trendEl = <span style={{ color: "#94a3b8" }}>→ {tr.changePercent > 0 ? "+" : ""}{tr.changePercent}%</span>;
                    else if (tr.alertLevel === "warning") trendEl = <span style={{ color: "#ef4444" }}>↓ {tr.changePercent}%</span>;
                    else if (tr.alertLevel === "critical") trendEl = <span style={{ color: "#ef4444", fontWeight: 700 }}>↓ {tr.changePercent}%</span>;
                  }
                  return (
                    <tr key={s.shop} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: 8 }}>{i + 1}</td>
                      <td style={{ padding: 8, fontWeight: 600 }}>{s.shop}</td>
                      <td style={{ padding: 8, textAlign: "center" }}>{trendEl}</td>
                      <td style={{ padding: 8 }}>{s.total.toLocaleString()}</td>
                      <td style={{ padding: 8, textAlign: "right", fontWeight: 600, color: "#10b981" }}>{fmtVND(s.revenue)}</td>
                      <td style={{ padding: 8, textAlign: "center" }}>{s.deliveryRate}%</td>
                      <td style={{ padding: 8, textAlign: "center", color: s.returnRate >= 20 ? "#ef4444" : "#1e293b" }}>{s.returnRate}%</td>
                      <td style={{ padding: 8, textAlign: "right" }}>{fmtVND(s.codTotal)}</td>
                      <td style={{ padding: 8, textAlign: "right" }}>{fmtVND(s.avgFee)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Shop trend chart */}
          {chartData.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>📈 Xu hướng đơn hàng — Top shops</h3>
                <div style={{ display: "flex", gap: 4 }}>
                  {["day", "week", "month"].map(g => (
                    <button key={g} onClick={() => { setGranularity(g); updateChart(chartShops, g); }} style={{
                      padding: "4px 10px", borderRadius: 6, border: "1px solid #e2e8f0", cursor: "pointer", fontSize: 12,
                      background: granularity === g ? "#2563eb" : "#fff", color: granularity === g ? "#fff" : "#64748b",
                    }}>{g === "day" ? "Ngày" : g === "week" ? "Tuần" : "Tháng"}</button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend />
                  {chartShops.map((shop, i) => <Line key={shop} type="monotone" dataKey={shop} stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2} dot={false} />)}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Drop alerts */}
          <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>⚠ Cảnh báo shop giảm đơn</h3>
            {(() => {
              const critical = trends.filter(t => t.alertLevel === "critical");
              const warning = trends.filter(t => t.alertLevel === "warning");
              if (critical.length === 0 && warning.length === 0) return <div style={{ padding: 16, color: "#10b981", textAlign: "center" }}>✅ Tất cả shop đang ổn định — không có shop nào giảm trên 30%.</div>;
              return (
                <>
                  {critical.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", marginBottom: 8 }}>🔴 Giảm mạnh (≥50%)</div>
                      {critical.map(t => (
                        <div key={t.shopName} style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 6 }}>
                          <div style={{ fontWeight: 600 }}>{t.shopName}</div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>2 tuần trước: {t.previousCount} đơn → 2 tuần gần: {t.recentCount} <span style={{ color: "#ef4444", fontWeight: 700 }}>↓ {t.changePercent}%</span></div>
                        </div>
                      ))}
                    </div>
                  )}
                  {warning.length > 0 && (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 8 }}>🟡 Giảm (30-50%)</div>
                      {warning.map(t => (
                        <div key={t.shopName} style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", marginBottom: 6 }}>
                          <div style={{ fontWeight: 600 }}>{t.shopName}</div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>2 tuần trước: {t.previousCount} đơn → 2 tuần gần: {t.recentCount} <span style={{ color: "#f59e0b" }}>↓ {t.changePercent}%</span></div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </>
      )}

      {/* VIEW 3: Negative Revenue */}
      {view === "negative" && negData && (
        <>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
            <div style={{ ...cardStyle, borderLeftColor: "#ef4444" }}><div style={{ fontSize: 12, color: "#64748b" }}>Tổng đơn lỗ</div><div style={{ fontSize: 22, fontWeight: 700, color: "#ef4444" }}>{negData.summary.totalOrders}</div></div>
            <div style={{ ...cardStyle, borderLeftColor: "#ef4444" }}><div style={{ fontSize: 12, color: "#64748b" }}>Tổng số tiền lỗ</div><div style={{ fontSize: 22, fontWeight: 700, color: "#ef4444" }}>{fmtVND(negData.summary.totalLoss)}</div></div>
            <div style={cardStyle}><div style={{ fontSize: 12, color: "#64748b" }}>ĐT nhiều đơn lỗ nhất</div><div style={{ fontSize: 18, fontWeight: 700 }}>{negData.summary.topCarrier}</div></div>
            <div style={cardStyle}><div style={{ fontSize: 12, color: "#64748b" }}>Lý do phổ biến</div><div style={{ fontSize: 18, fontWeight: 700 }}>{negData.summary.topReason}</div></div>
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr>
                <th style={tableHeaderStyle}>#</th><th style={tableHeaderStyle}>Mã Yêu Cầu</th><th style={tableHeaderStyle}>Đối Tác</th>
                <th style={tableHeaderStyle}>Cửa Hàng</th><th style={tableHeaderStyle}>Trạng Thái</th>
                <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Tổng Phí</th><th style={{ ...tableHeaderStyle, textAlign: "right" }}>Phí ĐT</th>
                <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Doanh Thu</th><th style={{ ...tableHeaderStyle, textAlign: "right" }}>COD</th>
                <th style={tableHeaderStyle}>Vùng Miền</th>
              </tr></thead>
              <tbody>
                {(negData.orders || []).map((o: any, i: number) => (
                  <tr key={o.requestCode} style={{ borderBottom: "1px solid #f1f5f9", borderLeft: i === 0 ? "3px solid #ef4444" : "none" }}>
                    <td style={{ padding: 8 }}>{i + 1}</td>
                    <td style={{ padding: 8, fontWeight: 600, color: "#2563eb", cursor: "pointer" }} onClick={() => setDetailRequestCode(o.requestCode)}>{o.requestCode}</td>
                    <td style={{ padding: 8 }}>{o.carrierName}</td>
                    <td style={{ padding: 8 }}>{o.creatorShopName}</td>
                    <td style={{ padding: 8 }}>{o.status}</td>
                    <td style={{ padding: 8, textAlign: "right" }}>{fmtVND(o.totalFee || 0)}</td>
                    <td style={{ padding: 8, textAlign: "right" }}>{fmtVND(o.carrierFee || 0)}</td>
                    <td style={{ padding: 8, textAlign: "right", color: "#ef4444", fontWeight: 700 }}>{fmtVND(o.revenue || 0)}</td>
                    <td style={{ padding: 8, textAlign: "right" }}>{fmtVND(o.codAmount || 0)}</td>
                    <td style={{ padding: 8, fontSize: 12 }}>{o.regionGroup || "—"}</td>
                  </tr>
                ))}
                {(negData.orders || []).length === 0 && <tr><td colSpan={10} style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>Không có đơn doanh thu âm</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>

    {/* Order Detail Dialog */}
    <OrderDetailDialog
      requestCode={detailRequestCode}
      open={!!detailRequestCode}
      onClose={() => setDetailRequestCode(null)}
      userRole="ADMIN"
    />
    </>
  );
}
