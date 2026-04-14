"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PERMISSION_CATEGORIES, PERMISSION_KEYS } from "@/lib/permissions";
import {
  PermGroupRow,
  overlayStyle, dialogBase, headerStyle, titleStyle, closeBtnBase,
  labelStyle, inputStyle, footerStyle, cancelBtnStyle, primaryBtnStyle,
  dangerBtnStyle, iFocus, iBlur, closeHoverIn, closeHoverOut,
} from "./admin-shared";

/* ================================================================== */
/* PermissionsTab                                                      */
/* ================================================================== */
export default function PermissionsTab() {
  const [groups, setGroups] = useState<PermGroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editGroup, setEditGroup] = useState<PermGroupRow | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteGroup, setDeleteGroup] = useState<PermGroupRow | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/permission-groups");
      if (res.ok) setGroups(await res.json());
    } catch (err) { console.warn("[PermissionsTab] Failed to fetch permission groups:", err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  return (
    <div className="space-y-4">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: "13px", color: "#6b7280" }}>{groups.length} nh\u00f3m quy\u1ec1n</p>
        <button onClick={() => setShowAdd(true)} style={{ ...primaryBtnStyle, padding: "8px 18px" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#1d4ed8"}
          onMouseLeave={(e) => e.currentTarget.style.background = "#2563EB"}
        >
          <Plus className="w-4 h-4" /> Th\u00eam nh\u00f3m quy\u1ec1n
        </button>
      </div>

      <div style={{ background: "#FFFFFF", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
        <Table>
          <TableHeader>
            <TableRow style={{ background: "#f9fafb" }}>
              <TableHead className="text-xs">T\u00ean nh\u00f3m</TableHead>
              <TableHead className="text-xs">M\u00f4 t\u1ea3</TableHead>
              <TableHead className="text-xs w-[100px] text-center">S\u1ed1 nh\u00e2n vi\u00ean</TableHead>
              <TableHead className="text-xs w-[100px]">Thao t\u00e1c</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "#9ca3af" }} /></TableCell></TableRow>
            ) : groups.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-32 text-center" style={{ color: "#9ca3af" }}>Ch\u01b0a c\u00f3 nh\u00f3m quy\u1ec1n</TableCell></TableRow>
            ) : (
              groups.map(g => (
                <TableRow key={g.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <TableCell style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}>
                    {g.name}
                    {g.isSystemGroup && <span style={{ marginLeft: "8px", fontSize: "10px", padding: "2px 6px", background: "#f3f4f6", color: "#6b7280", borderRadius: "4px" }}>H\u1ec7 th\u1ed1ng</span>}
                  </TableCell>
                  <TableCell style={{ fontSize: "12px", color: "#6b7280" }}>{g.description || "\u2014"}</TableCell>
                  <TableCell className="text-center" style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}>{g._count.users}</TableCell>
                  <TableCell>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button onClick={() => setEditGroup(g)} style={{ padding: "5px", borderRadius: "6px", border: "none", background: "transparent", cursor: "pointer", color: "#2563EB", transition: "background 0.2s" }} title="S\u1eeda"
                        onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      ><Pencil className="w-3.5 h-3.5" /></button>
                      <button
                        onClick={() => !g.isSystemGroup && g._count.users === 0 && setDeleteGroup(g)}
                        disabled={g.isSystemGroup || g._count.users > 0}
                        style={{
                          padding: "5px", borderRadius: "6px", border: "none", background: "transparent", transition: "background 0.2s",
                          cursor: g.isSystemGroup || g._count.users > 0 ? "not-allowed" : "pointer",
                          color: g.isSystemGroup || g._count.users > 0 ? "#d1d5db" : "#dc2626",
                          opacity: g.isSystemGroup || g._count.users > 0 ? 0.5 : 1,
                        }}
                        title={g.isSystemGroup ? "Kh\u00f4ng th\u1ec3 x\u00f3a nh\u00f3m h\u1ec7 th\u1ed1ng" : g._count.users > 0 ? `\u0110ang c\u00f3 ${g._count.users} nh\u00e2n vi\u00ean` : "X\u00f3a"}
                      ><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {(showAdd || editGroup) && <PermGroupFormDialog group={editGroup} onClose={() => { setShowAdd(false); setEditGroup(null); }} onSaved={fetchGroups} />}
      {deleteGroup && <DeleteGroupDialog group={deleteGroup} onClose={() => setDeleteGroup(null)} onDeleted={fetchGroups} />}
    </div>
  );
}

/* ================================================================== */
/* PermGroupFormDialog                                                 */
/* ================================================================== */
function PermGroupFormDialog({ group, onClose, onSaved }: {
  group: PermGroupRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!group;
  const [name, setName] = useState(group?.name || "");
  const [description, setDescription] = useState(group?.description || "");
  const [perms, setPerms] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    for (const key of PERMISSION_KEYS) defaults[key] = group ? !!group[key] : false;
    return defaults;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const togglePerm = (key: string) => setPerms(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSubmit = async () => {
    if (!name.trim()) { setError("T\u00ean nh\u00f3m quy\u1ec1n kh\u00f4ng \u0111\u01b0\u1ee3c \u0111\u1ec3 tr\u1ed1ng"); return; }
    setSaving(true); setError("");
    try {
      const url = isEdit ? `/api/admin/permission-groups/${group!.id}` : "/api/admin/permission-groups";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), description: description.trim(), ...perms }) });
      if (res.ok) { onSaved(); onClose(); }
      else { const d = await res.json().catch(() => ({})); setError(d.error || "C\u00f3 l\u1ed7i x\u1ea3y ra"); }
    } catch { setError("L\u1ed7i k\u1ebft n\u1ed1i"); }
    finally { setSaving(false); }
  };

  return createPortal(
    <>
      <div onClick={onClose} style={overlayStyle} />
      <div style={{ ...dialogBase, width: "640px", maxHeight: "85vh" }}>
        <div style={headerStyle}>
          <span style={titleStyle}>{isEdit ? `S\u1eeda nh\u00f3m quy\u1ec1n \u2014 ${group!.name}` : "Th\u00eam nh\u00f3m quy\u1ec1n m\u1edbi"}</span>
          <button onClick={onClose} style={closeBtnBase} onMouseEnter={closeHoverIn} onMouseLeave={closeHoverOut}>
            <X style={{ width: "18px", height: "18px" }} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto", flex: 1, maxHeight: "calc(85vh - 180px)", paddingRight: "4px" }}>
          <div>
            <label style={labelStyle}>T\u00ean nh\u00f3m quy\u1ec1n <span style={{ color: "#ef4444" }}>*</span></label>
            <input style={inputStyle} onFocus={iFocus} onBlur={iBlur} value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>M\u00f4 t\u1ea3</label>
            <input style={inputStyle} onFocus={iFocus} onBlur={iBlur} value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          {/* Permission toggles by category */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {PERMISSION_CATEGORIES.map(cat => {
              const isFinance = !!cat.highlight;
              return (
                <div key={cat.title}>
                  <div style={{
                    background: "#F3F4F6",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    marginBottom: "4px",
                  }}>
                    <span style={{
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      fontWeight: 600,
                      color: isFinance ? "#D97706" : "#2563EB",
                    }}>
                      {cat.title}
                    </span>
                  </div>
                  {cat.keys.map(({ key, label }, idx) => (
                    <div
                      key={key}
                      onClick={() => togglePerm(key)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 12px",
                        background: idx % 2 === 1 ? "#F9FAFB" : "transparent",
                        cursor: "pointer",
                        borderRadius: "4px",
                        transition: "background 0.15s",
                      }}
                    >
                      <span style={{ fontSize: "13px", color: "#1a1a1a" }}>{label}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={perms[key]}
                        onClick={(e) => { e.stopPropagation(); togglePerm(key); }}
                        style={{
                          position: "relative",
                          display: "inline-flex",
                          height: "22px",
                          width: "40px",
                          alignItems: "center",
                          borderRadius: "11px",
                          border: "none",
                          cursor: "pointer",
                          transition: "background 0.2s",
                          background: perms[key] ? "#2563EB" : "#d1d5db",
                          flexShrink: 0,
                        }}
                      >
                        <span style={{
                          display: "inline-block",
                          height: "16px",
                          width: "16px",
                          borderRadius: "50%",
                          background: "#FFFFFF",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                          transition: "transform 0.2s",
                          transform: perms[key] ? "translateX(18px)" : "translateX(3px)",
                        }} />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {error && <p style={{ fontSize: "13px", color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px" }}>{error}</p>}
        </div>

        <div style={footerStyle}>
          <button onClick={onClose} style={cancelBtnStyle} onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>H\u1ee7y</button>
          <button onClick={handleSubmit} disabled={saving} style={{ ...primaryBtnStyle, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "#1d4ed8"; }}
            onMouseLeave={e => e.currentTarget.style.background = "#2563EB"}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {saving ? "\u0110ang l\u01b0u..." : "L\u01b0u"}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

/* ================================================================== */
/* DeleteGroupDialog                                                   */
/* ================================================================== */
function DeleteGroupDialog({ group, onClose, onDeleted }: { group: PermGroupRow; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/permission-groups/${group.id}`, { method: "DELETE" });
      if (res.ok) { onDeleted(); onClose(); }
      else { const d = await res.json().catch(() => ({})); alert(d.error || "L\u1ed7i"); }
    } catch { alert("L\u1ed7i k\u1ebft n\u1ed1i"); }
    finally { setDeleting(false); }
  };

  return createPortal(
    <>
      <div onClick={onClose} style={overlayStyle} />
      <div style={{ ...dialogBase, width: "420px" }}>
        <div style={headerStyle}>
          <span style={{ ...titleStyle, color: "#dc2626" }}>X\u00f3a nh\u00f3m quy\u1ec1n</span>
          <button onClick={onClose} style={closeBtnBase} onMouseEnter={closeHoverIn} onMouseLeave={closeHoverOut}>
            <X style={{ width: "18px", height: "18px" }} />
          </button>
        </div>
        <p style={{ fontSize: "14px", color: "#374151", lineHeight: 1.6 }}>
          B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n x\u00f3a nh\u00f3m quy\u1ec1n <b style={{ color: "#1a1a1a" }}>{group.name}</b>?
        </p>
        <div style={footerStyle}>
          <button onClick={onClose} style={cancelBtnStyle} onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>H\u1ee7y</button>
          <button onClick={handleDelete} disabled={deleting} style={{ ...dangerBtnStyle, opacity: deleting ? 0.6 : 1, cursor: deleting ? "not-allowed" : "pointer" }}
            onMouseEnter={e => { if (!deleting) e.currentTarget.style.background = "#b91c1c"; }}
            onMouseLeave={e => e.currentTarget.style.background = "#dc2626"}
          >{deleting ? "\u0110ang x\u00f3a..." : "X\u00f3a"}</button>
        </div>
      </div>
    </>,
    document.body
  );
}
