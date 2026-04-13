# CRM Bootstrap KPI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Giảm thời gian bootstrap CRM shops đủ để benchmark lịch sử vượt ngưỡng KPI bằng cách cắt payload dư thừa và thêm cache TTL ngắn cho flow bootstrap.

**Architecture:** Giữ nguyên contract dữ liệu của `getCrmShopsInitialData`, nhưng tách phần tải profile thành hai lớp: metadata nhẹ cho toàn bộ shop và assignments chỉ cho 20 shop thực sự render. Bọc toàn bộ flow bằng cache in-memory có TTL ngắn và in-flight dedupe để giảm truy vấn lặp lại giữa các request liên tiếp.

**Tech Stack:** Next.js 16, React 19, Prisma, Vitest

---

### Task 1: Khóa hành vi cache CRM bootstrap bằng test

**Files:**
- Create: `src/__tests__/lib/crm-page-data.test.ts`
- Modify: `src/lib/crm-page-data.ts`

- [ ] Viết test fail cho cache hit trong TTL và cache miss sau TTL.
- [ ] Chạy: `npm run test:run -- src/__tests__/lib/crm-page-data.test.ts`
- [ ] Xác nhận test fail vì cache/invalidation chưa tồn tại.

### Task 2: Giảm payload profile/assignments cho bootstrap shops

**Files:**
- Modify: `src/lib/crm-page-data.ts`
- Test: `src/__tests__/lib/crm-page-data.test.ts`

- [ ] Viết test fail xác nhận assignments chỉ được tải cho tập shop thực sự render ở page bootstrap.
- [ ] Refactor `getCrmShopsInitialData` để:
  - lấy metadata nhẹ cho toàn bộ profile,
  - lấy assignments riêng cho danh sách shop đã chọn hiển thị,
  - giữ nguyên shape dữ liệu trả về cho UI.
- [ ] Chạy lại test file để xác nhận pass.

### Task 3: Xác minh benchmark và tài liệu

**Files:**
- Modify: `docs/performance-baseline.md`

- [ ] Chạy lại benchmark CRM sau khi tối ưu.
- [ ] Nếu KPI CRM đạt, cập nhật `docs/performance-baseline.md` bằng tiếng Việt có dấu đầy đủ.
- [ ] Chạy xác minh cần thiết trước khi kết luận.
