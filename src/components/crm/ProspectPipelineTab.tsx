"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import {
  Target, Plus, CheckCircle, TrendingUp, Clock, Download,
  Phone, User, Store, MoreHorizontal, Loader2, Search,
  LayoutGrid, List, PackageX, RotateCcw, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProspectFormDialog } from "./ProspectFormDialog";
import { ProspectDetailSheet } from "./ProspectDetailSheet";

interface ProspectPipelineTabProps {
  userRole: string;
  userId: string;
  userName: string;
  initialData?: any;
}

const STAGES = [
  { key: "DISCOVERED", label: "Mới phát hiện", color: "bg-slate-100 border-slate-300", headerColor: "bg-slate-500", emoji: "🔍" },
  { key: "CONTACTED", label: "Đã tiếp cận", color: "bg-blue-50 border-blue-200", headerColor: "bg-blue-500", emoji: "📞" },
  { key: "NEGOTIATING", label: "Đang thương lượng", color: "bg-yellow-50 border-yellow-200", headerColor: "bg-yellow-500", emoji: "🤝" },
  { key: "TRIAL", label: "Dùng thử", color: "bg-orange-50 border-orange-200", headerColor: "bg-orange-500", emoji: "🧪" },
  { key: "CONVERTED", label: "Đã chuyển đổi", color: "bg-green-50 border-green-200", headerColor: "bg-green-500", emoji: "✅" },
] as const;

type StageKey = (typeof STAGES)[number]["key"];

const SOURCE_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook",
  SHOPEE: "Shopee",
  TIKTOK_SHOP: "TikTok Shop",
  REFERRAL: "Giới thiệu",
  DIRECT: "Trực tiếp",
  LANDING_PAGE: "Landing Page",
  OTHER: "Khác",
};

interface Prospect {
  id: string;
  shopName: string;
  phone: string | null;
  contactPerson: string | null;
  source: string;
  stage: StageKey;
  isLost: boolean;
  lostReason: string | null;
  sortOrder: number;
  assignee: { id: string; name: string };
  lastContactDate: string | null;
  nextFollowUp: string | null;
  createdAt: string;
}

export function ProspectPipelineTab({ userRole, userId, userName, initialData }: ProspectPipelineTabProps) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  // Stats — staleTime 2min (prospect stats change infrequently)
  const { data: statsData } = useQuery({
    queryKey: ["crm-prospect-stats"],
    queryFn: async () => {
      const res = await fetch("/api/crm/prospects/stats");
      if (!res.ok) throw new Error("Failed to fetch prospect stats");
      return res.json();
    },
    refetchInterval: 300000,
    staleTime: 2 * 60 * 1000,
    initialData: initialData?.stats,
  });

  // Prospects list — staleTime 1min
  const { data: prospectsData, isLoading } = useQuery({
    queryKey: ["crm-prospects", appliedSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (appliedSearch) params.set("search", appliedSearch);
      params.set("pageSize", "200");
      const res = await fetch(`/api/crm/prospects?${params}`);
      if (!res.ok) throw new Error("Failed to fetch prospects");
      return res.json();
    },
    refetchInterval: 300000,
    staleTime: 60 * 1000,
    initialData: appliedSearch ? undefined : initialData?.prospects,
  });

  const stats = statsData?.data;
  const allProspects: Prospect[] = prospectsData?.data?.prospects || [];

  // Group by stage for Kanban
  const byStage: Record<StageKey, Prospect[]> = {
    DISCOVERED: [], CONTACTED: [], NEGOTIATING: [], TRIAL: [], CONVERTED: []
  };
  for (const p of allProspects) {
    if (p.isLost) continue;
    if (byStage[p.stage]) byStage[p.stage].push(p);
  }

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { draggableId, source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceStage = source.droppableId as StageKey;
    const destStage = destination.droppableId as StageKey;

    // Optimistic update: immediately update React Query cache
    queryClient.setQueryData(["crm-prospects", appliedSearch], (old: any) => {
      if (!old?.data?.prospects) return old;
      const updated = old.data.prospects.map((p: Prospect) => {
        if (p.id === draggableId) return { ...p, stage: destStage };
        return p;
      });
      return { ...old, data: { ...old.data, prospects: updated } };
    });

    // Build reorder items from current byStage (after optimistic update)
    const sourceItems = [...byStage[sourceStage]];
    const destItems = sourceStage === destStage ? sourceItems : [...byStage[destStage]];
    const [movedItem] = sourceItems.splice(source.index, 1);
    const updatedItem = { ...movedItem, stage: destStage };
    if (sourceStage === destStage) {
      sourceItems.splice(destination.index, 0, updatedItem);
    } else {
      destItems.splice(destination.index, 0, updatedItem);
    }

    const items: Array<{ id: string; sortOrder: number; stage: string }> = [];
    if (sourceStage === destStage) {
      sourceItems.forEach((p, i) => items.push({ id: p.id, sortOrder: i, stage: sourceStage }));
    } else {
      sourceItems.forEach((p, i) => items.push({ id: p.id, sortOrder: i, stage: sourceStage }));
      destItems.forEach((p, i) => items.push({ id: p.id, sortOrder: i, stage: destStage }));
    }

    // API calls (non-blocking for UI)
    try {
      const promises: Promise<any>[] = [];
      if (sourceStage !== destStage) {
        promises.push(fetch(`/api/crm/prospects/${draggableId}/stage`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: destStage }),
        }));
      }
      promises.push(fetch("/api/crm/prospects/reorder", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      }));
      await Promise.all(promises);
    } catch { /* optimistic update already applied */ }

    queryClient.invalidateQueries({ queryKey: ["crm-prospects"] });
    queryClient.invalidateQueries({ queryKey: ["crm-prospect-stats"] });
  }, [allProspects, appliedSearch, queryClient, search]);

  const handleMarkLost = async (id: string, reason: string) => {
    await fetch(`/api/crm/prospects/${id}/lost`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lostReason: reason }),
    });
    queryClient.invalidateQueries({ queryKey: ["crm-prospects"] });
    queryClient.invalidateQueries({ queryKey: ["crm-prospect-stats"] });
  };

  const handleReopen = async (id: string) => {
    await fetch(`/api/crm/prospects/${id}/reopen`, { method: "PATCH" });
    queryClient.invalidateQueries({ queryKey: ["crm-prospects"] });
    queryClient.invalidateQueries({ queryKey: ["crm-prospect-stats"] });
  };

  const lostProspects = allProspects.filter((p) => p.isLost);

  return (
    <div className="space-y-5">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Đang theo đuổi", value: stats?.activeProspects ?? "—", icon: Target, color: "text-blue-600 border-l-blue-500" },
          { label: "Chuyển đổi tháng này", value: stats?.convertedThisMonth ?? "—", icon: CheckCircle, color: "text-green-600 border-l-green-500" },
          { label: "Tỷ lệ chuyển đổi", value: stats ? `${stats.conversionRate}%` : "—", icon: TrendingUp, color: "text-purple-600 border-l-purple-500" },
          { label: "TB ngày chuyển đổi", value: stats ? `${stats.avgConversionDays}d` : "—", icon: Clock, color: "text-orange-600 border-l-orange-500" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={cn("bg-white rounded-xl border border-slate-200 border-l-4 p-4 shadow-sm", card.color.split(" ")[1])}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">{card.label}</span>
                <Icon className={cn("w-4 h-4", card.color.split(" ")[0])} />
              </div>
              <p className={cn("text-2xl font-bold", card.color.split(" ")[0])}>{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setAppliedSearch(search.trim());
          }}
          className="flex flex-1 min-w-[200px] items-stretch gap-2"
        >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" placeholder="Tìm prospect..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full min-h-11 pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label="Tìm kiếm prospect"
          />
        </div>
        <button
          type="submit"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-blue-600 bg-blue-600 px-3 text-white transition-colors hover:bg-blue-700"
          aria-label="Tìm kiếm prospect"
          title="Tìm kiếm"
        >
          <Search className="w-4 h-4" />
        </button>
        </form>

        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          <button onClick={() => setView("kanban")}
            className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              view === "kanban" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}>
            <LayoutGrid className="w-3.5 h-3.5 inline mr-1" />Kanban
          </button>
          <button onClick={() => setView("list")}
            className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              view === "list" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}>
            <List className="w-3.5 h-3.5 inline mr-1" />Danh sách
          </button>
        </div>

        <button onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Thêm Prospect
        </button>
      </div>

      {/* Kanban View */}
      {view === "kanban" && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
            {STAGES.map((stage) => {
              const items = byStage[stage.key];
              return (
                <div key={stage.key} className="flex-shrink-0 w-[260px]">
                  <div className={cn("rounded-t-lg px-3 py-2 flex items-center justify-between text-white text-xs font-medium", stage.headerColor)}>
                    <span>{stage.emoji} {stage.label}</span>
                    <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-[10px]">{items.length}</span>
                  </div>
                  <Droppable droppableId={stage.key}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "rounded-b-lg border min-h-[200px] p-2 space-y-2 transition-colors",
                          stage.color,
                          snapshot.isDraggingOver && "bg-blue-100/50 border-blue-300"
                        )}
                      >
                        {items.map((prospect, index) => (
                          <Draggable key={prospect.id} draggableId={prospect.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => setSelectedProspect(prospect.id)}
                                className={cn(
                                  "bg-white rounded-lg border border-slate-200 p-3 cursor-pointer hover:shadow-md transition-all",
                                  snapshot.isDragging && "shadow-lg ring-2 ring-blue-400"
                                )}
                              >
                                <p className="font-medium text-sm text-slate-800 truncate">{prospect.shopName}</p>
                                <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                                  {prospect.phone && <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" />{prospect.phone}</span>}
                                </div>
                                <div className="mt-2 flex items-center justify-between text-[11px]">
                                  <span className="text-slate-400">{SOURCE_LABELS[prospect.source] || prospect.source}</span>
                                  <span className="text-slate-400 flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {prospect.assignee?.name?.split(" ").pop()}
                                  </span>
                                </div>
                                {prospect.nextFollowUp && (
                                  <div className="mt-1.5 text-[10px] px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-700 border border-yellow-200 inline-block">
                                    📅 {new Date(prospect.nextFollowUp).toLocaleDateString("vi-VN")}
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {items.length === 0 && (
                          <div className="text-center text-xs text-slate-400 py-8">Kéo & thả prospect vào đây</div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Tên Shop</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">SĐT</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Nguồn</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Giai đoạn</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">NV phụ trách</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Ngày tạo</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400">Đang tải...</td></tr>
                ) : allProspects.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400">Chưa có prospect nào</td></tr>
                ) : (
                  allProspects.map((p) => {
                    const stageConfig = STAGES.find((s) => s.key === p.stage);
                    return (
                      <tr key={p.id} onClick={() => setSelectedProspect(p.id)}
                        className={cn("hover:bg-slate-50 cursor-pointer transition-colors", p.isLost && "opacity-50")}>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-800">{p.shopName}</span>
                          {p.isLost && <span className="ml-2 text-xs text-red-500 font-medium">MẤT</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{p.phone || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{SOURCE_LABELS[p.source] || p.source}</td>
                        <td className="px-4 py-3">
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", stageConfig?.color || "bg-slate-100")}>
                            {stageConfig?.emoji} {stageConfig?.label || p.stage}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{p.assignee?.name}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{new Date(p.createdAt).toLocaleDateString("vi-VN")}</td>
                        <td className="px-4 py-3 text-center">
                          {p.isLost ? (
                            <button onClick={(e) => { e.stopPropagation(); handleReopen(p.id); }}
                              className="text-xs text-blue-600 hover:underline">
                              <RotateCcw className="w-3 h-3 inline mr-0.5" />Mở lại
                            </button>
                          ) : (
                            <span className="text-xs text-green-600">Hoạt động</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lost Prospects */}
      {lostProspects.length > 0 && view === "kanban" && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
            <PackageX className="w-4 h-4" />
            Prospect đã mất ({lostProspects.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {lostProspects.map((p) => (
              <div key={p.id} className="bg-white rounded-lg border border-red-200 px-3 py-2 text-sm flex items-center gap-2">
                <span className="text-slate-700">{p.shopName}</span>
                <span className="text-xs text-slate-400">{p.lostReason}</span>
                <button onClick={() => handleReopen(p.id)} className="text-xs text-blue-600 hover:underline ml-2">
                  <RotateCcw className="w-3 h-3 inline" /> Mở lại
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dialogs */}
      {showAddDialog && (
        <ProspectFormDialog
          userId={userId}
          onClose={() => {
            setShowAddDialog(false);
            queryClient.invalidateQueries({ queryKey: ["crm-prospects"] });
            queryClient.invalidateQueries({ queryKey: ["crm-prospect-stats"] });
          }}
        />
      )}

      {selectedProspect && (
        <ProspectDetailSheet
          prospectId={selectedProspect}
          userId={userId}
          userName={userName}
          onClose={() => {
            setSelectedProspect(null);
            queryClient.invalidateQueries({ queryKey: ["crm-prospects"] });
            queryClient.invalidateQueries({ queryKey: ["crm-prospect-stats"] });
          }}
          onMarkLost={handleMarkLost}
          onReopen={handleReopen}
        />
      )}
    </div>
  );
}
