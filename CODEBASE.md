# CODEBASE.md — HuyHoang Express OMS

> File dependency map for AI agents. Updated: 2026-03-25.

---

## 🏗️ Core Infrastructure

### Auth & Permissions Chain
```
src/lib/auth.config.ts     ← Edge-compatible config (credentials provider)
    └→ src/lib/auth.ts     ← Full auth (session callbacks, user lookup)
        └→ src/lib/permissions.ts  ← PermissionSet type, helpers
            └→ src/middleware.ts   ← Route-level permission checks
```
**Impact:** Changing `PermissionGroup` model → update `permissions.ts` → update `middleware.ts` → update all API routes checking permissions.

### Database
```
prisma/schema.prisma       ← Source of truth for ALL models
    └→ src/lib/prisma.ts   ← Singleton PrismaClient
```
**Impact:** Schema changes → run `prisma migrate dev` → may need `prisma generate` → update affected API routes + components.

### API Foundation
```
src/lib/api-handler.ts     ← apiHandler wrapper (auth + error handling)
src/lib/validations.ts     ← Zod schemas for request validation
src/lib/sanitize.ts        ← DOMPurify sanitization for user input
src/lib/rate-limiter.ts    ← Rate limiting for API routes
```

---

## 📦 Business Logic (src/lib/)

### Excel Import Pipeline
```
src/lib/excel-parser.ts     ← Column mapping, date conversion (UTC+7→UTC)
    └→ src/lib/change-detector.ts  ← Detects field changes between uploads
    └→ src/lib/status-mapper.ts    ← Maps Vietnamese status text → DeliveryStatus enum
    └→ src/lib/claim-detector.ts   ← Auto-detects claimable issues from notes
```
**Used by:** `src/app/api/orders/upload/route.ts`

### Order Analysis
```
src/lib/delay-analyzer.ts   ← Analyzes delay patterns from publicNotes
src/lib/status-mapper.ts    ← Vietnamese status text → DeliveryStatus enum
```

### Finance
```
src/lib/finance-auth.ts     ← Finance-specific permission checks
src/lib/finance-period.ts   ← Period calculations (month/quarter/year)
```

### Utilities
```
src/lib/utils.ts            ← cn(), formatCurrency(), formatDate(), date helpers
src/lib/env.ts              ← Environment variable validation
src/lib/logger.ts           ← Server-side logging
```

---

## 🌐 API Routes (src/app/api/)

| Module | Routes | Key Dependencies |
|--------|--------|-----------------|
| **orders/** | CRUD, upload, export, stats, changes, delete-all | excel-parser, change-detector, status-mapper |
| **claims/** | CRUD, stats, status-history, change-logs | claim-detector, validations |
| **finance/** | cashbook, expenses, budgets, revenue, dashboard | finance-auth, finance-period |
| **crm/** | shops, prospects, care-logs, assignments, stats | validations |
| **attendance/** | CRUD, stats, leave-requests, scores | attendance.ts |
| **todos/** | CRUD, comments, reorder | validations |
| **admin/** | users, permissions, announcements | auth, permissions |
| **auth/** | login, register, session, logout | auth.ts |
| **dashboard/** | stats, charts, recent-orders | prisma |
| **profile/** | info, change-requests, feedback | auth |

---

## 🧩 Components (src/components/)

### Module Components → API Mapping

| Component Dir | API Called | Key Files |
|--------------|-----------|-----------|
| `orders/` | `/api/orders/*` | OrderTable, ExcelUpload, OrderFilters, OrderDetailDialog |
| `delayed/` | `/api/orders/*` | DelayedOrderTable, DelayAnalysis, ContactDialog |
| `returns/` | `/api/orders/*` | ReturnTable, ReturnTracking, WarehouseConfirm |
| `claims/` | `/api/claims/*` | ClaimTable, ClaimDialog, ClaimStatusFlow |
| `crm/` | `/api/crm/*` | ShopList, ProspectPipeline, CareLogDialog |
| `finance/` | `/api/finance/*` | CashbookTable, ExpenseForm, BudgetChart |
| `attendance/` | `/api/attendance/*` | AttendanceTable, LeaveRequestForm |
| `todos/` | `/api/todos/*` | KanbanBoard, TodoCard, TodoComments |
| `dashboard/` | `/api/dashboard/*` | StatCards, Charts, RecentOrders |

### Shared & Layout
```
src/components/shared/      ← Pagination, DatePicker, StatusBadge, ConfirmDialog, etc.
src/components/layout/       ← Sidebar.tsx, Header.tsx, DashboardLayout
src/components/ui/           ← Button, Dialog, Input (Radix-based primitives)
src/components/providers/    ← QueryProvider (TanStack)
src/components/Providers.tsx ← Root providers (Session + Query)
src/components/tracking/     ← Package tracking UI
```

---

## 🔗 High-Impact Dependency Chains

### 1. Order Lifecycle (most critical)
```
Excel Upload → excel-parser → change-detector → status-mapper
    → Order (DB) → DelayedOrders / Returns / Claims pages
    → OrderChangeLog (change tracking)
```

### 2. Permission System
```
PermissionGroup (schema) → permissions.ts → auth.ts (session)
    → middleware.ts (route guard)
    → API routes (handler-level check)
    → Components (conditional rendering)
```

### 3. Finance Pipeline
```
CashbookUpload → cashbook entries (DB)
Expenses CRUD → ExpenseCategory + MonthlyBudget
Revenue = Order.totalFee - Order.carrierFee (calculated)
```

---

## ⚠️ Change Impact Guide

| If You Change... | Also Update... |
|-----------------|----------------|
| `prisma/schema.prisma` | Run migration, update affected API routes, update TypeScript types |
| `src/lib/permissions.ts` | `middleware.ts`, API routes with permission checks, component visibility |
| `src/lib/auth.ts` | `auth.config.ts` (if provider change), session type declarations |
| `src/lib/excel-parser.ts` | `change-detector.ts`, `status-mapper.ts`, upload API route |
| `src/lib/validations.ts` | All API routes using those Zod schemas |
| `src/lib/utils.ts` | Potentially all components (cn, formatCurrency, formatDate) |
| `src/components/ui/*` | All feature components importing from ui/ |
| `DeliveryStatus` enum | `status-mapper.ts`, `delay-analyzer.ts`, all order-related components |

---
