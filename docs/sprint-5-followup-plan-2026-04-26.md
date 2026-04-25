# Sprint 5 — Follow-up Plan (Đóng nợ Sprint 1-4)

Ngày lập: 2026-04-26
Branch: `chore/sec-perf-ux-2026-04` → đã merge `main`

## Bối cảnh

Sau review của Codex (2026-04-25), 4 sprint trước đã ship phần lớn nhưng còn
nợ:

- **Sprint 2 DoD chưa đóng**: live perf measurements (LCP/INP/TBT) còn
  `_QA pending_`; ClaimsClient.tsx (1441 LOC) chưa refactor.
- **Hardening defense-in-depth còn nửa vời**: CSP report-only, server-side
  sanitize chưa làm, rate limiter in-memory.
- **Test suite có 1 timeout flaky**.

PR commit hôm nay (2026-04-26) đã đóng các phần **không cần con người + DB
production**:

- ✅ Fix 2 — testTimeout 15s global + 30s cho attendance-export route.
- ✅ Fix 4 — server-side `sanitizeHtml` (isomorphic-dompurify) áp dụng
  ở `POST /api/announcements`. 10 test mới pass.
- ✅ Fix 7 — schema + migration file `LoginAttempt`. Auth.ts wire insert
  non-blocking trên cả 3 path (rate-limit, user_not_found,
  invalid_password, ok). **Migration chưa apply lên production DB** — cần
  con người chạy `prisma migrate deploy` sau khi review SQL.
- ✅ Fix 8 — stale `.next/lock` cleanup.

## Còn nợ — cần con người

### P1 — Đóng Sprint 2 DoD

**1a. Lighthouse run (QA)**
```bash
npm run build && npm run start
# Chrome Incognito → DevTools → Lighthouse Performance
# Throttle: "Slow 4G" + "4x CPU slowdown" cho mobile
```
Lưu report vào `docs/perf-reports/2026-04-{NN}-{page}-{device}.html` cho
3 trang × 2 device = 6 report:
- `/orders` (Desktop, Mobile)
- `/claims` (Desktop, Mobile)
- `/finance` (Desktop, Mobile)

Điền 4 metric vào bảng section 7 của
`docs/performance-baseline-2026-04-22.md`:
- LCP (ms)
- INP (ms)
- TBT (ms)
- Bundle (KB gzip)

**1b. Profile ClaimsClient (sau khi có 1a)**

React DevTools Profiler → record 1 phiên tương tác
(mở filter, scroll, mở drawer, đổi status). Identify top 3 component
re-render nhiều nhất. Lưu screenshot/json vào `docs/perf-reports/`.

**1c. Refactor ClaimsClient** (sau khi có 1b)

Tách dựa trên measurement, ưu tiên:
- `<ClaimsFilters>` memo
- `<ClaimRow>` React.memo + custom equality
- Move state phụ (drawer/dialog open) sang URL state hoặc Zustand

Mục tiêu: < 800 LOC + giảm hooks count xuống ~20.

**1d. Section 8 delta** — Lighthouse lại sau refactor, ghi delta
INP/TBT vào section 8.

**Acceptance**: `docs/perf-reports/` có ≥ 6 file HTML; section 7+8 đã
điền số; ClaimsClient < 800 LOC.

---

### P1 — Apply LoginAttempt migration

```bash
# Sau khi review prisma/migrations/20260426000000_add_login_attempts/migration.sql
npx prisma migrate deploy
```

Lưu ý: Có drift trên DB hiện tại (xem output `prisma migrate dev` ngày
2026-04-26 — `PermissionGroup` schema). Cần đồng bộ drift trước khi
`migrate deploy` hoặc dùng `migrate resolve`.

**Acceptance**: Bảng `LoginAttempt` tồn tại trên prod DB; auth flow tạo
record mới khi user login thành công + thất bại.

---

### P2 — CSP enforced

CSP Report-Only đã chạy từ 2026-04-20. Đến 2026-04-27 đủ 7 ngày.

```bash
# Check log /api/csp-report
# Đếm violation theo violated-directive
```

Nếu < 5 violation/ngày liên tục 7 ngày → switch:

```diff
- key: "Content-Security-Policy-Report-Only",
+ key: "Content-Security-Policy",
```

Nếu có violation hợp lệ (Tailwind inline, Next bootstrap) → setup nonce
trong `proxy.ts` thay vì giữ `'unsafe-inline'`.

**Acceptance**: Header production response có `Content-Security-Policy`
(không `-Report-Only`).

---

### P2 — Rate limiter shared-store (chỉ nếu multi-instance)

Chỉ làm nếu production deploy multi-region/multi-instance. Single Vercel
hobby instance → defer.

```bash
npm i @upstash/ratelimit @upstash/redis
```

Refactor `createRateLimiter` thành 2 backend (in-memory cho dev/test,
Upstash cho prod) qua flag `process.env.RATE_LIMIT_BACKEND`.

Ưu tiên migrate: `loginLimiter` → `sensitiveWriteLimiter` →
`clientErrorLimiter` → others.

**Acceptance**: Integration test verify cùng IP từ 2 instance khác nhau
share counter.

---

### P3 — Cleanup nhỏ

- **a11y audit artifact**: Chạy axe DevTools trên 3 page, lưu
  `docs/a11y-audit-2026-04-{NN}.md`. Verify 0 critical issue.
- **Touch target check**: Mọi button/link ≥ 44×44px trên mobile.
- **Loading text**: Thay text "Đang tải..." còn lại ở
  ClaimsClient.tsx:848, ReturnsPageClient.tsx:29 sang skeleton.
- **Lint warnings**: Giảm 293 warnings, ưu tiên
  `src/lib/dashboard-overview-data.ts` (6 `any`),
  `src/lib/finance/page-data.ts`.

---

## Verification matrix

| Fix | Cmd verify | Trạng thái |
|-----|-----------|------------|
| 2 testTimeout | `npm run test:run` 3 lần liên tiếp xanh | ✅ Done |
| 4 sanitize | `npm run test:run -- sanitize.test.ts` 10/10 pass | ✅ Done |
| 7 LoginAttempt schema | `prisma migrate deploy` + query bảng | ⏳ Cần human |
| 1 perf baseline | `ls docs/perf-reports/*.html` ≥ 6 | ⏳ Cần human |
| 1c ClaimsClient | `wc -l src/components/claims/ClaimsClient.tsx` < 800 | ⏳ Cần data |
| 3 CSP enforced | `curl -I prod \| grep "Content-Security-Policy:"` | ⏳ Cần đợi 7d |
| 5 limiter shared | k6 load 2 instance share counter | ⏳ Cần multi-instance |
