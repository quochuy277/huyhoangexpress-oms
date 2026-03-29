# Project Rules — Shipping Management App

## Identity
This is a web application for a Vietnamese shipping brokerage company
(intermediary between customers and shipping carriers/partners).
The app manages orders, customer care, returns, claims, CRM, employees, and finances.

## Language Rules
- ALL user-facing text: Vietnamese (buttons, labels, messages, placeholders, table headers, tooltips)
- ALL code: English (variable names, function names, type names, comments, commit messages)

### Vietnamese Text Integrity
- NEVER strip Vietnamese diacritics from user-facing text. Do not convert UI copy to ASCII-only Vietnamese.
- ALL files containing Vietnamese UI text must be saved and preserved as UTF-8 so the app renders full Vietnamese accents correctly.
- When editing existing Vietnamese strings, prefer restoring from the last correct version instead of rewriting hurriedly from memory.
- Before commit, verify touched user-facing files do not contain mojibake or accent-loss regressions.
- If a helper, export mapper, chart label, dialog copy, placeholder, toast, tooltip, or empty state is visible to users, it must remain full Vietnamese with proper diacritics.
- Example button: "Tải lên file" (not "Upload file")
- Example variable: `uploadFile()` (not `taiLenFile()`)
- Example comment: `// Parse Excel file and upsert orders`

## Tech Stack — Do NOT deviate
- **Next.js 16+** with App Router (NEVER use Pages Router)
- **React 19** with Server Components where possible
- **TypeScript** in strict mode (NEVER use `any` type — define proper interfaces in `types/`)
- **Tailwind CSS v4** for styling (NEVER use inline styles — use Tailwind classes)
- **Prisma ORM** for ALL database operations (NEVER write raw SQL unless for optimization)
- **PostgreSQL** database
- **NextAuth.js v5** (Auth.js) for authentication
- **SheetJS (xlsx)** for Excel read/write
- **Recharts** for charts and data visualization
- **TanStack Query (React Query)** for data fetching in complex modules (CRM, etc.)
- **Custom hooks** (`hooks/`) for simpler data fetching patterns (todos, stats, etc.)
- **@hello-pangea/dnd** for drag-and-drop (Kanban board)
- **Zod** for input validation (server-side)
- **@radix-ui** for accessible UI primitives (dialog, etc.)

### Tech Stack Notes
- Use **TanStack Query** for modules with complex cache invalidation, related queries, or real-time updates (e.g., CRM). Use **custom hooks** with `fetch` + `useState` for simpler CRUD pages.
- Prefer **Tailwind classes** over component libraries. Build custom components using Tailwind + Radix primitives when needed.

## Vietnamese Formatting Standards
- Currency: VND with dot separator → 1.500.000đ (NEVER use comma for thousands)
- Date: DD/MM/YYYY (Vietnamese format, not MM/DD/YYYY)
- DateTime: DD/MM/YYYY HH:mm (24-hour format)
- Phone: 10 digits, starting with 0 → 0901234567
- Timezone: Asia/Ho_Chi_Minh (UTC+7) for all date operations

## Before Starting ANY Task
1. **Brainstorm first** — Use the `brainstorming` skill for creative/feature work
2. **Plan if complex** — Use the `writing-plans` skill for multi-step tasks
3. **Debug systematically** — Use the `systematic-debugging` skill for bugs/failures
4. **Verify before done** — Use the `verification-before-completion` skill before claiming done
5. **Update the build log** — Append changes to `Claude_Build and Fix.md`

## Folder Structure — Follow exactly
```
src/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (landing)/page.tsx              # Landing page
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   ├── overview/page.tsx           # Tổng Quan (Dashboard)
│   │   ├── orders/
│   │   │   ├── page.tsx                # Quản lý đơn hàng
│   │   │   └── [requestCode]/page.tsx  # Chi tiết đơn hàng
│   │   ├── delayed/page.tsx            # Chăm sóc đơn Hoãn
│   │   ├── returns/page.tsx            # Theo dõi đơn Hoàn
│   │   ├── claims/
│   │   │   ├── page.tsx                # Bồi hoàn / Khiếu nại
│   │   │   └── new/page.tsx            # Tạo khiếu nại mới
│   │   ├── todos/page.tsx              # Công Việc (Todo / Kanban)
│   │   ├── crm/page.tsx               # Quản Lý Khách Hàng (CRM)
│   │   ├── attendance/page.tsx         # Chấm công
│   │   ├── finance/page.tsx            # Tài chính
│   │   └── admin/users/page.tsx        # Quản lý nhân viên
│   └── api/                            # API routes
│       ├── admin/                      # User management APIs
│       ├── announcements/              # Thông báo nội bộ
│       ├── attendance/                 # Chấm công APIs
│       ├── auth/                       # Authentication
│       ├── claims/                     # Khiếu nại APIs
│       ├── crm/                        # CRM APIs (shops, prospects, care logs)
│       ├── dashboard/                  # Dashboard stats
│       ├── documents/                  # Tài liệu nội bộ
│       ├── finance/                    # Tài chính APIs
│       ├── leave-requests/             # Nghỉ phép
│       ├── links/                      # Link nội bộ
│       ├── orders/                     # Đơn hàng APIs
│       ├── profile/                    # Profile & feedback
│       ├── settings/                   # Cài đặt hệ thống
│       └── todos/                      # Công việc APIs
├── components/
│   ├── ui/                             # Shared UI primitives (dialog, table)
│   ├── layout/                         # DashboardShell, Sidebar, Header
│   ├── shared/                         # Shared across features (AddTodoDialog, OrderDetailDialog)
│   ├── providers/                      # React providers (Heartbeat, etc.)
│   ├── orders/                         # Orders feature components
│   ├── delayed/                        # Delayed orders components
│   ├── returns/                        # Returns components
│   ├── claims/                         # Claims components
│   ├── todos/                          # Todo feature components
│   ├── crm/                            # CRM components
│   ├── attendance/                     # Attendance components
│   ├── finance/                        # Finance components
│   ├── dashboard/                      # Dashboard/Overview components
│   └── tracking/                       # Tracking components
├── hooks/                              # Custom React hooks
├── lib/
│   ├── prisma.ts                       # Database client
│   ├── auth.ts / auth.config.ts        # Auth configuration
│   ├── permissions.ts                  # Permission system (PermissionSet)
│   ├── utils.ts                        # General utilities
│   ├── excel-parser.ts                 # Excel parsing
│   ├── validations.ts                  # Zod schemas
│   ├── env.ts                          # Environment validation
│   ├── sanitize.ts                     # Input sanitization
│   ├── logger.ts                       # Logging
│   ├── rate-limiter.ts                 # API rate limiting
│   ├── status-mapper.ts               # Order status mapping
│   ├── delay-analyzer.ts              # Delay analysis logic
│   ├── claim-detector.ts              # Auto claim detection
│   ├── change-detector.ts             # Order change detection
│   ├── finance-auth.ts                # Finance-specific auth
│   ├── finance-period.ts              # Financial period utilities
│   ├── api-handler.ts                 # API helper utilities
│   └── actions/                        # Server actions
├── types/                              # TypeScript type definitions
│   ├── index.ts                        # Re-exported Prisma types + API types
│   ├── todo.ts                         # Todo feature types
│   ├── returns.ts                      # Returns types
│   └── next-auth.d.ts                  # NextAuth type extensions
├── stores/                             # State management (future use)
└── middleware.ts                        # Auth + route protection
```

## Permission System
The app uses a granular permission system defined in `lib/permissions.ts`.
Each permission is a boolean flag in the `PermissionSet` interface.
Permissions are grouped by feature module:

| Module | Permissions |
|--------|-------------|
| Orders | `canViewOrders`, `canUploadExcel`, `canDeleteOrders`, `canEditStaffNotes`, `canExportOrders` |
| Finance | `canViewRevenue`, `canViewCarrierFee`, `canViewFinancePage`, `canViewDashboardFinance`, `canManageExpenses`, `canUploadCashbook`, `canManageBudgets` |
| Delayed | `canViewDelayed` |
| Returns | `canViewReturns`, `canConfirmReturn` |
| Claims | `canViewClaims`, `canCreateClaim`, `canUpdateClaim`, `canDeleteClaim`, `canViewCompensation` |
| Todos | `canViewAllTodos` |
| Attendance | `canViewAllAttendance`, `canEditAttendance`, `canScoreEmployees` |
| Leave | `canApproveLeave` |
| Documents | `canManageDocuments`, `canManageLinks` |
| Announcements | `canCreateAnnouncement` |
| CRM | `canViewCRM`, `canManageCRM`, `canViewAllShops` |
| Admin | `canManageUsers`, `canManagePermissions` |

## RBAC (Role-Based Access Control) — Default permissions per role
| Feature | ADMIN | MANAGER | STAFF | VIEWER |
|---------|-------|---------|-------|--------|
| Tổng Quan (Dashboard) | Full | Full | Operational only | Read-only |
| Quản lý nhân viên | ✅ | ❌ | ❌ | ❌ |
| Quản lý đơn hàng | ✅ | ✅ | ✅ | Read-only |
| Excel upload | ✅ | ✅ | ✅ | ❌ |
| Chăm sóc đơn Hoãn | ✅ | ✅ | ✅ | Read-only |
| Theo dõi đơn Hoàn | ✅ | ✅ | ✅ | Read-only |
| Bồi hoàn / Khiếu nại | ✅ | ✅ | ✅ | Read-only |
| Công Việc (Todo) | ✅ (all) | ✅ (all) | ✅ (own) | ❌ |
| CRM / Quản lý KH | ✅ | ✅ | ✅ (assigned) | ❌ |
| Chấm công (all) | ✅ | ✅ | Own only | ❌ |
| Chấm điểm nhân viên | ✅ | ✅ | ❌ | ❌ |
| Tài chính | ✅ | ✅ | ❌ | ❌ |
| Nghỉ phép (approve) | ✅ | ✅ | Own only | ❌ |
| Thông báo (create) | ✅ | ✅ | ❌ | ❌ |
| Tài liệu / Links | ✅ | ✅ | Read-only | Read-only |

> **Note:** Individual permissions can be customized per user via Permission Groups in Admin settings, overriding the default role-based permissions.

## Code Standards
- Every page must handle 3 states: Loading (skeleton), Error (toast + message), Empty (friendly message)
- Every API route: validate auth → validate role/permission → validate input → process → return
- Every form: client-side validation + server-side validation (Zod)
- Every list: pagination (default 20 items), search, at least one filter
- Commit format: `feat: add order upload page` / `fix: correct VND formatting` / `chore: update dependencies`
- Component pattern: **separate concerns** — split files > 300 lines into sub-components
- Data fetching: use **custom hooks** in `hooks/` to encapsulate fetch logic (not raw fetch in components)
- Styling: **Tailwind classes only** — never inline styles, never CSS modules
- Responsive: every page must work on desktop (>1024px), tablet (640-1024px), and mobile (<640px)

## Performance Rules
- Order table: ALWAYS paginate, NEVER fetch all 100K+ rows
- Excel upload: process in batches of 500 rows
- Dashboard: use database aggregation (GROUP BY, COUNT, SUM), not client-side loops
- Images: use next/image with lazy loading
- Components: lazy load heavy components (charts, Kanban board)
- Search inputs: ALWAYS debounce (300-500ms) before triggering API calls
- Mutations: use **optimistic updates** for toggle/status changes to reduce perceived latency
- API data: cache user lists and rarely-changing data at module level

## Security Rules
- NEVER commit .env files to Git
- NEVER store plain-text passwords
- NEVER trust client-side role checks alone — always verify on server via `permissions.ts`
- NEVER expose database IDs in URLs if possible — use orderCode instead
- Sanitize all user inputs before database operations (use `lib/sanitize.ts`)
- Rate limit sensitive API endpoints (use `lib/rate-limiter.ts`)
