# HANDOFF_FEATURES.md — HuyHoang Express OMS Feature Inventory

> **Last updated:** 2026-04-01

---

## Table of Contents

1. [Dashboard (Tong Quan)](#1-dashboard--tổng-quan)
2. [Order Management (Quan ly Don Hang)](#2-order-management--quản-lý-đơn-hàng)
3. [Delayed Order Care (Cham soc Don Hoan)](#3-delayed-order-care--chăm-sóc-đơn-hoãn)
4. [Return Tracking (Theo doi Don Hoan)](#4-return-tracking--theo-dõi-đơn-hoàn)
5. [Claims (Khieu nai / Boi hoan)](#5-claims--khiếu-nại--bồi-hoàn)
6. [Todos (Cong Viec)](#6-todos--công-việc)
7. [Attendance (Cham Cong)](#7-attendance--chấm-công)
8. [Finance (Tai Chinh)](#8-finance--tài-chính)
9. [Employee Management (Quan ly Nhan Vien)](#9-employee-management--quản-lý-nhân-viên)
10. [Order Detail Page](#10-order-detail-page)
11. [CRM (Quan ly Khach Hang)](#11-crm--quản-lý-khách-hàng)
12. [Landing Page](#12-landing-page)
13. [Cross-Cutting Features](#13-cross-cutting-features)

---

## 1. Dashboard — Tổng Quan

**Route:** `/overview`
**Page:** `src/app/(dashboard)/overview/page.tsx`
**Status:** Working

### Purpose
Central dashboard showing daily operational metrics, trends, and alerts at a glance.

### Layout (5-Row Design)

| Row | Component | Content |
|---|---|---|
| 1 | `AlertCardsRow` | Today's orders, delayed count, returning count, overdue claims |
| 2 | `FinanceCardsRow` | Revenue, cost, profit (role-gated: Manager/Admin only) |
| 3 | `TrendAndStatusRow` | Historical trend chart + delivery status distribution |
| 4 | `CarrierAndShopsRow` | Carrier breakdown + top shops by order volume |
| 5 | `ActivityAndRatesRow` | Recent activity feed + delivery success rate |

### Key Components
- `src/components/dashboard/AlertCardsRow.tsx`
- `src/components/dashboard/FinanceCardsRow.tsx`
- `src/components/dashboard/TrendAndStatusRow.tsx`
- `src/components/dashboard/CarrierAndShopsRow.tsx`
- `src/components/dashboard/ActivityAndRatesRow.tsx`

### Data Flow
- **API:** `/api/dashboard/summary` (cached 30s), `/api/dashboard/trend`, `/api/dashboard/carriers`, `/api/dashboard/top-shops`, `/api/dashboard/activities`
- **Caching:** Dashboard summary uses HTTP `s-maxage=30, stale-while-revalidate=60`
- **RBAC:** Finance cards only visible to users with `canViewDashboardFinance`

---

## 2. Order Management — Quản lý Đơn Hàng

**Route:** `/orders`
**Page:** `src/app/(dashboard)/orders/page.tsx`
**Loading:** `src/app/(dashboard)/orders/loading.tsx`
**Status:** Working

### Purpose
Core order management: Excel upload from carriers, view/filter/search orders, inline staff notes, bulk delete.

### User Workflow
1. Staff uploads Excel file from carrier portal (GHN, GTK, BSI, JAT, SPX)
2. System parses Excel, maps fields, calculates revenue, detects changes
3. Orders upserted (new orders created, existing orders updated — staffNotes preserved)
4. Staff filters/searches orders, adds staff notes, tracks status changes
5. Admin can bulk-delete orders

### Key Components
- `src/components/orders/OrdersClient.tsx` — Main client component
- `src/components/orders/ExcelUpload.tsx` — File upload with drag-drop
- `src/components/orders/OrderTable.tsx` — Paginated data table
- `src/components/orders/OrderFilters.tsx` — Search, status, carrier, date range filters
- `src/components/orders/OrderChangesTab.tsx` — Change audit log tab
- `src/components/orders/DeleteOrdersDialog.tsx` — Bulk delete confirmation
- `src/components/orders/UploadHistoryDialog.tsx` — Upload history viewer
- `src/components/orders/ordersResponsive.ts` — Responsive breakpoint config

### Data Flow
- **API:** `GET /api/orders` (paginated), `POST /api/orders/upload`, `GET /api/orders/options`, `GET /api/orders/export`, `POST /api/orders/delete`, `GET /api/orders/changes`
- **Business Logic:** `src/lib/excel-parser.ts`, `src/lib/order-import-service.ts`, `src/lib/change-detector.ts`
- **RBAC:** Upload requires `canUploadExcel`, delete requires `canDeleteOrders`, export requires `canExportOrders`

---

## 3. Delayed Order Care — Chăm sóc Đơn Hoãn

**Route:** `/delayed`
**Page:** `src/app/(dashboard)/delayed/page.tsx`
**Loading:** `src/app/(dashboard)/delayed/loading.tsx`
**Status:** Working

### Purpose
Monitor and care for delayed/stuck shipments. Uses regex analysis to normalize delay reasons, risk scoring to prioritize high-risk orders.

### User Workflow
1. System auto-detects delayed orders based on delivery status and public notes
2. Staff views summary cards (total delayed, high/medium/low risk)
3. Staff filters by shop, reason, risk level, delay count
4. Staff can move orders to claims ("Chuyển vào Đơn có vấn đề") or add to todos

### Key Components
- `src/components/delayed/DelayedClient.tsx` — Main client
- `src/components/delayed/DelayedStatsCards.tsx` — Summary stat cards (total, high, medium, low risk)
- `src/components/delayed/DelayedTable.tsx` — Delayed orders data table
- `src/components/delayed/DelayedFilterPanel.tsx` — Multi-filter panel
- `src/components/delayed/DelayReasonChart.tsx` — Reason distribution chart
- `src/components/delayed/DelayDistributionChart.tsx` — Distribution visualization
- `src/components/delayed/CopyOrderButton.tsx` — Copy order code
- `src/components/delayed/DelayedOrderTable.tsx` — Alternative table view
- `src/components/delayed/delayedResponsive.ts` — Responsive config

### Data Flow
- **API:** `GET /api/orders/delayed` (paginated, filtered), `GET /api/orders/delayed/export`
- **Business Logic:** `src/lib/delay-analyzer.ts` (normalizeReason, assessRisk), `src/lib/delayed-data.ts`
- **RBAC:** Requires `canViewDelayed`

---

## 4. Return Tracking — Theo dõi Đơn Hoàn

**Route:** `/returns`
**Page:** `src/app/(dashboard)/returns/page.tsx`
**Loading:** `src/app/(dashboard)/returns/loading.tsx`
**Status:** Working

### Purpose
Track return shipments across 3 stages: partial returns, full returns, and warehouse arrivals.

### 3 Tabs

| Tab | Component | Shows |
|---|---|---|
| Hoàn 1 phần (Partial) | `PartialReturnTab.tsx` | Orders with partial returns |
| Hoàn toàn bộ (Full) | `FullReturnTab.tsx` | Orders with full returns |
| Hàng tại kho (Warehouse) | `WaitingReturnTab.tsx` | Returned goods at warehouse |

### Key Components
- `src/components/returns/PartialReturnTab.tsx`
- `src/components/returns/FullReturnTab.tsx`
- `src/components/returns/WaitingReturnTab.tsx`
- `src/components/returns/ReturnFilterPanel.tsx` — Shared filter panel

### Data Flow
- **API:** `GET /api/orders/returns` (filtered by returnType, returnStatus)
- **RBAC:** Requires `canViewReturns`, confirmation requires `canConfirmReturn`

---

## 5. Claims — Khiếu nại / Bồi hoàn

**Route:** `/claims`
**Page:** `src/app/(dashboard)/claims/page.tsx`
**Loading:** `src/app/(dashboard)/claims/loading.tsx`
**Status:** Working

### Purpose
Manage claims for problematic orders: lost, damaged, slow journey, suspicious, fee complaints. Track compensation from carriers and to customers.

### 3 Tabs

| Tab | Component | Purpose |
|---|---|---|
| Đơn có vấn đề (Issues) | `ClaimsClient.tsx` | Main claims table with filters, bulk actions |
| Công cụ (Tools) | `ClaimsToolsTab.tsx` | Auto-detect claims, claim history/audit log |
| Bồi hoàn (Compensation) | `ClaimsCompensationTab.tsx` | Compensation analytics, shop breakdown, monthly trends |

### Key Components
- `src/components/claims/ClaimsClient.tsx` — Main claims list
- `src/components/claims/ClaimsPageWrapper.tsx` — Tab wrapper
- `src/components/claims/ClaimDetailDrawer.tsx` — Detail drawer/sheet
- `src/components/claims/ClaimsToolsTab.tsx` — Auto-detect + audit
- `src/components/claims/ClaimsCompensationTab.tsx` — Compensation analytics
- `src/components/claims/claims-table/` — Table sub-components (6 files)

### Data Flow
- **API:** `GET/POST /api/claims`, `/api/claims/auto-detect`, `/api/claims/bulk`, `/api/claims/compensation`, `/api/claims/history`, `/api/claims/export`
- **Hooks:** `useClaimsList`, `useClaimsFilters`, `useClaimMutations`
- **RBAC:** View/create/update/delete/compensation each gated by separate permission

### Issue Types
- `SLOW_JOURNEY` — Auto-detected: delivery exceeds regional threshold
- `SUSPICIOUS` — Auto-detected from internal notes
- `LOST` — Order lost in transit
- `DAMAGED` — Order damaged
- `FEE_COMPLAINT` — Fee discrepancy
- `OTHER` — Miscellaneous

### Claim Status Flow
`PENDING` → `VERIFYING_CARRIER` → `CLAIM_SUBMITTED` → `COMPENSATION_REQUESTED` → `RESOLVED` / `CARRIER_COMPENSATED` / `CARRIER_REJECTED` / `CUSTOMER_COMPENSATED` / `CUSTOMER_REJECTED`

---

## 6. Todos — Công Việc

**Route:** `/todos`
**Page:** `src/app/(dashboard)/todos/page.tsx`
**Loading:** `src/app/(dashboard)/todos/loading.tsx`
**Status:** Working

### Purpose
Task management with dual views: list and Kanban board. Tasks can be created manually or linked from orders, delayed, returns, claims, or CRM.

### Views
- **List view** — Traditional todo list with filters, inline status toggles
- **Kanban view** — Drag-and-drop columns (TODO → IN_PROGRESS → DONE)

### Key Components
- `src/components/todos/TodosClient.tsx` — Main client (view toggle)
- `src/components/todos/TodoListView.tsx` — List view
- `src/components/todos/TodoKanbanView.tsx` — Kanban with @hello-pangea/dnd
- `src/components/todos/TodoDetailPanel.tsx` — Detail panel with comments (Tiptap editor)
- `src/components/todos/TodoQuickAdd.tsx` — Quick add form
- `src/components/todos/TodoFilters.tsx` — Filter bar (status, priority, source, due date)
- `src/components/todos/TodoSummaryCards.tsx` — Summary statistics
- `src/components/todos/TodoReminderBanner.tsx` — Due date reminders
- `src/components/todos/DeleteConfirmDialog.tsx` — Delete confirmation
- `src/components/todos/constants.ts` — Priority/status constants

### Data Flow
- **API:** `GET/POST /api/todos`, `/api/todos/stats`, `/api/todos/overdue-count`, `/api/todos/reorder`, `/api/todos/reminders`, `/api/todos/[id]/comments`
- **Hooks:** `useTodos`, `useTodoStats`, `useTodoUsers`
- **Sources:** MANUAL, FROM_DELAYED, FROM_RETURNS, FROM_CLAIMS, FROM_ORDERS, FROM_CRM

---

## 7. Attendance — Chấm Công

**Route:** `/attendance`
**Page:** `src/app/(dashboard)/attendance/page.tsx`
**Status:** Working

### Purpose
Automatic attendance tracking based on login sessions. Supports manual edits, late detection, leave management.

### 2 Tabs

| Tab | Component | Purpose |
|---|---|---|
| Chấm công cá nhân | `MyAttendanceTab.tsx` | Personal attendance + login history |
| Quản lý chấm công | `ManagementTab.tsx` | Team overview (manager/admin) |

### Key Components
- `src/components/attendance/AttendancePageClient.tsx` — Main client
- `src/components/attendance/AttendancePageWrapper.tsx` — Layout wrapper
- `src/components/attendance/MyAttendanceTab.tsx` — Personal view
- `src/components/attendance/ManagementTab.tsx` — Team management
- `src/components/attendance/IdleLogoutProvider.tsx` — Idle timeout + midnight auto-logout

### Data Flow
- **API:** `/api/attendance/me`, `/api/attendance/team`, `/api/attendance/heartbeat`, `/api/attendance/export`, `/api/attendance/[id]`
- **Auto-tracking:** Login → auto check-in, Heartbeat every few seconds, Idle timeout 60min, Midnight logout
- **RBAC:** Team view requires `canViewAllAttendance`, edit requires `canEditAttendance`

---

## 8. Finance — Tài Chính

**Route:** `/finance`
**Page:** `src/app/(dashboard)/finance/page.tsx`
**Loading:** `src/app/(dashboard)/finance/loading.tsx`
**Status:** Working

### Purpose
Financial overview, profit & loss, shop analysis, cashbook management, expense tracking.

### 3 Tabs

| Tab | Component | Purpose |
|---|---|---|
| Tổng quan & P&L | `OverviewTab.tsx` | Revenue, cost, profit, carrier distribution, P&L statement |
| Phân tích | `AnalysisTab.tsx` | Shop trends (14-day windows), negative revenue, shop charts |
| Sổ quỹ | `CashbookTab.tsx` | Cashbook entries, COD tracking, expense management |

### Key Components
- `src/components/finance/FinancePageClient.tsx` — Main client
- `src/components/finance/OverviewTab.tsx` — Overview + P&L
- `src/components/finance/AnalysisTab.tsx` — Analytics
- `src/components/finance/CashbookTab.tsx` — Cashbook
- `src/components/finance/financeResponsive.ts` — Responsive config

### Data Flow
- **API:** `/api/finance/overview`, `/api/finance/pnl`, `/api/finance/shop-trends`, `/api/finance/carriers`, `/api/finance/cashbook`, `/api/finance/expenses`, `/api/finance/categories`, `/api/finance/budgets`, `/api/finance/negative-revenue`
- **RBAC:** Requires `canViewFinancePage`, expenses require `canManageExpenses`, cashbook upload requires `canUploadCashbook`

---

## 9. Employee Management — Quản lý Nhân Viên

**Route:** `/admin/users`
**Page:** `src/app/(dashboard)/admin/users/page.tsx`
**Status:** Working

### Purpose
Admin-only page for managing employee accounts and permission groups.

### 4 Sections
1. **Employee list** — Create/edit/deactivate users, assign permission groups, reset passwords, force logout
2. **Permission groups** — Create/edit permission bundles with 33 boolean flags
3. **Announcements** — Create company announcements with rich-text content and optional attachments
4. **Requests & feedback** — Review profile change requests and employee feedback

### Data Flow
- **API:** `/api/admin/users`, `/api/admin/users/[id]`, `/api/admin/users/[id]/password`, `/api/admin/force-logout`, `/api/admin/permission-groups`, `/api/admin/permission-groups/[id]`, `/api/announcements`, `/api/profile/change-requests`, `/api/profile/feedback`
- **RBAC:** Requires `canManageUsers` for user management, `canManagePermissions` for permission groups

---

## 10. Order Detail Page

**Route:** `/orders/[requestCode]`
**Page:** `src/app/(dashboard)/orders/[requestCode]/page.tsx`
**Status:** Working

### Purpose
Full detail view for a single order showing all fields, tracking timeline, return status, and claim information.

### Key Features
- All order fields displayed (sender, receiver, fees, status, etc.)
- Tracking button 🚚 — Opens tracking popup (SVExpress API)
- Staff notes inline editing
- Claim badge showing linked issue type
- "Chuyển vào Đơn có vấn đề" — Move to claims
- "Thêm vào Công Việc" — Add to todos
- Back navigation with preserved URL params

### Data Flow
- **API:** `/api/orders/[requestCode]/detail`, `/api/orders/[requestCode]/tracking`
- **Components:** `src/components/shared/OrderDetailDialog.tsx`, `src/components/tracking/TrackingPopup.tsx`, `src/components/shared/InlineStaffNote.tsx`

---

## 11. CRM — Quản lý Khách Hàng

**Route:** `/crm`
**Page:** `src/app/(dashboard)/crm/page.tsx`
**Loading:** `src/app/(dashboard)/crm/loading.tsx`
**Status:** Working

### Purpose
Customer relationship management with 2 modes: active shop management and sales pipeline.

### 2 Tabs

| Tab | Component | Purpose |
|---|---|---|
| Quản lý Shop | `ShopManagementTab.tsx` | Active shop list with classification (VIP/NORMAL/NEW/WARNING/INACTIVE), care logs, assignments |
| Pipeline bán hàng | `ProspectPipelineTab.tsx` | 5-stage Kanban: DISCOVERED → CONTACTED → NEGOTIATING → TRIAL → CONVERTED |

### Key Components
- `src/components/crm/CrmClient.tsx` — Main client
- `src/components/crm/ShopManagementTab.tsx` — Shop list + analytics
- `src/components/crm/ShopDetailPanel.tsx` — Shop detail with care logs
- `src/components/crm/CareLogDialog.tsx` — Add care log
- `src/components/crm/ProspectPipelineTab.tsx` — Kanban pipeline
- `src/components/crm/ProspectDetailSheet.tsx` — Prospect detail
- `src/components/crm/ProspectFormDialog.tsx` — Create/edit prospect

### Data Flow
- **API:** `/api/crm/shops`, `/api/crm/shops/[shopName]`, `/api/crm/shops/[shopName]/care`, `/api/crm/dashboard`, `/api/crm/assignments`, `/api/crm/prospects`, `/api/crm/prospects/stats`
- **RBAC:** Requires `canViewCRM`, management requires `canManageCRM`

---

## 12. Landing Page

**Route:** `/` (root)
**Page:** `src/app/(landing)/page.tsx`
**Layout:** `src/app/(landing)/layout.tsx`
**Status:** Working

### Purpose
Public-facing company landing page with information about services and a lead capture registration form.

### Sections (14 components)
1. `Header.tsx` — Navigation with login button
2. `HeroSection.tsx` — Hero banner
3. `AboutSection.tsx` — Company introduction
4. `ServicesSection.tsx` — Service offerings
5. `ProcessSection.tsx` — How it works
6. `BenefitsSection.tsx` — Benefits
7. `StatsSection.tsx` — Company statistics
8. `PartnersSection.tsx` — Carrier partners
9. `TestimonialsSection.tsx` — Customer testimonials
10. `FAQSection.tsx` — Frequently asked questions
11. `RegisterForm.tsx` — Lead capture → ShopProspect (source: LANDING_PAGE)
12. `Footer.tsx` — Footer
13. `ScrollToTop.tsx` — Scroll to top button
14. `ZaloChatWidget.tsx` — Zalo chat integration

### Data Flow
- **API:** `POST /api/landing/register` (public), `GET /api/landing/stats` (public)
- **Auth:** None required (public page)

---

## 13. Cross-Cutting Features

### 13.1 "Chuyển vào Đơn có vấn đề" Button

**Component:** `src/components/shared/AddClaimFromPageDialog.tsx`

Available on: Delayed page, Returns page, Order detail page. Creates a ClaimOrder linked to the selected order with pre-filled context.

### 13.2 "Thêm vào Công Việc" Button

**Component:** `src/components/shared/AddTodoDialog.tsx`

Available on: Delayed page, Returns page, Order detail page, Claims page. Creates a TodoItem with `linkedOrderId` and appropriate `source` tag.

### 13.3 Tracking Popup 🚚

**Components:**
- `src/components/tracking/TrackingPopup.tsx` — Portal-based modal (z-10001)
- `src/components/tracking/TrackingTimeline.tsx` — Timeline visualization
- `src/components/tracking/TrackingTimelineSection.tsx` — Section grouping

Fetches from SVExpress API via `/api/orders/[requestCode]/tracking`. Shows delivery journey with timestamps. Available anywhere a requestCode is displayed.

### 13.4 Staff Notes Inline Editing

**Component:** `src/components/shared/InlineStaffNote.tsx`
**State:** `src/lib/inline-staff-note-state.ts`

Click-to-edit staff notes on order rows. Saves via `PATCH /api/orders/notes`. Requires `canEditStaffNotes` permission. Notes are preserved during Excel re-imports.

### 13.5 Issue Type Tags (Claim Badge)

**Component:** `src/components/shared/ClaimBadge.tsx`

Color-coded badges on requestCode showing linked issue types (SLOW_JOURNEY, LOST, DAMAGED, etc.). Visible in order tables across pages.

### 13.6 Announcement System (Bell Icon)

**Component:** `src/components/shared/AnnouncementSection.tsx`

Bell icon in header with unread count badge. Dropdown panel with 2 tabs:
- **Công việc** — Todo assignments/reminders
- **Thông báo** — Company announcements

### 13.7 User Profile Dialog

**Component:** `src/components/shared/UserProfileDialog.tsx`

Profile viewer/editor: avatar, personal info, change requests, password change, login history, feedback.

### 13.8 Auto-Logout System

**Component:** `src/components/attendance/IdleLogoutProvider.tsx`

- **Idle timeout:** 60 minutes of inactivity → forced logout
- **Midnight logout:** Configurable time (default: midnight GMT+7) → forced logout
- **Warning:** 5-minute warning before forced logout
- **Activity events:** mousemove, mousedown, keydown, scroll, touchstart, click
- **Beacon:** `POST /api/auth/signout-beacon` on browser close

### 13.9 Rate Limiter

**File:** `src/lib/rate-limiter.ts`

Applied to: Excel upload, order export, claims export, auto-import. Token bucket or sliding window implementation.

### 13.10 Heartbeat System

**Component:** `src/components/providers/HeartbeatProvider.tsx`
**API:** `POST /api/attendance/heartbeat`

Periodic heartbeat to maintain session liveness. Detects orphaned sessions (>5 min stale), updates `lastHeartbeat` on LoginHistory, checks force-logout system setting.

### 13.11 Back Navigation with URL Params

**Component:** `src/components/shared/BackButton.tsx`

Preserves filter state across navigation using URL search params. When navigating from a filtered list to detail page and back, filters are restored.

### 13.12 Confirm Dialog

**Component:** `src/components/shared/ConfirmDialog.tsx`
**State:** `src/lib/confirm-dialog.ts`

Reusable confirmation modal for destructive actions (delete, bulk operations).
