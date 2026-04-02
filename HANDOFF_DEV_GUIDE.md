# HANDOFF_DEV_GUIDE.md - HuyHoang Express OMS

> Last updated: 2026-04-01
> Audience: any developer or AI agent continuing work in this repository without prior chat context.

---

## Table of Contents

1. [Local Setup](#1-local-setup)
2. [Environment Variables](#2-environment-variables)
3. [Development Workflow](#3-development-workflow)
4. [Deploy Workflow](#4-deploy-workflow)
5. [Testing](#5-testing)
6. [Key Files Reference](#6-key-files-reference)
7. [Practical Warnings](#7-practical-warnings)

---

## 1. Local Setup

### 1.1 Clone and install

```powershell
git clone https://github.com/quochuy277/huyhoangexpress-oms.git
cd huyhoangexpress-oms
npm install
```

### 1.2 Create `.env`

Copy `.env.example` to `.env` and fill in real values.

### 1.3 Database connection rules

Use Supabase PostgreSQL with two connection styles:

- `DATABASE_URL`: transaction pooler on port `6543`, with `?pgbouncer=true`
- `DIRECT_URL`: direct connection on port `5432`

Example shape from `.env.example`:

```env
DATABASE_URL="postgresql://...:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...:5432/postgres"
```

### 1.4 Prisma rule

Use:

```powershell
npx prisma db push
```

Never use:

```powershell
npx prisma migrate dev
```

Reason:

- the project workflow assumes `db push`
- the user brief explicitly warns about OneDrive file-locking issues with local Prisma migration workflows

### 1.5 Prisma recovery steps

If Prisma gets stuck or throws engine errors:

```powershell
taskkill /f /im node.exe
Remove-Item -Recurse -Force node_modules/.prisma
npm install
```

Then retry the Prisma command.

---

## 2. Environment Variables

Variables confirmed from `.env.example` and source code:

| Variable | Required | Purpose | Notes |
|---|---|---|---|
| `DATABASE_URL` | Yes | Main Prisma connection string | Use Supabase pooler on `6543` with `?pgbouncer=true` |
| `DIRECT_URL` | Yes in practice | Direct Prisma connection | Use Supabase direct port `5432` |
| `NEXT_PUBLIC_SUPABASE_URL` | [UNKNOWN - may be optional] | Public Supabase URL | Present in `.env.example`, but no clear active usage found in reviewed source |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | [UNKNOWN - may be optional] | Public Supabase anon key | Present in `.env.example`, but no clear active usage found in reviewed source |
| `NEXTAUTH_SECRET` | Yes for NextAuth runtime | NextAuth secret | Present in `.env.example` |
| `NEXTAUTH_URL` | Yes outside simple local defaults | Base auth URL | Present in `.env.example` |
| `AUTO_IMPORT_API_KEY` | Yes if using auto-import endpoint | Protects `POST /api/orders/auto-import` | Referenced in `src/middleware.ts` |
| `NODE_ENV` | Runtime standard | Environment mode | Used implicitly and in `src/lib/env.ts` |
| `AUTH_SECRET` | [DRIFT - verify] | Validated by `src/lib/env.ts` | Codebase drift: `.env.example` documents `NEXTAUTH_SECRET`, but `src/lib/env.ts` expects `AUTH_SECRET` |

Important note:

- `src/lib/env.ts` is not obviously imported, so env validation is not currently a guaranteed runtime guard.

---

## 3. Development Workflow

### 3.1 Add a new page

1. Create the page under `src/app/.../page.tsx`
2. If it belongs inside the authenticated dashboard shell, place it under `src/app/(dashboard)/...`
3. Add sidebar navigation in `src/components/layout/Sidebar.tsx` if needed
4. Add page-level permission checks in:
   - `src/components/layout/Sidebar.tsx`
   - `src/middleware.ts` if the route should be blocked on navigation
5. If the page needs loading UI, add a colocated `loading.tsx`

### 3.2 Add a new API route

1. Create `src/app/api/<domain>/route.ts` or `src/app/api/<domain>/[id]/route.ts`
2. Authenticate with `auth()` unless the endpoint is intentionally public
3. Enforce permission checks inside the handler
4. Validate request data explicitly
5. Return stable JSON shapes
6. Add rate limiting for expensive or abuse-prone endpoints

Rule of thumb:

- Do not rely on `src/middleware.ts` alone for authorization
- Handlers are the real security boundary

### 3.3 Modify the database schema

1. Edit `prisma/schema.prisma`
2. Review indexes and relations carefully
3. Run `npx prisma generate`
4. Run `npx prisma db push`
5. Re-run relevant tests

Do not:

- create ad hoc schema truth in SQL files
- use `migrate dev` for this project workflow

### 3.4 Add a new permission

Update all of the following together:

1. `prisma/schema.prisma` - add boolean field on `PermissionGroup`
2. `src/lib/permissions.ts` - add to `PermissionSet`, `PERMISSION_KEYS`, labels, defaults
3. `prisma/seed.ts` - seed values for system groups if still used
4. `src/components/layout/Sidebar.tsx` - if navigation depends on it
5. `src/middleware.ts` - if page-route blocking depends on it
6. All affected API handlers - enforce it server-side
7. Admin permission-group UI in `src/app/(dashboard)/admin/users/page.tsx`

### 3.5 Naming conventions

- App routes: kebab-case folders under `src/app`
- API routes: resource-oriented folders under `src/app/api`
- React components: PascalCase `.tsx`
- Utility modules: lower-case or kebab-case `.ts`
- Code, comments, and identifiers: English
- UI copy: Vietnamese

---

## 4. Deploy Workflow

### 4.1 Current deploy model

- Next.js app deployed to Vercel
- GitHub -> Vercel auto-deploy is assumed by the user brief
- Production URL from the brief: `huyhoang.express`

### 4.2 Serverless constraints

The user brief says to assume Vercel Hobby and a 10-second serverless limit.

Current code reality:

- `src/app/api/orders/upload/route.ts` exports `maxDuration = 60`

Interpretation:

- the code is written as if longer execution is available
- the real production timeout must be verified against the actual Vercel setup

### 4.3 Why Excel upload mostly works anyway

The import path is optimized:

- parse once in `src/lib/excel-parser.ts`
- detect existing rows up front
- upsert in batches in `src/lib/order-import-service.ts`
- use raw SQL for bulk upserts
- track upload history and change logs

This reduces timeout risk, but it is still a single request path and should be treated carefully on large files.

### 4.4 Safe deployment checklist

1. Run `npm.cmd run test:run`
2. Run `npm.cmd run build`
3. Check for auth or middleware regressions
4. Confirm no API handler lost a permission check
5. Confirm landing and login routes still behave correctly

---

## 5. Testing

### 5.1 Commands

```powershell
npm.cmd run test:run
npm.cmd run test:coverage
npm.cmd run build
```

### 5.2 Current setup

- Test runner: Vitest
- Config file: `vitest.config.ts`
- Environment: `node`
- Coverage focus: `src/lib/**/*.ts`
- Coverage excludes: `src/lib/prisma.ts`

### 5.3 What is currently tested

Verified test folders include:

- `src/__tests__/app/api/...`
- `src/__tests__/components/...`
- `src/__tests__/hooks/...`
- `src/__tests__/lib/...`

Especially useful coverage exists for:

- permissions
- delay analysis
- Excel parsing
- change detection
- claim detection helpers
- confirm dialog behavior
- rate limiting
- several responsive UI helpers

### 5.4 What is not heavily tested

- large page clients such as admin, claims, finance, and CRM
- end-to-end navigation flows
- most database-backed API interactions under realistic production data volume

---

## 6. Key Files Reference

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | Database schema; single source of truth for models, enums, relations, and indexes |
| `PROJECT_INSTRUCTIONS.md` | [UNKNOWN - file not found in current repo] |
| `PROMPT_CRM_MINI.md` | [UNKNOWN - file not found in current repo] |
| `PROMPT_CRM_MINI_COMPLETE.md` | [UNKNOWN - file not found in current repo] |
| `PLAN_BIEN_DONG_DON_HANG_FINAL.md` | [UNKNOWN - file not found in current repo] |
| `PLAN_PHASE_6_7_8.md` | [UNKNOWN - file not found in current repo] |
| `AUDIT_REPORT.md` | [UNKNOWN - file not found in current repo] |
| `CLAUDE_CODE_AUDIT_REPORT.md` | [UNKNOWN - file not found in current repo] |
| `PROJECT_RULE.md` | Project rules and conventions present in the repo root |
| `CODEBASE.md` | Existing codebase documentation snapshot in repo root |
| `Claude_Build and Fix.md` | Existing notes file in repo root |
| `src/lib/auth.ts` | NextAuth credentials flow, JWT/session enrichment, login side effects |
| `src/lib/permissions.ts` | Canonical permission definitions and labels |
| `src/lib/order-import-service.ts` | Main Excel import orchestration and batch upsert logic |
| `src/lib/excel-parser.ts` | Excel row parsing and overwrite rules |
| `src/lib/delay-analyzer.ts` | Delay regex parsing, normalization, and risk scoring |
| `src/lib/claim-detector.ts` | Auto-claim detection and slow-journey logic |
| `src/middleware.ts` | Route auth, login subdomain handling, API-key gating |

---

## 7. Practical Warnings

### Treat docs as secondary to code

- Existing handoff docs already contained stale details.
- When in doubt, trust `prisma/schema.prisma`, route handlers under `src/app/api`, and permission logic under `src/lib/permissions.ts`.

### Do not assume UI gating equals security

- Several current bugs come from UI-only permission assumptions.
- Always enforce permission checks in the API handler itself.

### Be careful with large local edits

- Several feature files are already very large.
- Prefer extracting smaller components or hooks instead of adding more logic inline.

### Verify deployment assumptions before changing upload or timeout logic

- The repository and the user brief disagree on request-duration assumptions.
- Confirm the real Vercel limits before redesigning imports.
