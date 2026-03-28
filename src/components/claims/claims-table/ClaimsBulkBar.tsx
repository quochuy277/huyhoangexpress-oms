type ClaimsBulkBarProps = {
  selectedCount: number;
  bulkProcessing: boolean;
  canUpdateClaim: boolean;
  canDeleteClaim: boolean;
  issueTypeConfig: Record<string, { label: string }>;
  claimStatusConfig: Record<string, { label: string }>;
  onBulkAction: (field: string, value: string) => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
};

export function ClaimsBulkBar({
  selectedCount,
  bulkProcessing,
  canUpdateClaim,
  canDeleteClaim,
  issueTypeConfig,
  claimStatusConfig,
  onBulkAction,
  onBulkDelete,
  onClearSelection,
}: ClaimsBulkBarProps) {
  if (selectedCount <= 0 || (!canUpdateClaim && !canDeleteClaim)) {
    return null;
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px",
      marginBottom: "10px", background: "#eff6ff", border: "1.5px solid #93c5fd",
      borderRadius: "10px", fontSize: "13px", flexWrap: "wrap",
    }}>
      <span style={{ fontWeight: 700, color: "#1d4ed8" }}>
        ✓ Đã chọn {selectedCount} đơn
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "12px", color: "#4b5563" }}>Loại VĐ:</span>
        <select
          onChange={(event) => {
            if (event.target.value) {
              onBulkAction("issueType", event.target.value);
              event.target.value = "";
            }
          }}
          disabled={bulkProcessing || !canUpdateClaim}
          style={{
            border: "1px solid #93c5fd", borderRadius: "6px", padding: "4px 8px",
            fontSize: "12px", background: "#fff", cursor: "pointer", outline: "none",
          }}
        >
          <option value="">— Chọn —</option>
          {Object.entries(issueTypeConfig).map(([key, value]) => (
            <option key={key} value={key}>{value.label}</option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "12px", color: "#4b5563" }}>TT Xử Lý:</span>
        <select
          onChange={(event) => {
            if (event.target.value) {
              onBulkAction("claimStatus", event.target.value);
              event.target.value = "";
            }
          }}
          disabled={bulkProcessing || !canUpdateClaim}
          style={{
            border: "1px solid #93c5fd", borderRadius: "6px", padding: "4px 8px",
            fontSize: "12px", background: "#fff", cursor: "pointer", outline: "none",
          }}
        >
          <option value="">— Chọn —</option>
          {Object.entries(claimStatusConfig).map(([key, value]) => (
            <option key={key} value={key}>{value.label}</option>
          ))}
        </select>
      </div>
      <button
        onClick={onBulkDelete}
        disabled={bulkProcessing || !canDeleteClaim}
        style={{
          display: "flex", alignItems: "center", gap: "4px", padding: "5px 12px",
          border: "1px solid #fca5a5", borderRadius: "6px", background: "#fef2f2",
          color: "#dc2626", fontSize: "12px", fontWeight: 600, cursor: "pointer",
        }}
      >
        Xóa {selectedCount} đơn
      </button>
      <button
        onClick={onClearSelection}
        style={{
          background: "none", border: "none", color: "#6b7280", fontSize: "12px",
          cursor: "pointer", textDecoration: "underline",
        }}
      >
        Bỏ chọn
      </button>
    </div>
  );
}
