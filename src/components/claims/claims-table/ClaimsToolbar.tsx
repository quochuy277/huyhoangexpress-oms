import { Download, Loader2, Plus, ShieldAlert, Zap } from "lucide-react";

type ClaimsToolbarProps = {
  detecting: boolean;
  exporting: boolean;
  canCreateClaim: boolean;
  canUpdateClaim: boolean;
  onRunAutoDetect: () => void;
  onExport: () => void;
  onOpenAddDialog: () => void;
  primaryBtnStyle: React.CSSProperties;
};

export function ClaimsToolbar({
  detecting,
  exporting,
  canCreateClaim,
  canUpdateClaim,
  onRunAutoDetect,
  onExport,
  onOpenAddDialog,
  primaryBtnStyle,
}: ClaimsToolbarProps) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", gap: "8px" }}>
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", display: "flex", alignItems: "center", gap: "10px" }}>
          <ShieldAlert size={24} className="text-blue-600" />
          Đơn Có Vấn Đề
        </h1>
        <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>
          Quản lý khiếu nại, bồi hoàn và các đơn hàng có vấn đề
        </p>
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          onClick={onRunAutoDetect}
          disabled={detecting || !canUpdateClaim}
          style={{
            display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px",
            border: "1px solid #d1d5db", borderRadius: "8px", background: "#fff",
            fontSize: "13px", fontWeight: 500, cursor: canUpdateClaim ? "pointer" : "not-allowed", color: "#374151",
            opacity: canUpdateClaim ? 1 : 0.55,
          }}
          aria-label="Quet tu dong don co van de"
        >
          {detecting ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />}
          Quét tự động
        </button>
        <button
          onClick={onExport}
          disabled={exporting}
          style={{
            display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px",
            border: "1px solid #d1d5db", borderRadius: "8px", background: "#fff",
            fontSize: "13px", fontWeight: 500, cursor: "pointer", color: "#374151",
          }}
        >
          {exporting ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
          Xuất Excel
        </button>
        <button
          onClick={onOpenAddDialog}
          disabled={!canCreateClaim}
          style={{ ...primaryBtnStyle, padding: "8px 16px", fontSize: "13px", opacity: canCreateClaim ? 1 : 0.55, cursor: canCreateClaim ? "pointer" : "not-allowed" }}
          aria-label="Them moi don co van de"
        >
          <Plus size={14} /> Thêm mới
        </button>
      </div>
    </div>
  );
}
