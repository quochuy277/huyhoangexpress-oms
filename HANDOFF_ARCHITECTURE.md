# HANDOFF_ARCHITECTURE.md — HuyHoang Express OMS

> **Last updated:** 2026-04-01
> **Repository:** `huyhoangexpress-oms`
> **Production URL:** `huyhoang.express`

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Directory Structure](#2-directory-structure)
3. [Database Schema](#3-database-schema)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [API Routes](#5-api-routes)
6. [Key Business Logic](#6-key-business-logic)
7. [State Management](#7-state-management)
8. [External Integrations](#8-external-integrations)
9. [UI Patterns & Conventions](#9-ui-patterns--conventions)

---

## 1. Project Overview

### What the App Does

HuyHoang Express OMS is a **shipping brokerage order management system** for a Vietnamese company that acts as an intermediary between shops (sellers) and shipping carriers. The system manages the full lifecycle of shipments:

- **Order ingestion** via Excel uploads from carriers (GHN, GTK/GiaoTietKiem, BSI/BestExpress, JAT/J&T, SPX/Shopee Express)
- **Delivery tracking** with status monitoring and delay detection
- **Return handling** (full return, partial return, warehouse tracking)
- **Claims/compensation** for lost, damaged, or problematic orders
- **Financial reconciliation** (revenue = totalFee − carrierFee)
- **CRM** for shop management and sales pipeline
- **Employee management** (attendance, leave, permissions, scoring)
- **Task management** (todos with Kanban board)
- **Landing page** for public visitors with lead capture

### Who Uses It

- **Admin** — Full access, manages users and permissions
- **Manager** — Operational management, finance, team oversight
- **Staff** — Day-to-day order processing, customer care, claims
- **Viewer** — Read-only access to order data

### Business Context

Vietnamese shipping brokerage (đại lý vận chuyển) — the company receives shipments from online shops, consolidates them through multiple carriers, and earns revenue from the fee spread. ~67,000 orders in the database running on Supabase PostgreSQL (Nano instance).

### Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.1.6 | Full-stack React framework (App Router) |
| React | 19.2.4 | UI library |
| TypeScript | 5.9.3 | Type safety |
| Tailwind CSS | 4.2.1 | Styling |
| Prisma | 6.19.2 | ORM + database schema |
| NextAuth | 5.0.0-beta.24 | Authentication (JWT) |
| TanStack Query | 5.90.21 | Data fetching & caching |
| Zustand | 5.0.11 | State management (placeholder, not yet used) |
| Recharts | 3.8.0 | Charts and data visualization |
| SheetJS (xlsx) | 0.18.5 | Excel file parsing/generation |
| Tiptap | 3.20.1 | Rich text editor (todo comments) |
| @hello-pangea/dnd | 18.0.1 | Drag-and-drop (Kanban board) |
| Zod | 4.3.6 | Input validation |
| Radix UI | 1.1.15 | Accessible UI primitives |
| Vitest | 4.1.0 | Testing framework |
| date-fns | 4.1.0 | Date utilities |
| bcryptjs | 3.0.3 | Password hashing |
| DOMPurify | 3.3.3 | HTML sanitization |

**Infrastructure:** Vercel Hobby plan (10s serverless timeout), Supabase PostgreSQL, GitHub auto-deploy.

---

## 2. Directory Structure

```
HuyHoang_OMS/
├── prisma/
│   ├── schema.prisma              # Database schema — single source of truth
│   ├── seed.ts                    # Database seeding script
│   ├── fix_enum.sql               # Enum fix migration
│   └── migrations/                # Prisma migration history (11 migrations)
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout (HTML, providers)
│   │   ├── (auth)/
│   │   │   ├── layout.tsx         # Auth layout (centered card)
│   │   │   ├── error.tsx          # Auth error boundary
│   │   │   └── login/page.tsx     # Login page
│   │   ├── (landing)/
│   │   │   ├── layout.tsx         # Landing page layout
│   │   │   ├── page.tsx           # Public landing page (route: /)
│   │   │   ├── error.tsx          # Landing error boundary
│   │   │   └── components/        # 14 landing page section components
│   │   │       ├── HeroSection.tsx
│   │   │       ├── AboutSection.tsx
│   │   │       ├── ServicesSection.tsx
│   │   │       ├── ProcessSection.tsx
│   │   │       ├── BenefitsSection.tsx
│   │   │       ├── StatsSection.tsx
│   │   │       ├── PartnersSection.tsx
│   │   │       ├── TestimonialsSection.tsx
│   │   │       ├── FAQSection.tsx
│   │   │       ├── RegisterForm.tsx
│   │   │       ├── Header.tsx
│   │   │       ├── Footer.tsx
│   │   │       ├── ScrollToTop.tsx
│   │   │       └── ZaloChatWidget.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx         # Dashboard shell (sidebar + header)
│   │   │   ├── loading.tsx        # Global dashboard loading
│   │   │   ├── error.tsx          # Dashboard error boundary
│   │   │   ├── overview/page.tsx          # Tổng Quan (Dashboard)
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx               # Quản lý Đơn Hàng
│   │   │   │   ├── loading.tsx
│   │   │   │   └── [requestCode]/page.tsx # Chi tiết Đơn Hàng
│   │   │   ├── delayed/
│   │   │   │   ├── page.tsx               # Chăm sóc Đơn Hoãn
│   │   │   │   └── loading.tsx
│   │   │   ├── returns/
│   │   │   │   ├── page.tsx               # Theo dõi Đơn Hoàn
│   │   │   │   └── loading.tsx
│   │   │   ├── claims/
│   │   │   │   ├── page.tsx               # Khiếu nại / Bồi hoàn
│   │   │   │   ├── loading.tsx
│   │   │   │   └── new/page.tsx           # Tạo khiếu nại mới
│   │   │   ├── todos/
│   │   │   │   ├── page.tsx               # Công Việc (Todo/Kanban)
│   │   │   │   └── loading.tsx
│   │   │   ├── crm/
│   │   │   │   ├── page.tsx               # Quản lý Khách Hàng (CRM)
│   │   │   │   └── loading.tsx
│   │   │   ├── attendance/page.tsx        # Chấm Công
│   │   │   ├── finance/
│   │   │   │   ├── page.tsx               # Tài Chính
│   │   │   │   └── loading.tsx
│   │   │   └── admin/
│   │   │       └── users/page.tsx         # Quản lý Nhân Viên
│   │   └── api/                   # See Section 5 for full API documentation
│   │       ├── admin/             # User management (6 routes)
│   │       ├── announcements/     # Notification system (4 routes)
│   │       ├── attendance/        # Attendance tracking (6 routes)
│   │       ├── auth/              # Authentication (4 routes)
│   │       ├── claims/            # Claims management (11 routes)
│   │       ├── crm/               # CRM (6 routes)
│   │       ├── dashboard/         # Dashboard stats (5 routes)
│   │       ├── documents/         # File management (3 routes)
│   │       ├── finance/           # Financial data (11 routes)
│   │       ├── health/            # Health check (1 route)
│   │       ├── landing/           # Public landing (2 routes)
│   │       ├── leave-requests/    # Leave management (4 routes)
│   │       ├── links/             # Quick links (2 routes)
│   │       ├── login-history/     # Login audit (1 route)
│   │       ├── orders/            # Order management (11+ routes)
│   │       ├── profile/           # User profile (4 routes)
│   │       ├── settings/          # System settings (1 route)
│   │       └── todos/             # Task management (9 routes)
│   ├── components/
│   │   ├── Providers.tsx          # TanStack Query + session providers
│   │   ├── ui/                    # Shared UI primitives
│   │   │   ├── dialog.tsx         # Radix Dialog wrapper
│   │   │   └── table.tsx          # Table component
│   │   ├── layout/                # App shell components
│   │   │   ├── DashboardShell.tsx # Main layout wrapper
│   │   │   ├── Header.tsx         # Top navigation bar
│   │   │   └── Sidebar.tsx        # Collapsible sidebar navigation
│   │   ├── shared/                # Cross-feature shared components
│   │   │   ├── AddClaimFromPageDialog.tsx  # "Chuyển vào Đơn có vấn đề"
│   │   │   ├── AddTodoDialog.tsx           # "Thêm vào Công Việc"
│   │   │   ├── AnnouncementSection.tsx     # Bell icon notification panel
│   │   │   ├── BackButton.tsx              # Back navigation with URL params
│   │   │   ├── ClaimBadge.tsx              # Issue type tag on requestCode
│   │   │   ├── ConfirmDialog.tsx           # Reusable confirmation modal
│   │   │   ├── InlineStaffNote.tsx         # Inline staff notes editing
│   │   │   ├── OrderDetailDialog.tsx       # Order detail popup
│   │   │   └── UserProfileDialog.tsx       # User profile modal
│   │   ├── providers/
│   │   │   └── HeartbeatProvider.tsx       # Session heartbeat
│   │   ├── attendance/            # 5 components
│   │   ├── claims/                # 6 components + claims-table/ (6 sub-components)
│   │   ├── crm/                   # 7 components
│   │   ├── dashboard/             # 5 row components
│   │   ├── delayed/               # 9 components
│   │   ├── finance/               # 5 components
│   │   ├── orders/                # 8 components
│   │   ├── returns/               # 4 components
│   │   ├── todos/                 # 10 components
│   │   └── tracking/              # 3 components
│   ├── hooks/
│   │   ├── index.ts               # Hook re-exports
│   │   ├── useClaimMutations.ts   # Claims CRUD mutations
│   │   ├── useClaimsFilters.ts    # URL-based filter state
│   │   ├── useClaimsList.ts       # Claims data fetching
│   │   ├── useDebounce.ts         # Debounce utility
│   │   ├── useTodos.ts            # Todo CRUD operations
│   │   ├── useTodoStats.ts        # Todo statistics
│   │   └── useTodoUsers.ts        # Todo user assignments
│   ├── lib/
│   │   ├── prisma.ts              # Prisma client singleton
│   │   ├── auth.ts                # NextAuth configuration (142 lines)
│   │   ├── auth.config.ts         # Auth config for middleware (38 lines)
│   │   ├── permissions.ts         # Permission system + RBAC (210 lines)
│   │   ├── claims-permissions.ts  # Claims-specific auth (32 lines)
│   │   ├── finance-auth.ts        # Finance-specific auth
│   │   ├── api-handler.ts         # Generic API handler wrapper (103 lines)
│   │   ├── excel-parser.ts        # Excel parsing + field mapping (498 lines)
│   │   ├── order-import-service.ts # Bulk upsert + change detection (353 lines)
│   │   ├── change-detector.ts     # Order change classification (222 lines)
│   │   ├── delay-analyzer.ts      # Delay reason normalization + risk scoring (330 lines)
│   │   ├── claim-detector.ts      # Auto claim detection (109 lines)
│   │   ├── delayed-data.ts        # Delayed order data processing (210 lines)
│   │   ├── status-mapper.ts       # Order status mapping
│   │   ├── rate-limiter.ts        # API rate limiting
│   │   ├── sanitize.ts            # Input sanitization
│   │   ├── validations.ts         # Zod schemas
│   │   ├── env.ts                 # Environment variable validation
│   │   ├── logger.ts              # Structured logging
│   │   ├── utils.ts               # General utilities (cn, formatVND, etc.)
│   │   ├── finance-period.ts      # Financial period helpers
│   │   ├── claims-config.ts       # Claims configuration constants
│   │   ├── claim-detail-navigation.ts # Claim detail URL management
│   │   ├── confirm-dialog.ts      # Confirm dialog state
│   │   ├── inline-staff-note-state.ts # Staff note inline edit state
│   │   └── actions/
│   │       └── auth-actions.ts    # Server actions for auth
│   ├── stores/
│   │   └── index.ts               # Placeholder for Zustand stores (not yet used)
│   ├── types/
│   │   ├── index.ts               # Re-exported Prisma types + API response types
│   │   ├── next-auth.d.ts         # NextAuth type extensions
│   │   ├── delayed.ts             # Delayed order types
│   │   ├── returns.ts             # Return tracking types
│   │   └── todo.ts                # Todo feature types
│   ├── middleware.ts              # Route protection + RBAC middleware (85 lines)
│   └── __tests__/                 # Test suite (18+ test files)
│       ├── app/api/               # API route tests
│       ├── components/            # Component tests (responsive)
│       ├── helpers/               # Test utilities (prisma-mock)
│       ├── hooks/                 # Hook tests
│       └── lib/                   # Library/utility tests
├── next.config.ts                 # Next.js config (security headers, optimize imports)
├── tsconfig.json                  # TypeScript config
├── vitest.config.ts               # Vitest config (node env, v8 coverage)
├── postcss.config.mjs             # PostCSS config
├── package.json                   # Dependencies and scripts
├── .env.example                   # Environment template
├── PROJECT_RULE.md                # Project coding rules and conventions
├── CODEBASE.md                    # Codebase documentation
└── Claude_Build and Fix.md        # Build/fix log
```

---

## 3. Database Schema

**Database:** PostgreSQL on Supabase (Nano instance)
**ORM:** Prisma 6.19.2
**Schema file:** `prisma/schema.prisma` (961 lines)

### Models Overview (32 models)

| Model | Purpose | Key Fields | Relations |
|---|---|---|---|
| **User** | Employee/staff accounts | email, password, name, role, permissionGroupId, isActive | → PermissionGroup, Attendance[], LoginHistory[], TodoItem[], ClaimOrder[], ShopAssignment[] |
| **PermissionGroup** | RBAC permission bundles | name, 33 boolean permission flags, isSystemGroup | → User[] |
| **Order** | Core shipment data (~67K rows) | requestCode (unique), status, deliveryStatus, shopName, all fee fields, revenue, staffNotes, claimLocked | → ClaimOrder, ReturnTracking, TodoItem[], OrderChangeLog[] |
| **UploadHistory** | Excel upload tracking | fileName, totalRows, newOrders, updatedOrders, processingTime | → User, OrderChangeLog[] |
| **OrderChangeLog** | Order field change audit | requestCode, changeType, previousValue, newValue, changeDetail | → Order, UploadHistory |
| **ReturnTracking** | Return shipment tracking | orderId (unique), returnType, returnStatus, warehouseArrivalDate | → Order |
| **ClaimOrder** | Claims/compensation | orderId (unique), issueType, claimStatus, carrierCompensation, customerCompensation | → Order, User, ClaimStatusHistory[], ClaimChangeLog[] |
| **ClaimStatusHistory** | Claim status audit trail | fromStatus, toStatus, changedBy, note | → ClaimOrder |
| **ClaimChangeLog** | Claim field-level changes | fieldName, oldValue, newValue, changedBy | → ClaimOrder |
| **TodoItem** | Task management | title, status, priority, dueDate, sortOrder, linkedOrderId, source | → Order, User (assignee), User (creator), TodoComment[] |
| **TodoComment** | Todo comments | content, authorName, authorId | → TodoItem |
| **Attendance** | Daily attendance records | userId+date (unique), firstLogin, lastLogout, totalMinutes, isLate | → User |
| **LoginHistory** | Login/logout sessions | loginTime, logoutTime, duration, ipAddress, logoutReason, lastHeartbeat | → User |
| **LeaveRequest** | Leave management | dateFrom, dateTo, totalDays, leaveStatus | → User |
| **EmployeeScore** | Performance scoring | period, score, criteria, comment | → User (employee), User (scorer) |
| **Document** | File storage metadata | name, fileName, filePath, fileSize | — |
| **ImportantLink** | Reference links | title, url, sortOrder | — |
| **SystemSetting** | Key-value config | key (unique), value | — |
| **CashbookEntry** | Financial transactions | compositeKey (unique), transactionTime, amount, balance, groupType | — |
| **CashbookUpload** | Cashbook file uploads | fileName, rowCount, dateFrom, dateTo | — |
| **ExpenseCategory** | Expense categories | name (unique), isSystem, sortOrder | → Expense[], MonthlyBudget[] |
| **Expense** | Manual expenses | categoryId, title, amount, date | → ExpenseCategory |
| **MonthlyBudget** | Monthly budget allocation | categoryId+month (unique), budgetAmount | → ExpenseCategory |
| **Announcement** | Company notifications | title, content, isPinned | → AnnouncementRead[] |
| **AnnouncementRead** | Read tracking | announcementId+userId (unique) | → Announcement |
| **InfoChangeRequest** | Profile change requests | fieldName, oldValue, newValue, status | → User |
| **Feedback** | User feedback | content, isRead | → User |
| **ShopProfile** | CRM shop data | shopName (unique), classification, contactPerson | → ShopAssignment[], ShopCareLog[] |
| **ShopAssignment** | Staff-shop assignments | shopId+userId (unique) | → ShopProfile, User |
| **ShopCareLog** | Shop interaction logs | contactMethod, content, result, followUpDate | → ShopProfile |
| **ShopProspect** | Sales pipeline prospects | stage, source, estimatedSize, isLost | → User (assignee), ProspectContactLog[] |
| **ProspectContactLog** | Prospect interactions | contactMethod, content, result | → ShopProspect |

### Enums (21 total)

| Enum | Values | Used By |
|---|---|---|
| **Role** | ADMIN, MANAGER, STAFF, VIEWER | User.role |
| **DeliveryStatus** | PROCESSING, IN_TRANSIT, DELIVERING, DELIVERED, RECONCILED, DELIVERY_DELAYED, RETURN_CONFIRMED, RETURNING_FULL, RETURN_DELAYED, RETURNED_FULL, RETURNED_PARTIAL | Order.deliveryStatus |
| **ReturnType** | FULL_RETURN, PARTIAL_RETURN | ReturnTracking.returnType |
| **ReturnStatus** | RETURNING, AT_WAREHOUSE, RETURNED_TO_CUSTOMER | ReturnTracking.returnStatus |
| **IssueType** | SLOW_JOURNEY, SUSPICIOUS, LOST, DAMAGED, OTHER, FEE_COMPLAINT | ClaimOrder.issueType |
| **ClaimStatus** | PENDING, VERIFYING_CARRIER, CLAIM_SUBMITTED, COMPENSATION_REQUESTED, RESOLVED, CARRIER_COMPENSATED, CARRIER_REJECTED, CUSTOMER_COMPENSATED, CUSTOMER_REJECTED | ClaimOrder.claimStatus |
| **ClaimSource** | AUTO_SLOW_JOURNEY, AUTO_INTERNAL_NOTE, FROM_DELAYED, FROM_RETURNS, FROM_ORDERS, MANUAL | ClaimOrder.source |
| **TodoStatus** | TODO, IN_PROGRESS, DONE | TodoItem.status |
| **Priority** | LOW, MEDIUM, HIGH, URGENT | TodoItem.priority |
| **TodoSource** | MANUAL, FROM_DELAYED, FROM_RETURNS, FROM_CLAIMS, FROM_ORDERS, FROM_CRM | TodoItem.source |
| **AttendanceStatus** | PRESENT, HALF_DAY, ABSENT, LATE, ON_LEAVE, UNAPPROVED_LEAVE | Attendance.status |
| **LeaveStatus** | PENDING, APPROVED, REJECTED | LeaveRequest.leaveStatus |
| **CashbookGroup** | COD, SHOP_PAYOUT, RECONCILIATION_FEE, TOP_UP, COMPENSATION, COOPERATION_FEE, OTHER | CashbookEntry.groupType |
| **ShopClass** | VIP, NORMAL, NEW, WARNING, INACTIVE | ShopProfile.classification |
| **ContactMethod** | PHONE_CALL, MESSAGE, EMAIL, IN_PERSON, SYSTEM, OTHER | ShopCareLog, ProspectContactLog |
| **CareResult** | RESOLVED, IN_PROGRESS, WAITING, UNSATISFIED, OTHER | ShopCareLog.result |
| **ProspectSource** | FACEBOOK, SHOPEE, TIKTOK_SHOP, REFERRAL, DIRECT, LANDING_PAGE, OTHER | ShopProspect.source |
| **ProspectSize** | SMALL, MEDIUM, LARGE | ShopProspect.estimatedSize |
| **PipelineStage** | DISCOVERED, CONTACTED, NEGOTIATING, TRIAL, CONVERTED | ShopProspect.stage |
| **OrderChangeType** | STATUS_CHANGE, WEIGHT_CHANGE, CARRIER_FEE_CONFIRMED, RECIPIENT_CHANGE, SURCHARGE_CHANGE, SERVICE_FEE_CHANGE, COD_CONFIRMED, RETURN_COMPLETED, CARRIER_SWITCH, REDELIVER, INTERNAL_STATUS_NOTE, RETURN_APPROVED, STAFF_NOTE, COD_AMOUNT_CHANGE, CLAIM_RELATED, OTHER | OrderChangeLog.changeType |
| **RequestStatus** | PENDING, APPROVED, REJECTED | InfoChangeRequest.status |

### Key Indexes on Order Model (13 indexes)

```prisma
@@index([status])
@@index([carrierName])
@@index([shopName])
@@index([deliveryStatus])
@@index([createdTime])
@@index([lastUpdated])
@@index([receiverProvince])
@@index([salesStaff])
@@index([claimLocked])
@@index([deliveryStatus, createdTime])
@@index([shopName, deliveryStatus])
@@index([deliveredDate])
@@index([revenue])
@@index([creatorShopName, createdTime])
```

---

## 4. Authentication & Authorization

### NextAuth Configuration

**File:** `src/lib/auth.ts` (142 lines), `src/lib/auth.config.ts` (38 lines)

| Setting | Value |
|---|---|
| Provider | Credentials (email + password) |
| Session strategy | JWT (8-hour maxAge) |
| Password hashing | bcryptjs (12 rounds) |
| Permission refresh | Every 5 minutes (DB lookup) |

**Login Flow:**
1. User submits email/password → NextAuth validates with bcrypt
2. LoginHistory record created (IP, user-agent, device type)
3. Auto attendance check-in triggered (non-blocking)
4. Late detection against configurable work start time
5. JWT token issued with: `id`, `role`, `name`, `permissions`, `permissionsUpdatedAt`

### Permission System

**File:** `src/lib/permissions.ts` (210 lines)

**35 granular boolean permissions** organized into 11 categories:

| Category | Permissions |
|---|---|
| **Orders** | `canViewOrders`, `canUploadExcel`, `canDeleteOrders`, `canEditStaffNotes`, `canExportOrders` |
| **Finance** | `canViewRevenue`, `canViewCarrierFee`, `canViewFinancePage`, `canViewDashboardFinance`, `canManageExpenses`, `canUploadCashbook`, `canManageBudgets` |
| **Delayed** | `canViewDelayed` |
| **Returns** | `canViewReturns`, `canConfirmReturn` |
| **Claims** | `canViewClaims`, `canCreateClaim`, `canUpdateClaim`, `canDeleteClaim`, `canViewCompensation` |
| **Todos** | `canViewAllTodos` |
| **Attendance** | `canViewAllAttendance`, `canEditAttendance`, `canScoreEmployees`, `canApproveLeave` |
| **Documents** | `canManageDocuments`, `canManageLinks` |
| **Announcements** | `canCreateAnnouncement` |
| **Admin** | `canManageUsers`, `canManagePermissions` |
| **CRM** | `canViewCRM`, `canManageCRM`, `canViewAllShops` |

### Role Defaults

| Permission | ADMIN | MANAGER | STAFF | VIEWER |
|---|---|---|---|---|
| All orders/view | ✅ | ✅ | ✅ | ✅ |
| Upload Excel | ✅ | ✅ | ✅ | ❌ |
| Delete orders | ✅ | ✅ | ❌ | ❌ |
| Finance page | ✅ | ✅ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ | ❌ |
| Manage permissions | ✅ | ❌ | ❌ | ❌ |

> Individual permissions can be overridden per user via Permission Groups in admin settings.

### Middleware

**File:** `src/middleware.ts` (85 lines)

| Route | Auth | Permission |
|---|---|---|
| `/` (landing) | Public | — |
| `/login` | Public (redirects to `/orders` if logged in) | — |
| `/api/auth/*` | Public | — |
| `/api/landing/*` | Public | — |
| `/api/orders/auto-import` | API key (`x-api-key` header) | — |
| `/api/*` | Session required (401) | Handlers check individually |
| `/admin/users` | Session | `canManageUsers` |
| `/finance` | Session | `canViewFinancePage` |
| `/delayed` | Session | `canViewDelayed` |
| `/returns` | Session | `canViewReturns` |
| `/claims` | Session | `canViewClaims` |
| Other dashboard pages | Session | Redirect to `/login` if unauthenticated |

**Subdomain:** `login.huyhoang.express` rewrites to `/login`, redirects logged-in users to `/orders`.

---

## 5. API Routes

### Admin Management (`/api/admin/`)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/admin/force-logout` | POST | ADMIN only | Force logout sessions (all, except_admin, or specific userId) |
| `/admin/permission-groups` | GET, POST | `canManagePermissions` | List/create permission groups |
| `/admin/permission-groups/[id]` | PATCH, DELETE | `canManagePermissions` | Update/delete group (system groups protected) |
| `/admin/users` | GET, POST | `canManageUsers` | List/create users (bcrypt hashing) |
| `/admin/users/[id]` | PATCH | `canManageUsers` | Update user (email uniqueness check) |
| `/admin/users/[id]/password` | PATCH | `canManageUsers` | Admin password reset (min 6 chars) |

### Announcements (`/api/announcements/`)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/announcements` | GET, POST | Any / `canCreateAnnouncement` | List (paginated, pinned first) / create |
| `/announcements/unread-count` | GET | Any | Count unread announcements |
| `/announcements/[id]/read` | POST | Any | Mark as read (upsert) |
| `/announcements/[id]` | DELETE | ADMIN | Delete announcement |

### Attendance (`/api/attendance/`)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/attendance/export` | GET | Any | Export monthly CSV (UTF-8 BOM) |
| `/attendance/heartbeat` | POST | Any | Session heartbeat (5min stale detection, force logout check) |
| `/attendance/me` | GET | Any | Personal monthly attendance |
| `/attendance/team` | GET | Any | Team attendance summary |
| `/attendance/user/[userId]` | GET | Any | User detail + login history (last 100) |
| `/attendance/[id]` | PUT | Any | Manual attendance edit |

### Authentication (`/api/auth/`)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/auth/me` | GET | Any | Current user info |
| `/auth/signout-beacon` | POST | Any | Browser close detection (sendBeacon) |
| `/auth/track-logout` | POST | Any | Manual logout tracking |
| `/auth/[...nextauth]` | * | — | NextAuth handler |

### Claims (`/api/claims/`)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/claims` | GET, POST | `canViewClaims` / `canCreateClaim` | Paginated list with filters / create (409 if exists, auto-locks order) |
| `/claims/auto-detect` | POST | `canUpdateClaim` | Auto-detect claims from slow journeys & internal notes |
| `/claims/bulk` | PATCH, DELETE | `canUpdateClaim` / `canDeleteClaim` | Bulk status/type update, bulk delete (cascading) |
| `/claims/compensation` | GET | `canViewCompensation` | Compensation analytics (raw SQL aggregation) |
| `/claims/export` | GET | `canViewClaims` | Export XLSX (max 3000 rows) |
| `/claims/filter-options` | GET | `canViewClaims` | Distinct shops/statuses for dropdowns |
| `/claims/history` | GET | `canViewClaims` | Activity audit log (UNION query of status + change history) |
| `/claims/search-orders` | GET | `canViewClaims` | Order search for claim creation (min 2 chars) |
| `/claims/[id]` | GET, PATCH, DELETE | `canViewClaims` / `canUpdateClaim` / `canDeleteClaim` | Detail with history, update with change logs, delete |

### CRM (`/api/crm/`)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/crm/assignments` | GET, POST | `canManageCRM` | Shop-staff assignments (batch with skipDuplicates) |
| `/crm/dashboard` | GET | `canViewCRM` | Shop stats, urgent list, recent activities |
| `/crm/prospects` | GET, POST | `canViewCRM` | Prospect list by stage / create |
| `/crm/prospects/stats` | GET | `canViewCRM` | Conversion rate, avg conversion days |
| `/crm/prospects/reorder` | POST | `canManageCRM` | Reorder prospects (Kanban) |
| `/crm/prospects/[id]` | GET, PUT, DELETE | `canViewCRM` / `canManageCRM` | Prospect CRUD |
| `/crm/prospects/[id]/stage` | PATCH | `canManageCRM` | Move prospect to new pipeline stage |
| `/crm/prospects/[id]/contact` | POST | `canManageCRM` | Log contact interaction |
| `/crm/prospects/[id]/lost` | PATCH | `canManageCRM` | Mark prospect as lost |
| `/crm/prospects/[id]/reopen` | PATCH | `canManageCRM` | Reopen lost prospect |
| `/crm/shops` | GET | `canViewCRM` | Shop list with classification + trends |
| `/crm/shops/[shopName]` | GET, PATCH | `canViewCRM` / `canManageCRM` | Shop detail / update |
| `/crm/shops/[shopName]/care` | GET, POST | `canViewCRM` / `canManageCRM` | Care logs |

### Dashboard (`/api/dashboard/`)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/dashboard/summary` | GET | Any | Today's metrics (cached: s-maxage=30, stale-while-revalidate=60) |
| `/dashboard/activities` | GET | Any | Recent activity feed |
| `/dashboard/carriers` | GET | Any | Carrier breakdown |
| `/dashboard/top-shops` | GET | Any | Top performing shops |
| `/dashboard/trend` | GET | Any | Historical trend data |

### Documents (`/api/documents/`)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/documents` | GET, POST | Any / `canManageDocuments` | List/upload (10MB max, stored in /public/uploads/) |
| `/documents/[id]` | GET, DELETE | Any / `canManageDocuments` | Detail / delete |
| `/documents/[id]/download` | GET | Any | File download |

### Finance (`/api/finance/`)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/finance/overview` | GET | Finance access | Revenue, cost, trend, distributions (raw SQL) |
| `/finance/pnl` | GET | Finance access | Profit & loss (revenue − carrierFee + claimDiff − expenses) |
| `/finance/budgets` | GET | Finance access | Budget data |
| `/finance/carriers` | GET | Finance access | Carrier financial breakdown |
| `/finance/cashbook` | GET | Finance access | Cashbook entries |
| `/finance/cashbook/summary` | GET | Finance access | Cashbook summary |
| `/finance/cashbook/upload` | POST | `canUploadCashbook` | Import cashbook entries |
| `/finance/cashbook/uploads` | GET | Finance access | Upload history |
| `/finance/categories` | GET, POST | Finance access | Expense categories |
| `/finance/categories/[id]` | PATCH, DELETE | Finance access | Category CRUD |
| `/finance/expenses` | GET, POST | Finance access / `canManageExpenses` | Expense management |
| `/finance/expenses/[id]` | PATCH, DELETE | `canManageExpenses` | Expense CRUD |
| `/finance/negative-revenue` | GET | Finance access | Negative revenue tracking |
| `/finance/shop-chart` | GET | Finance access | Shop financial chart data |
| `/finance/shop-trends` | GET | Finance access | Shop 14-day trend analysis |
| `/finance/shops` | GET | Finance access | Shop revenue list |

### Orders (`/api/orders/`)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/orders` | GET | Any | Paginated list with filters (sort whitelist, 10 fields) |
| `/orders/upload` | POST | `canUploadExcel` | Batch Excel import (rate limited, 10MB max, 60s timeout) |
| `/orders/auto-import` | POST | API key | Automated Excel import (external trigger) |
| `/orders/export` | GET | `canExportOrders` | Export XLSX (max 10000 rows, rate limited) |
| `/orders/delayed` | GET | Any | Delayed orders with risk analysis |
| `/orders/delayed/export` | GET | Any | Export delayed orders |
| `/orders/delete` | DELETE | `canDeleteOrders` | Bulk delete |
| `/orders/notes` | PATCH | `canEditStaffNotes` | Staff notes |
| `/orders/options` | GET | Any | Filter dropdown options |
| `/orders/returns` | GET | Any | Return order list |
| `/orders/changes` | GET | Any | Order change audit log |
| `/orders/changes/stats` | GET | Any | Change statistics |
| `/orders/upload-history` | GET | Any | Upload history |
| `/orders/[requestCode]/detail` | GET | Any | Full order detail |
| `/orders/[requestCode]/tracking` | GET | Any | Delivery tracking (SVExpress proxy, current code uses `cache: "no-store"`) |
| `/orders/[requestCode]/confirm-asked` | PATCH | Any | Mark confirmation requested |
| `/orders/[requestCode]/customer-confirmed` | PATCH | Any | Mark customer confirmed |
| `/orders/[requestCode]/warehouse` | PATCH | Any | Mark returned order as arrived at warehouse |

### Other Routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/health` | GET | None | System health + DB latency check |
| `/landing/register` | POST | None | Public lead registration |
| `/landing/stats` | GET | None | Public statistics |
| `/leave-requests` | GET, POST | Any | Personal leave management |
| `/leave-requests/all` | GET | Any | All leave requests (admin view) |
| `/leave-requests/[id]/approve` | POST | `canApproveLeave` | Approve leave |
| `/leave-requests/[id]/reject` | POST | `canApproveLeave` | Reject leave |
| `/links` | GET, POST | Any | Quick links |
| `/links/[id]` | PATCH, DELETE | Any | Link CRUD |
| `/login-history/me` | GET | Any | Personal login sessions |
| `/profile` | GET | Any | User profile |
| `/profile/password` | PATCH | Any | Change password (old password required) |
| `/profile/change-requests` | GET, POST | Any | Profile change requests |
| `/profile/change-requests/[id]` | PATCH | `canManageUsers` | Review change request |
| `/profile/feedback` | GET, POST | Any | Feedback submission |
| `/settings/attendance` | GET, PATCH | Any | Attendance configuration |
| `/todos` | GET, POST | Any | Todo list with filters |
| `/todos/stats` | GET | Any | Todo statistics |
| `/todos/overdue-count` | GET | Any | Overdue count |
| `/todos/reorder` | POST | Any | Reorder todos (Kanban drag) |
| `/todos/users` | GET | Any | Users with todos |
| `/todos/reminders` | GET | Any | Due date reminders |
| `/todos/[id]` | GET, PATCH, DELETE | Any | Todo CRUD |
| `/todos/[id]/status` | POST | Any | Status toggle |
| `/todos/[id]/complete` | POST | Any | Mark complete |
| `/todos/[id]/comments` | GET, POST | Any | Todo comments |

---

## 6. Key Business Logic

### 6.1 Revenue Formula

**File:** `src/lib/excel-parser.ts:349-350`

```typescript
revenue: ['RECONCILED', 'RETURNED_FULL', 'RETURNED_PARTIAL'].includes(deliveryStatus)
  ? (totalFee - carrierFee)
  : 0
```

Revenue is **only calculated for finalized orders** (reconciled or returned). For in-transit orders, revenue = 0.

**Profit & Loss:** `src/app/api/finance/pnl/route.ts:30-83`
- Gross Profit = `totalFeeFromShop - totalCarrierFee`
- Claim Adjustment = `carrierCompensation - customerCompensation`
- Net Profit = `grossProfit + claimAdjustment - totalOperatingExpenses`

### 6.2 Excel Upsert Logic

**Files:** `src/lib/order-import-service.ts:34-353`, `src/lib/excel-parser.ts:425-498`

- Uses raw SQL `ON CONFLICT ("requestCode") DO UPDATE SET` for bulk upsert
- Batch size: 500 orders, SQL sub-batches of 250 records
- **CRITICAL: These fields are NEVER overwritten during upsert:**
  - `staffNotes` — Manual staff annotations preserved
  - `importedAt` — Original import timestamp preserved
  - `claimLocked` — Not in update set
- Change detection runs before upsert: existing orders fetched, `existingMap` built, changes logged to `OrderChangeLog`
- After upload: `createAutoDetectedClaims()` fires non-blocking

### 6.3 Delay Analysis & Risk Scoring

**File:** `src/lib/delay-analyzer.ts:204-330`

**`normalizeReason(reason)`** — Maps 15+ Vietnamese delay reason strings to standard categories:
- "Không liên lạc được KH" → Contact issue
- "KH hẹn lại ngày giao" → Customer reschedule
- "Hàng hư hỏng/đóng gói lỗi" → Damage issue
- Removes time extensions via regex: `/thoi gian hen:.*$/i`

**`assessRisk(delayCount, reasons, daysAge, status)`** — Composite risk score:

| Factor | Score |
|---|---|
| 4+ delays | +5 |
| 3 delays | +4 |
| 2 delays | +2 |
| 1 delay | +1 |
| Severe reason ("Từ chối", "Hư hỏng", "Xác nhận hoàn") | +3 |
| Age 10+ days | +3 |
| Age 5-9 days | +2 |
| Age 3-4 days | +1 |
| Status contains "hoàn" | +1 |

**Risk levels:** Score ≥7 = HIGH, ≥4 = MEDIUM, <4 = LOW

### 6.4 Shop Trend Algorithm (14-Day Windows)

**File:** `src/app/api/finance/shop-trends/route.ts:15-84`

- **Period A (recent):** Last 14 days
- **Period B (previous):** Days 15-28 ago
- SQL `groupBy` aggregates order counts per shop for each period
- Change% = `(periodA - periodB) / periodB * 100`

**Alert levels:**
- `"new"` — Shop < 28 days old
- `"critical"` — Change ≤ -50%
- `"warning"` — Change -30% to -49%
- `"growing"` — Change ≥ +10%
- `"stable"` — Change -29% to +9%

Filter: Only shops with ≥5 orders in period B are included.

### 6.5 Slow Journey Detection

**File:** `src/lib/claim-detector.ts:79-109`

Thresholds by region (based on `regionGroup` prefix):

| Region Prefix | Max Days |
|---|---|
| "0.", "1.", "2." (intra-city/nearby) | 4 days |
| "3.", "4." (medium distance) | 10 days |
| Other (long distance) | 15 days |

Detection filters: has `pickupTime`, not delivered/reconciled/returned, no existing claim, not `claimLocked`.

### 6.6 Order Change Detection

**File:** `src/lib/change-detector.ts:176-222`

**Pattern:** `existingMap = new Map(existingOrders.map(o => [o.requestCode, o]))`

Detects 16 change types by comparing current vs. previous data:
- **STATUS_CHANGE** — `deliveryStatus` enum change
- **INTERNAL_STATUS_NOTE** — New lines in `internalNotes` field
- Sub-classification via `classifyNoteChange()` (lines 105-123): WEIGHT_CHANGE, CARRIER_FEE_CONFIRMED, RECIPIENT_CHANGE, SURCHARGE_CHANGE, SERVICE_FEE_CHANGE, COD_CONFIRMED, RETURN_COMPLETED, CARRIER_SWITCH, REDELIVER, RETURN_APPROVED, COD_AMOUNT_CHANGE, CLAIM_RELATED, STAFF_NOTE

**Ignored patterns** (lines 49-57): "đã tạo đơn hàng", "đang được lấy bởi shipper", etc.

---

## 7. State Management

### TanStack Query

**File:** `src/components/Providers.tsx`

| Setting | Value |
|---|---|
| staleTime | 5 minutes |
| gcTime | 30 minutes |
| refetchOnWindowFocus | false |
| retry | 1 |
| refetchOnReconnect | always |

### Custom Hooks (Primary Data Fetching Pattern)

| Hook | File | Purpose | Used By |
|---|---|---|---|
| `useClaimsList` | `src/hooks/useClaimsList.ts` | Claims list with pagination, visibility-triggered refetch (30s) | ClaimsClient |
| `useClaimsFilters` | `src/hooks/useClaimsFilters.ts` | URL-based filter sync via `next/navigation` | ClaimsClient |
| `useClaimMutations` | `src/hooks/useClaimMutations.ts` | Export, inline edit, auto-detect with optimistic updates | ClaimsClient |
| `useTodos` | `src/hooks/useTodos.ts` | Todo CRUD, optimistic toggles, Kanban reorder | TodosClient |
| `useTodoStats` | `src/hooks/useTodoStats.ts` | Todo statistics | TodoSummaryCards |
| `useTodoUsers` | `src/hooks/useTodoUsers.ts` | User list for assignment | TodoFilters |
| `useDebounce` | `src/hooks/useDebounce.ts` | Debounce utility (300-500ms) | Search inputs |

### Zustand

**File:** `src/stores/index.ts` — Placeholder only. Not yet used. Zustand is installed but stores are empty.

### URL-Based State

Claims and todos pages persist filter state in URL search params for:
- Back navigation preservation
- Deep linking / shareability
- Browser history support

### Session Storage

`IdleLogoutProvider` (`src/components/attendance/IdleLogoutProvider.tsx`) uses `sessionStorage.lastActivityTime` for idle tracking:
- Idle timeout: 60 minutes (configurable)
- Midnight auto-logout (configurable time, Asia/Ho_Chi_Minh)
- Tracks: mousemove, mousedown, keydown, scroll, touchstart, click

---

## 8. External Integrations

### SVExpress Tracking API

**Proxy route:** `src/app/api/orders/[requestCode]/tracking/route.ts`

```
GET https://api.svexpress.vn/v1/order/tracking-landing-page/{requestCode}
```

- Proxied through Next.js API to avoid CORS
- Custom headers (user-agent, referer) to mimic browser
- Current code sends `fetch(..., { cache: "no-store" })`; an earlier handoff draft mentioned a 5-minute cache, but that is not present in `src/app/api/orders/[requestCode]/tracking/route.ts`
- UI: `src/components/tracking/TrackingPopup.tsx` — portal-based modal with timeline

### Auto-Import (External Trigger)

**Route:** `POST /api/orders/auto-import`
- Authenticated via `x-api-key` header (env: `AUTO_IMPORT_API_KEY`)
- Designed for external automation (GitHub Actions, cron jobs)
- Rate limited, max 10MB file

### No Other External Services

The app is self-contained with Supabase PostgreSQL as the sole external database. No third-party analytics, payment, or notification services are integrated.

---

## 9. UI Patterns & Conventions

### Language Rules

- **All user-facing text:** Vietnamese with proper diacritics (UTF-8)
- **All code/variables/comments:** English
- Example: Button text = "Tải lên file", function name = `uploadFile()`

### Formatting Standards

| Format | Pattern | Example |
|---|---|---|
| Currency | VND with dot separator | 1.500.000đ |
| Date | DD/MM/YYYY | 01/04/2026 |
| DateTime | DD/MM/YYYY HH:mm (24h) | 01/04/2026 14:30 |
| Phone | 10 digits, starts with 0 | 0901234567 |
| Timezone | Asia/Ho_Chi_Minh (UTC+7) | — |

### Dialog Styling

- Background: white `#FFFFFF`
- Border: blue 1.5px `#2563EB`
- Backdrop: dark overlay
- Implementation: Radix UI `@radix-ui/react-dialog` + custom wrapper in `src/components/ui/dialog.tsx`

### shadcn/ui Components Used

| Component | File | Usage |
|---|---|---|
| Dialog | `src/components/ui/dialog.tsx` | All modals and dialogs |
| Table | `src/components/ui/table.tsx` | Data tables |

> Most UI is custom-built with Tailwind CSS + Radix primitives rather than a full component library.

### Responsive Layout

- **Desktop** (>1024px): Collapsible sidebar + full content area
- **Tablet** (640-1024px): Collapsed sidebar, adapted tables
- **Mobile** (<640px): Bottom navigation or hidden sidebar, card layouts
- Responsive files: `*Responsive.ts` in each feature folder (claims, delayed, finance, orders)

### Security Headers

**File:** `next.config.ts`

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-DNS-Prefetch-Control: on
Strict-Transport-Security: max-age=31536000; includeSubDomains
Permissions-Policy: camera=(), microphone=(), geolocation=()
```
