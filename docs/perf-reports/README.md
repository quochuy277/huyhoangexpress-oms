# Performance Reports

Thư mục này chứa Lighthouse HTML reports và snapshot DevTools cho các
trang hot, dùng để điền vào `docs/performance-baseline-2026-04-22.md`
mục 7–8 và so sánh delta sau mỗi sprint perf.

## Ai điền

QA, hoặc dev đang chạy machine có Chrome + đủ tài nguyên để throttle
4× CPU + "Slow 4G" mà không ảnh hưởng kết quả. Dev agent (Claude Code,
CI headless) **không** chạy phần này vì Lighthouse đo DOM thật +
paint timing của browser thật, không phải node.

## Quy trình đo (Sprint 2 closing + Sprint 3 opening)

1. Checkout branch muốn đo (ví dụ `chore/sec-perf-ux-2026-04`).
2. `npm run build && npm run start`.
3. Mở Chrome **Incognito** (để loại extension noise), vào
   `http://localhost:3000`, đăng nhập bằng tài khoản staff có full
   quyền xem `/orders`, `/claims`, `/finance`.
4. Điều hướng đến trang cần đo, **đợi** list/chart load xong rồi mới
   mở DevTools (tránh Lighthouse throw warning "page was loading").
5. DevTools → **Lighthouse** tab.
6. Chọn:
   - Mode: **Navigation**
   - Device: **Mobile** hoặc **Desktop** (làm cả 2 cho `/orders` + `/claims`)
   - Categories: chỉ cần **Performance** (bỏ SEO/A11y/PWA cho nhanh)
   - Throttling: **Simulated throttling (default)** — Lighthouse sẽ
     tự mô phỏng 4× CPU + Slow 4G cho mobile.
7. Analyze → sau khi xong, **Export** (icon 3 chấm) → **Save as HTML**.
8. Đặt tên: `{YYYY-MM-DD}-{page}-{device}.html`, ví dụ:
   - `2026-04-25-orders-mobile.html`
   - `2026-04-25-orders-desktop.html`
   - `2026-04-25-claims-mobile.html`
   - `2026-04-25-claims-desktop.html`
   - `2026-04-25-finance-desktop.html`
9. Commit toàn bộ vào thư mục này.
10. Mở `docs/performance-baseline-2026-04-22.md`, điền 4 metric chính
    (LCP, INP, TBT, Bundle size) vào bảng section 7.

## Metric lấy từ đâu

- **LCP** (Largest Contentful Paint): bảng "Metrics" trong report.
- **INP** (Interaction to Next Paint): cần interact thật (click, scroll)
  — trong Navigation mode có thể không đo được; chuyển sang
  **Timespan** mode, vào trang → click filters / scroll list ~10s →
  stop. INP hiện trong bảng "Interactivity".
- **TBT** (Total Blocking Time): bảng "Metrics".
- **Bundle (KB gzip)**: Network tab (reload page, filter JS) → tổng
  size của các `.js` từ `/_next/static/chunks/`. Hoặc lấy từ
  Coverage tab → Unused bytes.

## Comparing runs

Đặt tên cùng ngày với commit hash ngắn để dễ so sánh:
`2026-04-25-9ffcad5-claims-mobile.html` vs
`2026-04-30-abc1234-claims-mobile.html`.

## Do NOT commit

- `.next/` build artifacts.
- Screenshot có PII (tên shop khách, số điện thoại) — chạy trên seed
  data hoặc blur trước khi commit.
