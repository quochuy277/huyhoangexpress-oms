# Spec A — Công việc: Đúng dữ liệu & Tập trung ("Hôm nay")

- **Ngày:** 2026-06-15
- **Phạm vi:** Sửa 4 lỗi logic về thời gian/đếm + thêm view "Hôm nay" (tập trung) + bộ sắp xếp cho List & Kanban.
- **Không thuộc phạm vi:** Hệ thống nhắc/leo thang (Spec B). Giới hạn WIP (đã loại bỏ theo quyết định nghiệp vụ).
- **Hướng:** "Siết kỷ luật vận hành" — bước 1 là làm cho dữ liệu thời hạn *đúng và nhất quán*, rồi cho người dùng một màn hình "phải làm gì hôm nay".

---

## 1. Bối cảnh & vấn đề

Module công việc hiện tính toán mốc ngày (hôm nay/quá hạn/tuần) **lặp lại ở nhiều nơi với cách khác nhau**, gây ra 4 lỗi:

1. **Lệch múi giờ.** Mốc ngày tính bằng giờ máy chủ (`new Date(now.getFullYear(), now.getMonth(), now.getDate())`) ở `todo-page-data.ts`, `stats/route.ts`, `reminders/route.ts`, `overdue-count/route.ts`. Nếu máy chủ không chạy giờ VN (UTC+7), ranh giới ngày lệch tới 7 giờ → đếm sai quanh nửa đêm.
2. **"Quá hạn" đá nhau giữa List/Kanban và KPI.** List/Kanban tô đỏ theo *thời điểm đầy đủ* (`new Date(dueDate) < new Date()`), còn KPI/stats tính theo *đầu ngày* (`dueDate < todayStart`). Việc đến hạn hôm nay đã qua giờ hiện đỏ "quá hạn" ở bảng nhưng vẫn được đếm vào "hôm nay".
3. **Thẻ "Tổng việc hôm nay" trộn khái niệm.** Đếm `dueDate hôm nay OR createdAt hôm nay` → việc tạo hôm nay nhưng hạn tuần sau vẫn nhảy vào "hôm nay", làm loãng tiêu điểm ngày.
4. **Kanban không phản ánh toàn bộ việc đang mở.** Board nhóm từ danh sách đã phân trang `pageSize: 20`, cột DONE còn `.slice(0, 10)`. Khi có >20 việc, board chỉ hiện việc của trang hiện tại → hiểu nhầm "đã hết việc", kéo-thả không nhất quán.

Hệ quả quản trị: con số "hôm nay/quá hạn" không đáng tin, người dùng không có một nơi rõ ràng để biết "hôm nay phải xử lý gì".

## 2. Quyết định thiết kế (đã chốt)

- **Múi giờ:** dùng offset cố định **+07:00** (VN không có DST), cho phép override bằng biến môi trường `APP_TZ_OFFSET` (đơn vị: phút, mặc định 420). Mọi mốc ngày/tuần tính theo offset này.
- **Định nghĩa "quá hạn"/"hôm nay" theo *mức ngày* (không theo giờ):**
  - **Quá hạn** = chưa DONE **và** `dueDate < đầu hôm nay (VN)`.
  - **Đến hạn hôm nay** = chưa DONE **và** `dueDate ∈ [đầu hôm nay, đầu ngày mai)` (VN).
  - Việc DONE hoặc `dueDate = null` → không quá hạn, không đến hạn hôm nay.
- **"Hôm nay" (view) = Quá hạn + Đến hạn hôm nay** (gộp, dẫn xuất, không đổi schema).
- **KPI hiển thị tách bạch, không đếm chồng:** thẻ "Đến hạn hôm nay" và thẻ "Quá hạn" là hai số riêng. (View "Hôm nay" mới là nơi gộp cả hai.)
- **Một nguồn sự thật duy nhất:** đưa toàn bộ logic ngày/phân loại vào một module thuần dùng chung cho cả server lẫn client.

## 3. Kiến trúc

### 3.1. Module ngày/phân loại dùng chung — `src/lib/todo-dates.ts` (mới)

Module thuần TypeScript (không phụ thuộc Node), import được ở cả server và client.

```
getTzOffsetMinutes(): number
  → đọc APP_TZ_OFFSET (phút), mặc định 420 (+07:00).

getDayWindows(now: Date): {
  todayStart: Date;   // instant tương ứng 00:00 VN của hôm nay
  todayEnd: Date;     // instant 00:00 VN ngày mai (nửa mở [start, end))
  weekStart: Date;    // 00:00 VN Thứ Hai của tuần hiện tại
  weekEnd: Date;      // 00:00 VN Thứ Hai tuần kế
}

classifyDue(dueDate: Date | string | null, status: TodoStatus, now: Date):
  "overdue" | "today" | "upcoming" | "none"
```

**Quy ước tính toán (để khớp khi viết test):**
- Lấy "giờ tường VN" = `now` dịch theo offset; trích Y/M/D; dựng lại instant của 00:00 VN bằng cách trừ offset. Nhờ vậy `todayStart` là một mốc tuyệt đối, so sánh trực tiếp với `dueDate` (vốn là instant trong DB) là đúng.
- **Tuần bắt đầu Thứ Hai** và **Chủ Nhật thuộc về tuần đang diễn ra** (sửa luôn lỗi tế nhị của công thức cũ `getDate() - getDay() + 1`, vốn đẩy Chủ Nhật sang tuần kế).
- `classifyDue`: `status === "DONE"` hoặc `dueDate == null` → `"none"`; `dueDate < todayStart` → `"overdue"`; `dueDate < todayEnd` → `"today"`; còn lại `"upcoming"`.

**Thay thế các phép tính nội tuyến tại:**
- `src/lib/todo-page-data.ts`
- `src/app/api/todos/stats/route.ts`
- `src/app/api/todos/reminders/route.ts`
- `src/app/api/todos/overdue-count/route.ts`
- nhánh `dueFilter` trong `src/app/api/todos/route.ts`
- màu sắc/nhãn trong `src/components/todos/TodoListView.tsx` và `TodoKanbanView.tsx` (bỏ `isDueOverdue`/`isDueToday` cục bộ, dùng `classifyDue`).

### 3.2. API `GET /api/todos` — thêm tham số `mode`

Thêm tham số `mode` điều khiển *hình dạng tập kết quả* (giữ nguyên mọi tham số lọc hiện có). Mặc định `list` ⇒ tương thích ngược.

| `mode` | Dùng cho | Hành vi |
|---|---|---|
| `list` (mặc định) | View Danh sách | Phân trang như hiện tại (`page`/`pageSize`). |
| `board` | View Kanban | Bỏ phân trang: trả **toàn bộ việc chưa DONE** (cap `BOARD_OPEN_CAP = 200`) **+ N việc DONE gần nhất** (`BOARD_DONE_LIMIT = 20`, sắp theo `completedAt` desc). |
| `focus` | View Hôm nay | Trả **toàn bộ việc chưa DONE có `classifyDue ∈ {overdue, today}`** (cap `FOCUS_CAP = 200`), bỏ qua `dueFilter` (focus tự định nghĩa điều kiện). |

- `mode=focus` áp dụng theo `scope`/`assigneeId` hiện hành (Của tôi / Tất cả / một nhân viên) — manager có thể dùng làm màn hình triage trong ngày.
- `mode=list` còn nhận `sortBy`/`sortDir` (xem §3.6); `board`/`focus` sắp phía client.
- Các cap là hằng số trong `src/lib/todo-dates.ts` hoặc `constants.ts`.

### 3.3. Stats — định nghĩa lại "hôm nay"

`src/app/api/todos/stats/route.ts` và `src/lib/todo-page-data.ts`:
- Trường `today` (cũ = due-hôm-nay **OR** tạo-hôm-nay) → đổi thành **`dueToday`** = `chưa DONE & classifyDue == "today"`. Bỏ hẳn điều kiện `createdAt`.
- `overdue`, `inProgress`, `doneWeek` giữ nguyên ý nghĩa nhưng tính qua `getDayWindows`.

### 3.4. View "Hôm nay" — `src/components/todos/TodoTodayView.tsx` (mới)

- Là **chế độ mặc định** khi mở trang (lần đầu, chưa có `localStorage`).
- Bộ chuyển chế độ ở header đổi từ `[List] [Kanban]` thành **`[Hôm nay] [Danh sách] [Kanban]`**.
- Nội dung: nhận danh sách `focus` rồi tự nhóm bằng `classifyDue` thành 2 mục có tiêu đề:
  - **Quá hạn** (đỏ) — sắp theo `dueDate` tăng dần (cũ nhất trước).
  - **Đến hạn hôm nay** — sắp theo ưu tiên giảm dần rồi `dueDate`.
- Mỗi dòng: checkbox hoàn thành nhanh, tiêu đề (click mở `TodoDetailPanel`), badge ưu tiên, hạn, mã đơn liên kết (nếu có), nút xóa. Dùng lại các handler sẵn có (`onToggleComplete`, `onSelect`, `onStatusChange`, `onDelete`, `onViewOrder`) — **không** đụng `TodoListView`/`TodoKanbanView`.
- Rỗng → trạng thái rỗng tích cực: "Hết việc cần xử lý hôm nay 🎉".

### 3.5. Luồng dữ liệu & SSR bootstrap

- `view` (today | list | kanban) quyết định `mode` khi fetch: today→`focus`, list→`list`, kanban→`board`.
- **Bootstrap (`getTodosBootstrapData`) seed dữ liệu cho view mặc định (Hôm nay):** trả danh sách `focus` (overdue + today, cap 200, kèm `assignee`/`createdBy`/`linkedOrder`/`_count`) thay cho trang-1 "mine". Nhờ vậy màn hình Hôm nay hiện ngay, không nhấp nháy loading.
- Khi người dùng (hoặc `localStorage`) chọn view khác today → `TodosClient` fetch `mode` tương ứng (có spinner ngắn). Tận dụng cơ chế `skipInitialFetchRef` hiện có.
- `TodoBootstrapData` (`src/lib/todo-bootstrap-state.ts`) cập nhật: thay `todos`/`pagination` của "mine" bằng `focusTodos`; `shouldFetchTodoBootstrap` điều chỉnh theo focus.

### 3.6. Sắp xếp ở List & Kanban

**List — sắp phía máy chủ (đúng qua mọi trang):**
- `GET /api/todos` (`mode=list`) nhận thêm `sortBy ∈ {priority, dueDate, createdAt, completedAt, assignee, title}` và `sortDir ∈ {asc, desc}`.
- Tách hàm thuần `buildTodoOrderBy(sortBy, sortDir)` (test được) dựng mảng `orderBy` cho Prisma:
  - `dueDate`/`completedAt` → `nulls: "last"`.
  - `assignee` → `{ assignee: { name: dir } }`.
  - luôn kèm tiebreaker ổn định `{ id: "asc" }`.
- **Không** có `sortBy` → giữ thứ tự mặc định hiện tại (`status asc, priority desc, dueDate asc nulls last, sortOrder asc`).
- UI `TodoListView`: bấm tiêu đề các cột sắp được (Ưu tiên, Thời hạn, Ngày tạo, Hoàn thành, Người PT, Tiêu đề) → đổi `sortBy`; bấm lại cột đang sắp → đảo `sortDir`. Cột đang sắp hiện mũi tên ↑/↓. Các cột Mã đơn, Nguồn, cột thao tác **không** bấm; cột Trạng thái loại khỏi danh sách sắp để tránh nhầm với select đổi trạng thái trên từng dòng.
- Đổi sort → quay về trang 1.

**Kanban — sắp phía client (vì `mode=board` đã nạp đủ việc):**
- Mỗi cột có bộ chọn "Sắp xếp": **Thủ công** (mặc định) | Ưu tiên | Thời hạn | Ngày tạo — độc lập theo từng cột.
- **Thủ công** = giữ `sortOrder` + kéo-thả đổi thứ tự trong cột (như hiện tại).
- Chọn một trường → sắp client-side các thẻ trong cột theo trường đó; **bỏ qua** thao tác kéo-đổi-thứ-tự trong cùng cột (drag-end cùng cột khi đang sắp theo trường → không ghi `sortOrder`, không gọi reorder). Kéo **sang cột khác** vẫn đổi trạng thái như cũ.

**Ghi nhớ lựa chọn:** `localStorage` lưu sort của List (`{by, dir}`) và sort từng cột Kanban; áp lại khi mở lại trang.

## 4. Các tệp bị ảnh hưởng

**Mới**
- `src/lib/todo-dates.ts`
- `src/lib/todo-order.ts` — `buildTodoOrderBy(sortBy, sortDir)` (sắp List phía server).
- `src/components/todos/TodoTodayView.tsx`
- `src/__tests__/lib/todo-dates.test.ts`
- `src/__tests__/lib/todo-order.test.ts`

**Sửa**
- `src/lib/todo-page-data.ts` — dùng `todo-dates`; seed `focusTodos`; `dueToday`.
- `src/lib/todo-bootstrap-state.ts` (+ kiểu dữ liệu) — trường focus; điều kiện fetch.
- `src/app/api/todos/route.ts` — tham số `mode`; `dueFilter` qua `todo-dates`; `sortBy`/`sortDir` qua `buildTodoOrderBy`.
- `src/app/api/todos/stats/route.ts` — `dueToday`; mốc qua `todo-dates`.
- `src/app/api/todos/reminders/route.ts`, `src/app/api/todos/overdue-count/route.ts` — mốc qua `todo-dates`.
- `src/types/todo.ts` — `TodoStats`: `today` → `dueToday`.
- `src/hooks/useTodos.ts` — `fetchTodos` nhận `mode` + `sortBy`/`sortDir`; ánh xạ view→mode.
- `src/hooks/useTodoStats.ts` — theo trường `dueToday`.
- `src/components/todos/TodosClient.tsx` — thêm view "today" (mặc định), nối `mode`, render `TodoTodayView`; giữ state sort List (`{by, dir}`) + sort từng cột Kanban, lưu/đọc `localStorage`, truyền xuống các view.
- `src/components/todos/TodoSummaryCards.tsx` — thẻ 1 "Đến hạn hôm nay" (dueToday), click → `dueFilter=today`.
- `src/components/todos/TodoListView.tsx` — màu/nhãn dùng `classifyDue`; tiêu đề cột bấm để sắp + mũi tên ↑/↓ (props `sortBy`/`sortDir`/`onSortChange`).
- `src/components/todos/TodoKanbanView.tsx` — màu/nhãn dùng `classifyDue`; bỏ `.slice(0,10)` (đã nhận đủ việc từ `mode=board`); bộ chọn sắp xếp mỗi cột + sắp client-side; bỏ qua reorder-trong-cột khi đang sắp theo trường.
- `src/components/todos/constants.ts` — hằng số cap (nếu đặt ở đây).

## 5. Xử lý lỗi & ca biên

- `dueDate = null` → `classifyDue = "none"`, không tô màu, không vào focus.
- Việc DONE → không bao giờ overdue/today; trong Kanban vẫn nằm cột DONE (giới hạn `BOARD_DONE_LIMIT`).
- Giao thời nửa đêm: mọi so sánh dùng cùng `getDayWindows(now)` một lần cho mỗi request/lần render → không lệch trong cùng thao tác.
- Tuần bắt đầu Thứ Hai; Chủ Nhật thuộc tuần đang diễn ra.
- Cap `focus`/`board` đạt trần (hiếm với board cá nhân): hiển thị bình thường phần đã lấy; chấp nhận không phân trang ở các view này trong Spec A.
- `mode` không hợp lệ → coi như `list`.

## 6. Kiểm thử

**Mới — `todo-dates.test.ts`:**
- `getDayWindows`: đầu/cuối hôm nay theo +07:00; ca nửa đêm (vd 23:30 và 00:30 giờ VN); tuần bắt đầu Thứ Hai; Chủ Nhật thuộc tuần hiện tại; override `APP_TZ_OFFSET`.
- `classifyDue`: overdue / today / upcoming / none; DONE → none; null → none; biên đúng `todayStart`/`todayEnd`.

**Mới — `todo-order.test.ts`:**
- `buildTodoOrderBy`: từng trường (priority, dueDate, completedAt, assignee, title) × hai chiều; `dueDate`/`completedAt` để `nulls: "last"`; luôn có tiebreaker `id`; `sortBy` rỗng → mảng mặc định.

**Giữ xanh / cập nhật:**
- `src/__tests__/app/todos-page.test.tsx` — cập nhật theo view mặc định "Hôm nay" và nhãn KPI mới.
- `src/__tests__/lib/todo-bootstrap-state.test.ts` — theo `focusTodos`.
- `src/__tests__/lib/todo-scope.test.ts`, `todos-route-permissions.test.ts`, `todos-occ-route.test.ts` — đảm bảo không hồi quy.
- `verify:text-encoding` (todos) — các chuỗi tiếng Việt mới phải đúng mã (không escape `\uXXXX` sai).

**Tiêu chí hoàn thành:**
1. Một việc hạn "hôm nay 14:00", xem lúc 16:00: List/Kanban **không** tô đỏ; vẫn nằm "Đến hạn hôm nay" ở KPI và view Hôm nay. Sang ngày mới: chuyển sang "Quá hạn" ở mọi nơi.
2. Thẻ "Đến hạn hôm nay" và "Quá hạn" là hai số riêng, không đếm chồng; việc tạo-hôm-nay-hạn-tuần-sau **không** lọt vào "Đến hạn hôm nay".
3. Kanban hiển thị toàn bộ việc chưa DONE (không bị giới hạn 1 trang) + tối đa 20 việc DONE gần nhất.
4. Mở trang lần đầu vào thẳng view "Hôm nay" với 2 nhóm Quá hạn / Đến hạn hôm nay.
5. List: bấm cột "Thời hạn" sắp tăng dần, bấm lại giảm dần, mũi tên hiển thị đúng; sort đúng xuyên suốt mọi trang (server-side) và quay về trang 1 khi đổi sort.
6. Kanban: chọn "Ưu tiên" ở cột "Đang làm" → thẻ sắp theo ưu tiên; kéo trong cột không đổi thứ tự; kéo sang cột khác vẫn đổi trạng thái. Lựa chọn sắp xếp (List & từng cột Kanban) được nhớ qua `localStorage`.
7. Toàn bộ test xanh; không hồi quy ở quyền và optimistic-lock.
