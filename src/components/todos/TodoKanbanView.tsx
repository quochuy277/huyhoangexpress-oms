"use client";

import { format } from "date-fns";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { Circle, GripVertical, UserCheck } from "lucide-react";

import { classifyDue } from "@/lib/todo-dates";
import type { TodoItemData } from "@/types/todo";

import { KANBAN_SORT_OPTIONS, PRIORITY_CONFIG, SOURCE_CONFIG, type KanbanSortField } from "./constants";

const TEXT = {
  todo: "Cần làm",
  inProgress: "Đang làm",
  done: "Hoàn thành",
  assignedBy: (name: string) => `Giao bởi ${name}`,
  created: "Tạo",
  clock: "⏰",
  check: "✓",
} as const;

interface TodoKanbanViewProps {
  todos: TodoItemData[];
  columnSort: Record<string, KanbanSortField>;
  onColumnSortChange: (columnId: string, field: KanbanSortField) => void;
  onDragEnd: (result: any) => void;
  onSelect: (todo: TodoItemData) => void;
}

const PRIORITY_RANK: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function sortCards(cards: TodoItemData[], field: KanbanSortField): TodoItemData[] {
  if (field === "manual") return cards;
  const copy = [...cards];
  if (field === "priority") {
    copy.sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9));
  } else if (field === "dueDate") {
    const v = (t: TodoItemData) => (t.dueDate ? new Date(t.dueDate).getTime() : Infinity);
    copy.sort((a, b) => v(a) - v(b));
  } else if (field === "createdAt") {
    copy.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  return copy;
}

const columns = [
  { id: "todo", label: TEXT.todo, statusKey: "TODO", color: "text-gray-500", borderColor: "border-gray-300" },
  { id: "inprogress", label: TEXT.inProgress, statusKey: "IN_PROGRESS", color: "text-amber-600", borderColor: "border-amber-300" },
  { id: "done", label: TEXT.done, statusKey: "DONE", color: "text-green-600", borderColor: "border-green-300" },
] as const;

const dotColors: Record<string, string> = {
  "text-gray-500": "#6b7280",
  "text-amber-600": "#d97706",
  "text-green-600": "#16a34a",
};

export function TodoKanbanView({ todos, columnSort, onColumnSortChange, onDragEnd, onSelect }: TodoKanbanViewProps) {
  const grouped: Record<string, TodoItemData[]> = {
    TODO: todos.filter((todo) => todo.status === "TODO"),
    IN_PROGRESS: todos.filter((todo) => todo.status === "IN_PROGRESS"),
    DONE: todos.filter((todo) => todo.status === "DONE"),
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid h-full grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {columns.map((column) => {
          const columnField = columnSort[column.id] ?? "manual";
          const items = sortCards(grouped[column.statusKey] || [], columnField);
          return (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[160px] rounded-xl border p-3 transition-colors sm:min-h-[200px] ${
                    snapshot.isDraggingOver ? `bg-slate-100 ${column.borderColor}` : "border-gray-200 bg-slate-50"
                  }`}
                >
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <div className={`flex items-center gap-1.5 text-[13px] font-bold ${column.color}`}>
                      <Circle size={8} fill={dotColors[column.color]} color={dotColors[column.color]} />
                      {column.label}
                      <span className="ml-0.5 font-medium text-gray-400">({items.length})</span>
                    </div>
                    <select
                      value={columnField}
                      onChange={(e) => onColumnSortChange(column.id, e.target.value as KanbanSortField)}
                      className="rounded-md border border-gray-200 bg-white px-1.5 py-1 text-[11px] text-gray-500 outline-none"
                      title="Sắp xếp"
                    >
                      {KANBAN_SORT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  {items.map((todo, index) => (
                    <Draggable key={todo.id} draggableId={todo.id} index={index}>
                      {(draggableProvided, draggableSnapshot) => (
                        <div
                          ref={draggableProvided.innerRef}
                          {...draggableProvided.draggableProps}
                          onClick={() => onSelect(todo)}
                          className={`mb-2 cursor-pointer rounded-[10px] border border-gray-200 bg-white p-3 transition-shadow ${
                            draggableSnapshot.isDragging ? "shadow-lg" : "shadow-sm hover:shadow-md"
                          } ${column.statusKey === "DONE" ? "opacity-60" : ""}`}
                          style={draggableProvided.draggableProps.style}
                        >
                          <div className="flex items-start gap-1">
                            <div
                              {...draggableProvided.dragHandleProps}
                              className="flex shrink-0 items-center p-1.5 -ml-1 text-gray-300 hover:text-gray-500 touch-none"
                            >
                              <GripVertical size={14} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="mb-1.5 flex items-start justify-between gap-2">
                                <div className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-800">
                                  {todo.title}
                                </div>
                                <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: PRIORITY_CONFIG[todo.priority]?.dot }} />
                              </div>
                            </div>
                          </div>

                          {todo.linkedOrder && (
                            <div className="mb-1.5 truncate text-[11px] font-medium text-blue-600">
                              {todo.linkedOrder.requestCode}
                            </div>
                          )}

                          {todo.createdBy && todo.assignee && todo.createdById !== todo.assigneeId && (
                            <div className="mt-1 flex w-fit items-center gap-0.5 rounded bg-purple-50 px-1.5 py-0.5 text-[11px] text-purple-600">
                              <UserCheck size={9} />
                              <span className="max-w-[120px] truncate font-medium">{TEXT.assignedBy(todo.createdBy.name)}</span>
                            </div>
                          )}

                          <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
                            <span>{TEXT.created}: {format(new Date(todo.createdAt), "dd/MM HH:mm")}</span>
                            {todo.completedAt && <span className="text-green-600">{TEXT.check} {format(new Date(todo.completedAt), "dd/MM HH:mm")}</span>}
                          </div>

                          <div className="mt-1 flex items-center justify-between">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${SOURCE_CONFIG[todo.source]?.twBg || ""}`}>
                                {SOURCE_CONFIG[todo.source]?.label}
                              </span>
                              {todo.dueDate && (() => {
                                const cls = classifyDue(todo.dueDate, todo.status, new Date());
                                return (
                                  <span className={`flex items-center gap-0.5 text-[11px] font-medium ${
                                    cls === "overdue" ? "text-red-600" : cls === "today" ? "text-amber-600" : "text-gray-500"
                                  }`}>
                                    {TEXT.clock} {format(new Date(todo.dueDate), "dd/MM HH:mm")}
                                  </span>
                                );
                              })()}
                            </div>
                            {todo.assignee?.name && <span className="max-w-[60px] truncate text-[11px] font-medium text-gray-400">{todo.assignee.name.split(" ").pop()}</span>}
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
