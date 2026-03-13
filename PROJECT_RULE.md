# Project Rules — Shipping Management App

## Identity
This is a web application for a Vietnamese shipping brokerage company
(intermediary between customers and shipping carriers/partners).
The app manages orders, customer care, returns, claims, employees, and finances.

## Language Rules
- ALL user-facing text: Vietnamese (buttons, labels, messages, placeholders, table headers, tooltips)
- ALL code: English (variable names, function names, type names, comments, commit messages)
- Example button: "Tải lên file" (not "Upload file")
- Example variable: `uploadFile()` (not `taiLenFile()`)
- Example comment: `// Parse Excel file and upsert orders`

## Tech Stack — Do NOT deviate
- Next.js 14+ with App Router (NEVER use Pages Router)
- TypeScript in strict mode (NEVER use `any` type)
- Tailwind CSS for styling
- shadcn/ui for components — use shadcn components first, only build custom if shadcn doesn't have it
- Prisma ORM for ALL database operations (NEVER write raw SQL unless for optimization)
- PostgreSQL database
- NextAuth.js or Supabase Auth for authentication
- SheetJS (xlsx) for Excel read/write
- Recharts for charts and data visualization
- Zustand for client state management
- TanStack Query (React Query) for server state / data fetching
- @hello-pangea/dnd for drag-and-drop (Kanban board)

## Vietnamese Formatting Standards
- Currency: VND with dot separator → 1.500.000đ (NEVER use comma for thousands)
- Date: DD/MM/YYYY (Vietnamese format, not MM/DD/YYYY)
- DateTime: DD/MM/YYYY HH:mm (24-hour format)
- Phone: 10 digits, starting with 0 → 0901234567
- Timezone: Asia/Ho_Chi_Minh (UTC+7) for all date operations

## Before Starting ANY Task
1. ALWAYS activate the `execute-matrix` skill first
2. Check the decision matrix for which skills to load (max 3 per task)
3. Read the relevant skill(s) before writing code
4. Follow the phase order: Phase 1 → 2 → 3 → ... → 11

## Folder Structure — Follow exactly
```
src/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Dashboard
│   │   ├── orders/page.tsx       # Quản lý đơn hàng
│   │   ├── delayed/page.tsx      # Chăm sóc đơn Hoãn
│   │   ├── returns/page.tsx      # Theo dõi đơn Hoàn
│   │   ├── claims/page.tsx       # Bồi hoàn / Khiếu nại
│   │   ├── todos/page.tsx        # Todo / Kanban
│   │   ├── attendance/page.tsx   # Chấm công
│   │   ├── finance/page.tsx      # Tài chính (Manager/Admin)
│   │   └── admin/users/page.tsx  # Quản lý nhân viên
│   └── api/                      # API routes
├── components/
│   ├── ui/                       # shadcn/ui
│   └── [feature]/                # Feature-specific components
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── utils.ts
│   └── excel-parser.ts
├── hooks/
├── stores/                       # Zustand stores
├── types/
└── middleware.ts                  # Auth + RBAC
```

## RBAC (Role-Based Access Control) — Enforce everywhere
| Feature | ADMIN | MANAGER | STAFF | VIEWER |
|---------|-------|---------|-------|--------|
| Dashboard (full) | ✅ | ✅ | Operational only | Read-only |
| User management | ✅ | ❌ | ❌ | ❌ |
| Order management | ✅ | ✅ | ✅ | Read-only |
| Excel upload | ✅ | ✅ | ✅ | ❌ |
| Delayed order care | ✅ | ✅ | ✅ | Read-only |
| Return tracking | ✅ | ✅ | ✅ | Read-only |
| Claims management | ✅ | ✅ | ✅ | Read-only |
| Todo / Kanban | ✅ | ✅ (all) | ✅ (own) | ❌ |
| Attendance (all) | ✅ | ✅ | Own only | ❌ |
| Employee scoring | ✅ | ✅ | ❌ | ❌ |
| Financial reports | ✅ | ✅ | ❌ | ❌ |

## Code Standards
- Every page must handle 3 states: Loading (skeleton), Error (toast + message), Empty (friendly message)
- Every API route: validate auth → validate role → validate input → process → return
- Every form: client-side validation (Zod) + server-side validation
- Every list: pagination (default 20 items), search, at least one filter
- Commit format: `feat: add order upload page` / `fix: correct VND formatting` / `chore: update dependencies`

## Performance Rules
- Order table: ALWAYS paginate, NEVER fetch all 100K+ rows
- Excel upload: process in batches of 500 rows
- Dashboard: use database aggregation (GROUP BY, COUNT, SUM), not client-side loops
- Images: use next/image with lazy loading
- Components: lazy load heavy components (charts, Kanban board)

## Security Rules
- NEVER commit .env files to Git
- NEVER store plain-text passwords
- NEVER trust client-side role checks alone — always verify on server
- NEVER expose database IDs in URLs if possible — use orderCode instead
- Sanitize all user inputs before database operations
