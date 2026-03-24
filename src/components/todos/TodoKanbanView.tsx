"use client";

import { format } from "date-fns";
import { Circle } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { PRIORITY_CONFIG, SOURCE_CONFIG } from "./constants";
import type { TodoItemData } from "@/types/todo";

interface TodoKanbanViewProps {
  todos: TodoItemData[];
  onDragEnd: (result: any) => void;
  onSelect: (todo: TodoItemData) => void;
}

function isDueOverdue(d: string | null) {
  if (!d) return false;
  return new Date(d) < new Date();
}
function isDueToday(d: string | null) {
  if (!d) return false;
  return new Date(d).toDateString() === new Date().toDateString();
}

const columns = [
  { id: "todo", label: "Cần làm", statusKey: "TODO", color: "text-gray-500", borderColor: "border-gray-300", hoverBg: "bg-gray-100" },
  { id: "inprogress", label: "Đang làm", statusKey: "IN_PROGRESS", color: "text-amber-600", borderColor: "border-amber-300", hoverBg: "bg-amber-50" },
  { id: "done", label: "Hoàn thành", statusKey: "DONE", color: "text-green-600", borderColor: "border-green-300", hoverBg: "bg-green-50" },
] as const;

const dotColors: Record<string, string> = {
  "text-gray-500": "#6b7280",
  "text-amber-600": "#d97706",
  "text-green-600": "#16a34a",
};

export function TodoKanbanView({ todos, onDragEnd, onSelect }: TodoKanbanViewProps) {
  const grouped: Record<string, TodoItemData[]> = {
    TODO: todos.filter((t) => t.status === "TODO"),
    IN_PROGRESS: todos.filter((t) => t.status === "IN_PROGRESS"),
    DONE: todos.filter((t) => t.status === "DONE").slice(0, 10),
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      {/* Mobile: vertical stack / Desktop: 3 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 h-full">
        {columns.map((col) => {
          const items = grouped[col.statusKey] || [];
          return (
            <Droppable key={col.id} droppableId={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`rounded-xl p-3 min-h-[160px] sm:min-h-[200px] border transition-colors ${
                    snapshot.isDraggingOver
                      ? `bg-slate-100 ${col.borderColor}`
                      : "bg-slate-50 border-gray-200"
                  }`}
                >
                  {/* Column header */}
                  <div className={`text-[13px] font-bold ${col.color} mb-2.5 flex items-center gap-1.5`}>
                    <Circle size={8} fill={dotColors[col.color]} color={dotColors[col.color]} />
                    {col.label}
                    <span className="text-gray-400 font-medium ml-0.5">({items.length})</span>
                  </div>

                  {/* Cards */}
                  {items.map((t, idx) => (
                    <Draggable key={t.id} draggableId={t.id} index={idx}>
                      {(prov, snap) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          onClick={() => onSelect(t)}
                          className={`bg-white border border-gray-200 rounded-[10px] p-3 mb-2 cursor-pointer transition-shadow ${
                            snap.isDragging ? "shadow-lg" : "shadow-sm hover:shadow-md"
                          } ${col.statusKey === "DONE" ? "opacity-60" : ""}`}
                          style={prov.draggableProps.style}
                        >
                          {/* Title + Priority dot */}
                          <div className="flex justify-between items-start gap-2 mb-1.5">
                            <div className="text-[13px] font-semibold text-slate-800 leading-snug line-clamp-2">
                              {t.title}
                            </div>
                            <span
                              className="w-2 h-2 rounded-full shrink-0 mt-1"
                              style={{ background: PRIORITY_CONFIG[t.priority]?.dot }}
                            />
                          </div>

                          {/* Linked order */}
                          {t.linkedOrder && (
                            <div className="text-[11px] text-blue-600 font-medium mb-1.5 truncate">
                              {t.linkedOrder.requestCode}
                            </div>
                          )}

                          {/* Footer: source + due + assignee */}
                          <div className="flex justify-between items-center mt-1">
                            <div className="flex gap-1.5 items-center flex-wrap">
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${SOURCE_CONFIG[t.source]?.twBg || ""}`}>
                                {SOURCE_CONFIG[t.source]?.label}
                              </span>
                              {t.dueDate && (
                                <span
                                  className={`text-[10px] font-medium flex items-center gap-0.5 ${
                                    isDueOverdue(t.dueDate) ? "text-red-600" : isDueToday(t.dueDate) ? "text-amber-600" : "text-gray-500"
                                  }`}
                                >
                                  ⏰ {format(new Date(t.dueDate), "dd/MM HH:mm")}
                                </span>
                              )}
                            </div>
                            {t.assignee?.name && (
                              <span className="text-[10px] text-gray-400 font-medium truncate max-w-[60px]">
                                {t.assignee.name.split(" ").pop()}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
}
