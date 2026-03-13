---
name: execute-matrix
description: >
  Master orchestration skill for the Shipping Management Web Application project.
  ALWAYS activate this skill FIRST before any task. This skill determines which
  other installed skills to load based on the current task context.
  Use when: starting any new task, planning implementation, switching between features,
  or when unsure which skills apply.
  Do not use when: answering simple questions that don't involve code changes.
---

# Agent Execute Matrix — Shipping Management App

## Purpose
You are building a full-stack Shipping Management Web Application for a Vietnamese
shipping brokerage company. This matrix is your decision engine. ALWAYS consult it
before starting any task. It maps every task to the exact skills you must load.

## Project Context
- **Stack**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui,
  Prisma ORM, PostgreSQL, NextAuth.js / Supabase Auth, SheetJS, Recharts, Zustand
- **UI Language**: Vietnamese (all labels, messages, placeholders, buttons)
- **Code Language**: English (variables, functions, comments, commits)
- **Scale**: ~10,000 orders/month, ~100,000 orders/year, 5-20 users
- **Deploy**: Vercel (frontend + API) + Supabase/Neon (PostgreSQL)
- **Currency**: VND with thousand separators (150.000đ)
- **Timezone**: UTC+7 (Asia/Ho_Chi_Minh)

## Installed Skills Registry

You have exactly 14 skills available. Do NOT reference skills outside this list.

| # | Skill Name | Domain | Use For |
|---|-----------|--------|---------|
| 1 | `api-design` | Backend | REST API endpoints, route structure, status codes, request/response patterns |
| 2 | `auth-implementation-patterns` | Security | Authentication flows, session handling, password hashing, token management |
| 3 | `backend-architecture` | Backend | Server-side structure, middleware, error handling, service layers |
| 4 | `data-analysis` | Data | Data processing logic, aggregation queries, Excel data transformation |
| 5 | `frontend-design` | UI | Visual design, layout, component composition, color, spacing |
| 6 | `fullstack-developer` | General | End-to-end feature implementation, project structure, integration |
| 7 | `nextjs-supabase-auth` | Auth | Next.js + Supabase authentication, row-level security, session |
| 8 | `postgres-patterns` | Database | SQL optimization, indexing, query patterns, database design |
| 9 | `prisma-expert` | ORM | Prisma schema, migrations, queries, relations, upsert patterns |
| 10 | `typescript` | Language | Type safety, interfaces, generics, strict mode patterns |
| 11 | `ui-ux-pro-max` | UI/UX | Advanced UI patterns, user experience, interactions, accessibility |
| 12 | `vercel-deploy` | DevOps | Vercel deployment, environment variables, build config |
| 13 | `vercel-react-best-practices` | Frontend | React performance, component patterns, state management, rendering |
| 14 | `execute-matrix` | Orchestration | This file — skill selection and task routing |

---

## DECISION MATRIX

### PHASE 1: Project Initialization

| Task | Load These Skills | Max | Notes |
|------|------------------|-----|-------|
| Create Next.js project + folder structure | `fullstack-developer`, `typescript` | 2 | App Router only. Structure: src/app/(auth)/, src/app/(dashboard)/ |
| Install + configure Tailwind CSS + shadcn/ui | `frontend-design`, `ui-ux-pro-max` | 2 | Follow shadcn/ui CLI setup |
| Setup Prisma + connect PostgreSQL | `prisma-expert`, `postgres-patterns` | 2 | Create all models before running migrate |
| Configure environment variables | `fullstack-developer`, `vercel-deploy` | 2 | .env.local for dev, Vercel env for prod |
| Create seed data script | `prisma-expert`, `fullstack-developer` | 2 | Admin + Manager + 2 Staff + 50 orders + sample data |

### PHASE 2: Authentication & User Management

| Task | Load These Skills | Max | Notes |
|------|------------------|-----|-------|
| Setup authentication system | `nextjs-supabase-auth`, `auth-implementation-patterns` | 2 | Credentials provider, bcrypt password hash |
| Build login page UI | `frontend-design`, `ui-ux-pro-max` | 2 | Vietnamese labels. Clean, professional design |
| Implement RBAC middleware | `auth-implementation-patterns`, `backend-architecture` | 2 | 4 roles: ADMIN, MANAGER, STAFF, VIEWER |
| Auto-track login/logout time | `auth-implementation-patterns`, `prisma-expert` | 2 | Record in LoginHistory table on auth events |
| User management page (Admin) | `frontend-design`, `prisma-expert`, `api-design` | 3 | CRUD users, activate/deactivate, reset password |
| Sidebar + Header layout | `frontend-design`, `ui-ux-pro-max`, `vercel-react-best-practices` | 3 | Collapsible sidebar, role-based menu items |

### PHASE 3: Order Management (CORE FEATURE)

| Task | Load These Skills | Max | Notes |
|------|------------------|-----|-------|
| Excel upload UI (drag-drop + file picker) | `frontend-design`, `ui-ux-pro-max` | 2 | Show file info, progress bar |
| Excel parsing engine | `fullstack-developer`, `data-analysis`, `typescript` | 3 | SheetJS library. Handle .xlsx/.xls/.csv |
| Column mapping interface | `frontend-design`, `data-analysis` | 2 | Map Excel columns → DB fields. Save templates per carrier |
| Order upsert logic (new + update) | `prisma-expert`, `backend-architecture`, `postgres-patterns` | 3 | CRITICAL: Match on orderCode. Use Prisma upsert. Batch processing for performance |
| Upload history + error logging | `prisma-expert`, `api-design` | 2 | Log: fileName, totalRows, newOrders, updatedOrders, failedRows, errorDetails |
| Order data table | `frontend-design`, `vercel-react-best-practices`, `ui-ux-pro-max` | 3 | Pagination (20/50/100), search, filter by status/carrier/date, sort |
| Order detail page | `frontend-design`, `prisma-expert` | 2 | Full order info + update history |
| Export filtered orders to Excel | `fullstack-developer`, `data-analysis` | 2 | SheetJS write. Export current filter results |

### PHASE 4: Dashboard

| Task | Load These Skills | Max | Notes |
|------|------------------|-----|-------|
| Dashboard layout + summary cards | `frontend-design`, `ui-ux-pro-max` | 2 | Cards: total orders, by status, revenue |
| Charts (line, bar, pie) | `vercel-react-best-practices`, `frontend-design` | 2 | Use Recharts. Order trends, status distribution, carrier performance |
| Dashboard data queries | `prisma-expert`, `postgres-patterns` | 2 | Optimize aggregation queries. Add proper indexes |
| Role-based dashboard content | `backend-architecture`, `auth-implementation-patterns` | 2 | STAFF: operational only. MANAGER/ADMIN: + financial metrics |
| Activity feed | `prisma-expert`, `frontend-design` | 2 | Recent uploads, status changes, new claims |

### PHASE 5: Delayed Order Care (Đơn Hoãn)

| Task | Load These Skills | Max | Notes |
|------|------------------|-----|-------|
| Filter delayed orders from data | `prisma-expert`, `data-analysis` | 2 | Query orders where status = delayed/failed delivery |
| Delayed order list UI | `frontend-design`, `ui-ux-pro-max` | 2 | Show: orderCode, customer, carrier, reason, days delayed. Color-code urgency |
| Integrate user's existing HTML page | `fullstack-developer`, `frontend-design` | 2 | Option A: iframe embed. Option B: convert to React component. Ask user preference |
| Contact tracking (mark contacted/resolved) | `prisma-expert`, `api-design` | 2 | Add notes, timestamp, who contacted |

### PHASE 6: Return Order Tracking (Đơn Hoàn)

| Task | Load These Skills | Max | Notes |
|------|------------------|-----|-------|
| Return tracking page with tabs | `frontend-design`, `ui-ux-pro-max`, `vercel-react-best-practices` | 3 | Tab 1: "Đang hoàn" (Returning). Tab 2: "Đã về kho" (At Warehouse) |
| Return confirmation workflow | `backend-architecture`, `prisma-expert`, `api-design` | 3 | Button "Xác nhận đã trả khách". Record: who, when, notes |
| Return summary cards | `frontend-design`, `prisma-expert` | 2 | Counts: returning, at warehouse, returned this month |
| Filter: return type, date, customer | `prisma-expert`, `frontend-design` | 2 | Full/Partial return filter |

### PHASE 7: Claims & Compensation (Bồi hoàn/Khiếu nại)

| Task | Load These Skills | Max | Notes |
|------|------------------|-----|-------|
| New claim form | `frontend-design`, `prisma-expert`, `ui-ux-pro-max` | 3 | Enter orderCode → auto-fetch order details → fill claim info |
| Claim status workflow | `backend-architecture`, `prisma-expert` | 2 | State machine: Pending → Submitted → In Review → Approved/Rejected → Compensated |
| Deadline reminder system | `fullstack-developer`, `vercel-react-best-practices` | 2 | Yellow highlight: ≤3 days to deadline. Red: overdue. Browser notification optional |
| Claims list + dashboard | `frontend-design`, `prisma-expert`, `data-analysis` | 3 | Filter by status. Summary: total, pending amount, compensated amount |

### PHASE 8: Todo / Kanban

| Task | Load These Skills | Max | Notes |
|------|------------------|-----|-------|
| Todo list view | `frontend-design`, `vercel-react-best-practices` | 2 | Sortable, filterable. Priority color-coding |
| Kanban board with drag-drop | `frontend-design`, `ui-ux-pro-max`, `vercel-react-best-practices` | 3 | Columns: Todo → In Progress → Review → Done. Use @hello-pangea/dnd |
| List ↔ Kanban view toggle | `vercel-react-best-practices`, `typescript` | 2 | Shared Zustand store, different render views |
| Personal vs Team view | `backend-architecture`, `auth-implementation-patterns` | 2 | STAFF: own tasks. MANAGER: all tasks |

### PHASE 9: Attendance & Employee Tracking

| Task | Load These Skills | Max | Notes |
|------|------------------|-----|-------|
| Auto check-in on login | `auth-implementation-patterns`, `prisma-expert` | 2 | Hook into NextAuth/Supabase auth callback |
| Auto check-out on logout/session expire | `auth-implementation-patterns`, `backend-architecture` | 2 | Calculate session duration |
| Attendance calendar view | `frontend-design`, `ui-ux-pro-max` | 2 | Monthly calendar grid. Color by status |
| Employee scoring form (Manager) | `frontend-design`, `prisma-expert`, `api-design` | 3 | Monthly scoring with criteria. MANAGER/ADMIN only |
| Login history + session duration | `prisma-expert`, `frontend-design` | 2 | Table with login time, logout time, duration, IP |
| Export attendance to Excel | `data-analysis`, `fullstack-developer` | 2 | SheetJS write |

### PHASE 10: Financial Reports (MANAGER/ADMIN only)

| Task | Load These Skills | Max | Notes |
|------|------------------|-----|-------|
| Financial calculation logic | `data-analysis`, `prisma-expert`, `postgres-patterns` | 3 | Revenue = shippingFee. Cost = carrierFee. Profit = Revenue - Cost. COD tracking |
| Financial charts | `vercel-react-best-practices`, `frontend-design` | 2 | Recharts: Revenue/Cost/Profit line chart, Revenue by carrier bar chart |
| Top customers report | `data-analysis`, `prisma-expert` | 2 | Rank by order volume and revenue |
| Export financial report | `data-analysis`, `fullstack-developer` | 2 | Excel export with SheetJS |
| Access restriction | `auth-implementation-patterns`, `backend-architecture` | 2 | MANAGER/ADMIN only. Hide from STAFF/VIEWER |

### PHASE 11: Testing, Polish & Deploy

| Task | Load These Skills | Max | Notes |
|------|------------------|-----|-------|
| Test authentication + RBAC | `typescript`, `backend-architecture` | 2 | Test all 4 roles can/cannot access correct routes |
| Test Excel upload edge cases | `typescript`, `data-analysis` | 2 | Duplicate detection, empty rows, wrong format, large files |
| Performance optimization | `vercel-react-best-practices`, `postgres-patterns` | 2 | Add DB indexes, optimize queries, lazy load components |
| Responsive design check | `ui-ux-pro-max`, `frontend-design` | 2 | Desktop (primary) + tablet. Test all pages |
| Deploy to Vercel | `vercel-deploy`, `fullstack-developer` | 2 | Connect Git, set env vars, run prisma migrate deploy |
| Production database setup | `prisma-expert`, `postgres-patterns`, `vercel-deploy` | 3 | Supabase/Neon prod DB, connection pooling |

---

## SKILL COMBINATION RULES

### Hard Rules (NEVER break)
1. **Always start here** — consult this matrix BEFORE writing any code
2. **Max 3 skills per task** — loading more wastes context and reduces quality
3. **Vietnamese UI** — every user-facing string must be Vietnamese
4. **English code** — all variables, functions, types, comments in English
5. **Type safety** — load `typescript` skill whenever defining new interfaces or complex types

### Soft Rules (Follow unless you have a good reason)
6. **UI tasks** → always pair `frontend-design` + one of (`ui-ux-pro-max` OR `vercel-react-best-practices`)
7. **Database tasks** → always pair `prisma-expert` + `postgres-patterns`
8. **API tasks** → always pair `api-design` + `backend-architecture`
9. **Auth tasks** → always pair `auth-implementation-patterns` + `nextjs-supabase-auth`
10. **Data processing** → always include `data-analysis` for Excel/aggregation work

### Skill Affinity Map (which skills work best together)

```
frontend-design ←→ ui-ux-pro-max           (UI design pair)
frontend-design ←→ vercel-react-best-practices  (UI + React performance pair)
prisma-expert ←→ postgres-patterns          (Database pair)
api-design ←→ backend-architecture          (Server pair)
auth-implementation-patterns ←→ nextjs-supabase-auth  (Auth pair)
data-analysis ←→ prisma-expert              (Data processing pair)
fullstack-developer ←→ typescript           (General development pair)
vercel-deploy ←→ fullstack-developer        (Deployment pair)
```

---

## QUALITY GATES

Before completing ANY task, verify ALL applicable items:

### Code Quality
- [ ] Zero `any` types in TypeScript (use proper interfaces)
- [ ] All async operations wrapped in try-catch
- [ ] All API routes validate input (use Zod or similar)
- [ ] No hardcoded strings — use constants or i18n

### Security
- [ ] Every API route checks authentication (getServerSession or equivalent)
- [ ] Sensitive routes check role authorization
- [ ] Passwords hashed with bcrypt (never stored in plain text)
- [ ] No secrets in client-side code

### UI/UX
- [ ] All text in Vietnamese
- [ ] Loading skeleton shown while fetching data
- [ ] Error state with user-friendly Vietnamese message
- [ ] Empty state with helpful message when no data
- [ ] Toast notifications for success/error actions
- [ ] Responsive: works on desktop (1280px+) and tablet (768px+)

### Database
- [ ] Proper indexes on columns used in WHERE, ORDER BY, JOIN
- [ ] Pagination on all list queries (never fetch unlimited rows)
- [ ] orderCode column indexed (most queried field)

### Performance
- [ ] Order table queries use pagination (default 20 rows)
- [ ] Large Excel files processed in batches (500 rows per batch)
- [ ] Dashboard queries use database aggregation, not client-side calculation

---

## ERROR RECOVERY PROTOCOL

When you encounter an error during any task:

### Step 1: Classify the error
- **Build error** → Check `typescript` skill for type fixes
- **Runtime error** → Check `backend-architecture` for error handling patterns
- **Database error** → Check `prisma-expert` + `postgres-patterns`
- **Auth error** → Check `auth-implementation-patterns` + `nextjs-supabase-auth`
- **UI error** → Check `vercel-react-best-practices`
- **Deploy error** → Check `vercel-deploy`

### Step 2: Fix attempt
- Load the relevant skill(s) from Step 1
- Apply the fix pattern from the skill
- Test the fix

### Step 3: If still stuck
Present to the user:
1. What task you were working on
2. The exact error message
3. Which skills you consulted
4. 2-3 proposed solutions, ranked by likelihood of success
