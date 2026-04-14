"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";

interface ProspectFormDialogProps {
  userId: string;
  onClose: () => void;
}

const SOURCES = [
  { value: "FACEBOOK", label: "Facebook" },
  { value: "SHOPEE", label: "Shopee" },
  { value: "TIKTOK_SHOP", label: "TikTok Shop" },
  { value: "REFERRAL", label: "Giới thiệu" },
  { value: "DIRECT", label: "Trực tiếp" },
  { value: "LANDING_PAGE", label: "Landing Page" },
  { value: "OTHER", label: "Khác" },
];

const SIZES = [
  { value: "", label: "— Chọn quy mô —" },
  { value: "SMALL", label: "Nhỏ (<50 đơn/tháng)" },
  { value: "MEDIUM", label: "Trung bình (50-200 đơn/tháng)" },
  { value: "LARGE", label: "Lớn (>200 đơn/tháng)" },
];

export function ProspectFormDialog({ userId, onClose }: ProspectFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState({
    shopName: "",
    phone: "",
    email: "",
    contactPerson: "",
    zalo: "",
    address: "",
    source: "FACEBOOK",
    sourceDetail: "",
    productType: "",
    estimatedSize: "",
    currentCarrier: "",
    note: "",
    assigneeId: userId,
  });

  useEffect(() => {
    fetch("/api/users?active=true")
      .then((r) => r.json())
      .then((data) => {
        const u = data.data || data.users || data;
        if (Array.isArray(u)) setUsers(u);
      })
      .catch((err) => { console.warn("[ProspectFormDialog] Failed to fetch users:", err); });
  }, []);

  const handleSave = async () => {
    if (!form.shopName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/crm/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          estimatedSize: form.estimatedSize || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      onClose();
    } catch {
      alert("Lỗi khi tạo prospect");
    } finally {
      setSaving(false);
    }
  };

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
        <div className="bg-white rounded-xl border-[1.5px] border-blue-600 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
            <h3 className="text-sm font-bold text-slate-800">Thêm Prospect mới</h3>
            <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-3">
            {/* Shop Name - required */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Tên Shop *</label>
              <input value={form.shopName} onChange={(e) => update("shopName", e.target.value)}
                placeholder="Nhập tên cửa hàng..." type="text"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Nguồn *</label>
                <select value={form.source} onChange={(e) => update("source", e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Chi tiết nguồn</label>
                <input value={form.sourceDetail} onChange={(e) => update("sourceDetail", e.target.value)}
                  placeholder="Link profile, tên người giới thiệu..." type="text"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">SĐT</label>
                <input value={form.phone} onChange={(e) => update("phone", e.target.value)}
                  placeholder="0xxx..." type="tel"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Người liên hệ</label>
                <input value={form.contactPerson} onChange={(e) => update("contactPerson", e.target.value)}
                  placeholder="Tên người liên hệ" type="text"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Email</label>
                <input value={form.email} onChange={(e) => update("email", e.target.value)}
                  type="email" placeholder="email@shop.com"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Zalo</label>
                <input value={form.zalo} onChange={(e) => update("zalo", e.target.value)}
                  placeholder="SĐT Zalo" type="text"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Địa chỉ</label>
              <input value={form.address} onChange={(e) => update("address", e.target.value)}
                placeholder="Địa chỉ cửa hàng" type="text"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Loại hàng</label>
                <input value={form.productType} onChange={(e) => update("productType", e.target.value)}
                  placeholder="Thời trang, mỹ phẩm..." type="text"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Quy mô ước tính</label>
                <select value={form.estimatedSize} onChange={(e) => update("estimatedSize", e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">ĐT vận chuyển hiện tại</label>
                <input value={form.currentCarrier} onChange={(e) => update("currentCarrier", e.target.value)}
                  placeholder="GHTK, GHN, VTP..." type="text"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">NV phụ trách *</label>
                <select value={form.assigneeId} onChange={(e) => update("assigneeId", e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {users.length > 0 ? users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)
                    : <option value={userId}>Tôi</option>}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Ghi chú</label>
              <textarea value={form.note} onChange={(e) => update("note", e.target.value)}
                rows={3} placeholder="Ghi chú thêm..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            </div>
          </div>

          <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200 sticky bottom-0 bg-white">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Hủy</button>
            <button onClick={handleSave} disabled={!form.shopName.trim() || saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Tạo Prospect
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
