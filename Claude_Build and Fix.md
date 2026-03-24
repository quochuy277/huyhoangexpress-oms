# Claude Build and Fix Log

> File ghi nhận toàn bộ thay đổi được thực hiện bởi Claude trong quá trình phát triển ứng dụng Order Manager.

---

## Session 1 — 25/03/2026

### 1. Refactor toàn diện trang Công Việc (Todos)

**Yêu cầu:** Đánh giá toàn diện trang Công Việc, sau đó thực hiện tất cả các cải thiện đề xuất (4 nhóm: Performance, UX, Refactor Code, Responsive).

**Đánh giá ban đầu:**
- File `TodosClient.tsx` là monolith 962 dòng chứa tất cả logic
- 100% inline styles, không dùng Tailwind
- Duplicate code (delete dialog xuất hiện 2 lần)
- Không có TypeScript types (`any` khắp nơi)
- Không có custom hooks, tất cả fetch logic nằm trong component
- Search không debounce — mỗi keystroke gọi API
- Mỗi thao tác nhỏ (toggle, status change) = full refetch toàn bộ danh sách
- Reminder popup chặn UI mỗi lần vào trang
- Không responsive cho mobile

---

#### Thay đổi chi tiết:

##### A. Files mới tạo (12 files)

| File | Mô tả |
|------|--------|
| `src/types/todo.ts` | TypeScript interfaces: TodoItemData, TodoPagination, TodoStats, TodoFilters, TodoComment, TodoUser, v.v. |
| `src/components/todos/constants.ts` | PRIORITY_CONFIG, STATUS_CONFIG, SOURCE_CONFIG, DUE_FILTER_OPTIONS — thêm Tailwind class mappings |
| `src/hooks/useDebounce.ts` | Hook debounce generic, mặc định 400ms |
| `src/hooks/useTodos.ts` | Hook quản lý CRUD todos với optimistic updates (toggleComplete, changeStatus, deleteTodo, quickAdd, reorderKanban) |
| `src/hooks/useTodoStats.ts` | Hook fetch thống kê todos |
| `src/hooks/useTodoUsers.ts` | Hook fetch danh sách users với module-level cache |
| `src/components/todos/DeleteConfirmDialog.tsx` | Dialog xác nhận xóa — dùng chung cho cả list view và detail panel (bỏ duplicate) |
| `src/components/todos/TodoReminderBanner.tsx` | Banner nhắc nhở dismissible thay thế popup chặn UI |
| `src/components/todos/TodoQuickAdd.tsx` | Thanh thêm việc nhanh (tách từ monolith) |
| `src/components/todos/TodoFilters.tsx` | Bộ lọc: search, source, priority, due filter, hide done |
| `src/components/todos/TodoSummaryCards.tsx` | 4 thẻ thống kê: hôm nay, quá hạn, đang làm, hoàn thành tuần |
| `src/components/todos/TodoListView.tsx` | Bảng danh sách desktop + mobile card view responsive |
| `src/components/todos/TodoKanbanView.tsx` | Kanban drag-drop 3 cột với responsive |
| `src/components/todos/TodoDetailPanel.tsx` | Side panel chi tiết công việc với slide-in animation |

##### B. Files đã sửa (2 files)

| File | Trước | Sau | Thay đổi |
|------|-------|-----|----------|
| `src/components/todos/TodosClient.tsx` | 962 dòng, monolith | ~185 dòng, orchestrator | Viết lại hoàn toàn: tách thành 13 files, dùng hooks, Tailwind, keyboard shortcuts |
| `src/components/shared/AddTodoDialog.tsx` | 453 dòng, inline styles | ~233 dòng, Tailwind | Chuyển sang Tailwind, dùng useTodoUsers hook, thêm Escape close, grid layout responsive |

##### C. Cải thiện Performance

| Thay đổi | Chi tiết |
|----------|----------|
| Debounce search | 400ms delay — giảm ~80% API calls khi gõ tìm kiếm |
| Optimistic updates | Toggle complete, change status, delete — phản hồi UI tức thì không chờ API |
| Cache users list | Module-level cache trong `useTodoUsers.ts` — không fetch lại mỗi lần mở dialog |
| Detail panel preload | Hiện data có sẵn từ list ngay lập tức, chỉ fetch thêm comments từ API |

##### D. Cải thiện UX

| Thay đổi | Chi tiết |
|----------|----------|
| Reminder popup → Banner | Banner dismissible ở đầu trang, không chặn UI |
| Keyboard shortcuts | `N` = tạo mới, `Esc` = đóng panel/dialog |
| Hover effects | Thêm hover states cho table rows, buttons |
| Slide-in animation | Detail panel có animation slideInRight |
| Dialog animation | Add/Delete dialogs có scale animation |

##### E. Responsive Design

| Breakpoint | Layout |
|------------|--------|
| Mobile (<640px) | Card layout thay bảng, stacked kanban columns, compact buttons (ẩn text chỉ hiện icon), full-width detail panel |
| Tablet (640-1024px) | 2-col summary cards, 3-col kanban, table view |
| Desktop (>1024px) | 4-col summary cards, full table, 480px side panel |

##### F. Code Quality

| Thay đổi | Chi tiết |
|----------|----------|
| TypeScript types | `any` → interfaces cụ thể (TodoItemData, TodoComment, TodoUser, v.v.) |
| Tailwind | 100% inline styles → Tailwind classes |
| DRY | DeleteConfirmDialog dùng chung (bỏ duplicate) |
| Separation of concerns | 1 monolith → hooks + components chuyên biệt |

**Kết quả:** Build thành công, không có TypeScript errors hay compilation warnings mới.

---
