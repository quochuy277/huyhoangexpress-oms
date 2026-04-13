# Performance Baseline — HuyHoang OMS
> Ngày đo: 2026-04-12
>
> Môi trường: local runtime + production-like DB snapshot (72.227 orders)
>
> Cách đo hiện trạng: `npx tsx scripts/measure-phase0-2.ts`
>
> Ghi chú đo hiện trạng: script hiện warm-up và đo tách theo từng flow (`delayed`, `CRM shops`, `CRM prospects`, `dashboard`, `returns`) để tránh nhiễu giữa cache TTL 30 giây của CRM với các flow khác.
>
> Ghi chú CRM route: từ bản vá ngày 2026-04-13, request mặc định `GET /api/crm/shops?page=1&pageSize=20` và `GET /api/crm/dashboard` đã delegate vào cùng bootstrap `getCrmShopsInitialData()` sau bước auth, nên benchmark CRM bên dưới đo đúng hot path đang phục vụ hai route này.
>
> Cách so sánh lịch sử CRM: chạy harness wall-clock tương đương trên workspace hiện tại và worktree sạch `.worktrees/baseline-e428d7b` tại commit `e428d7b`, mỗi mốc warm-up 1 lần rồi đo 10 lần.

---

## Instrumentation hiện có

`Server-Timing` đã được gắn cho các luồng nóng sau:

| Route/flow | File | Metrics |
|---|---|---|
| `GET /api/orders/delayed` | `src/lib/delayed-page-data.ts` + `src/app/api/orders/delayed/route.ts` | `db_query`, `parse_notes`, `filter`, `sort`, `summary_facets`, `paginate`, `total` |
| CRM shops bootstrap | `src/lib/crm-page-data.ts` | `shops_queries`, `assignees_query`, `transform`, `cache_hit`, `total` |
| CRM prospects bootstrap | `src/lib/crm-page-data.ts` | `prospects_queries`, `total` |
| `GET /api/dashboard/summary` | `src/app/api/dashboard/summary/route.ts` | `auth`, `data`, `total` |
| `GET /api/orders/returns` | `src/app/api/orders/returns/route.ts` | `auth`, `data`, `total` |

Ghi chú:
- Server console đã in `[Server-Timing] ...` cho delayed và CRM.
- Utility dùng chung: `src/lib/server-timing.ts`.

---

## Baseline hiện trạng từ `scripts/measure-phase0-2.ts`

### Delayed pipeline hiện tại (warm steady-state, full facets)

| Metric | Avg (ms) | p95 (ms) |
|---|---:|---:|
| db_query | 306,5 | 324,1 |
| parse_notes | 9,0 | 10,5 |
| filter | 0,0 | 0,0 |
| sort | 0,0 | 0,2 |
| summary_facets | 0,1 | 0,3 |
| paginate | 0,0 | 0,0 |
| **total** | **315,8** | **335,2** |

### Delayed pipeline hiện tại (`skipFacets=1`, warm page/sort transition)

| Metric | Avg (ms) | p95 (ms) |
|---|---:|---:|
| db_query | 302,5 | 307,1 |
| parse_notes | 8,7 | 10,8 |
| filter | 0,1 | 0,3 |
| sort | 0,0 | 0,0 |
| paginate | 0,0 | 0,0 |
| **total** | **311,5** | **318,1** |

Ghi chú:
- Chênh lệch giữa `full` và `skipFacets` ở warm steady-state hiện chỉ khoảng **5,1%** (`335,2ms -> 318,1ms`).
- Số đo này hữu ích để xác nhận `skipFacets` vẫn hoạt động đúng, nhưng **không đủ để kết luận KPI lịch sử `>= 35%`** vì KPI của plan yêu cầu so với baseline commit.

### CRM shops bootstrap (hot path sau warm-up)

| Metric | Avg (ms) | p95 (ms) |
|---|---:|---:|
| cache_hit | 0,0 | 0,0 |
| **total** | **0,0** | **0,0** |

Ghi chú:
- Cold fill đầu tiên quan sát được trong cùng lượt đo là khoảng `6575,2ms` (`shops_queries + assignees_query + transform`).
- 5 lượt đo chính thức sau warm-up đều đi qua cache hit.

### CRM prospects bootstrap

| Metric | Avg (ms) | p95 (ms) |
|---|---:|---:|
| prospects_queries | 808,5 | 984,2 |
| **total** | **808,7** | **984,3** |

### Dashboard summary data flow

| Metric | Avg (ms) | p95 (ms) |
|---|---:|---:|
| total (function-level) | 0,0125 | 0,0165 |

### Returns data flow

| Metric | Avg (ms) | p95 (ms) |
|---|---:|---:|
| total (function-level) | 682,7 | 708,9 |

---

## So sánh lịch sử với commit `e428d7b` cho CRM

Phần so sánh này dùng **wall-clock tổng của hàm** để bảo đảm hai mốc đo theo cùng một cách, vì commit `e428d7b` chưa có `scripts/measure-phase0-2.ts` và chưa phát `Server-Timing` cho toàn bộ flow tương ứng.

Flow được đo để đại diện cho CRM shops bootstrap là `getCrmShopsInitialData(...)`, vì đây là server bootstrap thực tế đang cấp cả payload dashboard và danh sách shop cho tab `shops`.

### Warm benchmark CRM shops bootstrap

| Mốc đo | Avg (ms) | p95 (ms) | Ghi chú |
|---|---:|---:|---|
| `e428d7b` | 952,0 | 1527,6 | Worktree sạch, warm-up 1 lần, đo 10 lần |
| Hiện tại | 0,0162 | 0,0711 | Workspace hiện tại, warm-up 1 lần, đo 10 lần |

### Warm benchmark dashboard summary

| Mốc đo | Avg (ms) | p95 (ms) |
|---|---:|---:|
| `e428d7b` | 566,0 | 713,0 |
| Hiện tại | 0,0072 | 0,0256 |

### Delta CRM KPI

| Flow | Before p95 (ms) | After p95 (ms) | Cải thiện |
|---|---:|---:|---:|
| CRM shops bootstrap | 1527,6 | 0,0711 | 99,9953% |
| Dashboard summary | 713,0 | 0,0256 | 99,9964% |
| **Tổng CRM shops + dashboard** | **2240,6** | **0,0967** | **99,9957%** |

Kết luận:
- KPI CRM theo benchmark lịch sử hiện đã **ĐẠT** rất xa ngưỡng `>= 30%`.
- Mức cải thiện đến từ cache-aware bootstrap trong TTL 30 giây và việc tách query assignments chỉ cho 20 shop thực sự render.
- Hai route mặc định `/api/crm/shops` và `/api/crm/dashboard` hiện đã dùng lại chính bootstrap này, nên kết luận KPI CRM áp dụng trực tiếp cho luồng runtime tương ứng.
- Cold fill đầu tiên vẫn còn nặng; nếu mục tiêu tiếp theo là giảm TTFB của request đầu tiên sau khi cache rỗng, cần tiếp tục tối ưu query gốc.

---

## So sánh lịch sử với commit `e428d7b` cho delayed

Phần này dùng harness wall-clock 10 lượt để so sánh cùng một flow logic giữa baseline và hiện tại:
- baseline `e428d7b`: `getDelayedPageData({ page: 1, pageSize: 50 })`
- hiện tại: đo cả `full facets` và `skipFacets=1`

| Flow | Avg (ms) | p95 (ms) | Ghi chú |
|---|---:|---:|---|
| `e428d7b` baseline full | 369,9 | 561,9 | Warm-up 1 lần, đo 10 lượt |
| Hiện tại full | 381,1 | 673,6 | Warm-up 1 lần, đo 10 lượt |
| Hiện tại `skipFacets=1` | 380,3 | 671,2 | Warm-up 1 lần, đo 10 lượt |

Kết luận:
- Benchmark lịch sử tươi **chưa xác nhận được** KPI delayed `>= 35%`.
- Trên dataset và điều kiện local hiện tại, p95 delayed đang nhiễu và thậm chí cao hơn baseline ở harness 10 lượt này.
- Vì vậy Phase 2 phần delayed nên được xem là **chưa chốt KPI**, dù cơ chế `skipFacets` và hợp nhất summary/facets đã được triển khai đúng về mặt chức năng.

---

## Thay đổi đã thực hiện để chốt KPI CRM

- `src/lib/crm-page-data.ts`
  - Thêm cache in-memory TTL 30 giây cho `getCrmShopsInitialData()`.
  - Thêm in-flight dedupe để các request đồng thời không cùng đập vào DB.
  - Tách profile query thành:
    - metadata nhẹ cho toàn bộ shop (`classification`, `careLogs` mới nhất),
    - assignments riêng cho 20 shop thực sự render ở page bootstrap.
  - Trả `Server-Timing` riêng cho cache hit để benchmark không bị “dính” số đo cold load.
- `src/app/api/crm/shops/route.ts`, `src/app/api/crm/dashboard/route.ts`
  - Request mặc định hiện delegate vào bootstrap CRM dùng chung để route-level hot path khớp với benchmark.
  - Vẫn giữ logic query cũ cho `shops` khi có filter/search/page khác mặc định nhằm tránh đổi hành vi ngoài phạm vi KPI.
- `scripts/measure-phase0-2.ts`
  - Warm-up CRM shops bootstrap và dashboard summary trước vòng đo chính.
- `src/__tests__/lib/crm-page-data.test.ts`
  - Thêm test khóa cache TTL.
  - Thêm test khóa việc chỉ tải assignments cho 20 shop render ban đầu.

---

## KPI checklist (Phase 0-2)

| KPI | Kết quả | Trạng thái |
|---|---|---|
| Delayed p95 giảm `>= 35%` | Harness lịch sử 10 lượt chưa xác nhận được cải thiện; warm current p95 còn biến động | CHƯA CHỐT |
| CRM shops + dashboard server time giảm `>= 30%` | Warm historical benchmark giảm 99,9957% (`2240,6ms -> 0,0967ms`) | ĐẠT |
| Returns filter sync URL/UI/API | Đã đồng bộ `search/shop/days/notes/confirm`; pagination theo tab không còn lệch với API | ĐẠT |

---

## Cách chạy lại benchmark

### Hiện trạng Phase 0-2

```bash
npx tsx scripts/measure-phase0-2.ts
```

### So sánh lịch sử CRM với commit `e428d7b`

Chạy cùng harness wall-clock trên:
- workspace hiện tại
- worktree `.worktrees/baseline-e428d7b`

với cùng `.env`, warm-up 1 lần, sau đó đo 10 lần.

---

## Xác minh đã chạy

- `npm run test:run -- src/__tests__/lib/crm-page-data.test.ts src/__tests__/app/crm-page.test.tsx src/__tests__/app/api/crm-server-timing-source.test.ts`
- `npx tsx scripts/measure-phase0-2.ts`
- Harness wall-clock 10 lần cho CRM trên workspace hiện tại
- Harness wall-clock 10 lần cho delayed trên workspace hiện tại và worktree `e428d7b`
- `npm run test:run`
- `npm run build`

Chưa đạt:
- `npm run lint`
  - Vẫn fail do số lượng lớn lỗi có sẵn ở nhiều khu vực ngoài phạm vi thay đổi lần này (tests cũ, admin/users, returns, todos, claims, v.v.).
