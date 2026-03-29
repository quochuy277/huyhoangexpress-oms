---
trigger: always_on
---

# GEMINI.md - HuyHoang Express OMS

> Project-specific rules for the Order Management System (Quản lý đơn hàng).

---

## 📋 PROJECT CONTEXT

| Attribute | Value |
|-----------|-------|
| **Project** | HuyHoang Express OMS — Hệ thống quản lý đơn hàng vận chuyển |
| **Stack** | Next.js 16 (App Router, Turbopack) + Prisma 6 + PostgreSQL (Supabase) + TailwindCSS v4 |
| **Auth** | NextAuth v5 (beta) + bcryptjs + PermissionGroup-based RBAC |
| **State** | Zustand + TanStack React Query v5 |
| **Testing** | Vitest 4 + vitest-mock-extended |
| **UI** | Radix UI Dialog + Lucide Icons + Recharts + class-variance-authority + TipTap Editor |
| **Deploy** | Vercel |
| **DB** | Supabase PostgreSQL with `DATABASE_URL` + `DIRECT_URL` |
| **Language** | TypeScript strict, Vietnamese business domain |

### Business Modules

| Module | Path | Description |
|--------|------|-------------|
| **Orders** | `/orders` | Quản lý đơn hàng chính (Excel import, CRUD, tracking) |
| **Delayed** | `/delayed` | Chăm sóc đơn hoãn (DELIVERY_DELAYED, RETURN_CONFIRMED) |
| **Returns** | `/returns` | Theo dõi đơn hoàn (warehouse tracking, customer confirm) |
| **Claims** | `/claims` | Khiếu nại / bồi hoàn (issue tracking, compensation) |
| **CRM** | `/crm` | Quản lý shop (ShopProfile, ShopProspect pipeline) |
| **Finance** | `/finance` | Tài chính (Cashbook, Expenses, Budgets, Revenue) |
| **Attendance** | `/attendance` | Chấm công (auto-tracking from LoginHistory) |
| **Todos** | `/todos` | Công việc (Kanban board, linked to orders) |
| **Admin** | `/admin` | Quản trị (Users, PermissionGroups, Announcements) |

---

## CRITICAL: AGENT & SKILL PROTOCOL (START HERE)

> **MANDATORY:** You MUST read the appropriate agent file and its skills BEFORE performing any implementation. This is the highest priority rule.

### 1. Modular Skill Loading Protocol

Agent activated → Check frontmatter "skills:" → Read SKILL.md (INDEX) → Read specific sections.

- **Selective Reading:** DO NOT read ALL files in a skill folder. Read `SKILL.md` first, then only read sections matching the user's request.
- **Rule Priority:** P0 (GEMINI.md) > P1 (Agent .md) > P2 (SKILL.md). All rules are binding.

### 2. Enforcement Protocol

1. **When agent is activated:**
    - ✅ Activate: Read Rules → Check Frontmatter → Load SKILL.md → Apply All.
2. **Forbidden:** Never skip reading agent rules or skill instructions. "Read → Understand → Apply" is mandatory.

---

## 📥 REQUEST CLASSIFIER (STEP 1)

**Before ANY action, classify the request:**

| Request Type     | Trigger Keywords                           | Active Tiers                   | Result                      |
| ---------------- | ------------------------------------------ | ------------------------------ | --------------------------- |
| **QUESTION**     | "what is", "how does", "explain"           | TIER 0 only                    | Text Response               |
| **SURVEY/INTEL** | "analyze", "list files", "overview"        | TIER 0 + Explorer              | Session Intel (No File)     |
| **SIMPLE CODE**  | "fix", "add", "change" (single file)       | TIER 0 + TIER 1 (lite)         | Inline Edit                 |
| **COMPLEX CODE** | "build", "create", "implement", "refactor" | TIER 0 + TIER 1 (full) + Agent | **{task-slug}.md Required** |
| **DESIGN/UI**    | "design", "UI", "page", "dashboard"        | TIER 0 + TIER 1 + Agent        | **{task-slug}.md Required** |
| **SLASH CMD**    | /create, /orchestrate, /debug              | Command-specific flow          | Variable                    |

---

## 🤖 INTELLIGENT AGENT ROUTING (STEP 2 - AUTO)

**ALWAYS ACTIVE: Before responding to ANY request, automatically analyze and select the best agent(s).**

> 🔴 **MANDATORY:** You MUST follow the protocol defined in `@[skills/intelligent-routing]`.

### Primary Agents for This Project

| Domain | Agent | When |
|--------|-------|------|
| **UI/Components** | `frontend-specialist` | React components, pages, responsive design, TailwindCSS |
| **API/Logic** | `backend-specialist` | API routes, business logic, Excel parser, data processing |
| **Database** | `database-architect` | Prisma schema, migrations, queries, indexes |
| **Debugging** | `debugger` | Bug investigation, error tracing |
| **Security** | `security-auditor` | Auth, permissions, XSS, input validation |
| **Planning** | `project-planner` | New features, multi-file changes |

### Auto-Selection Protocol

1. **Analyze (Silent)**: Detect domains from user request.
2. **Select Agent(s)**: Choose the most appropriate specialist(s).
3. **Inform User**: Concisely state which expertise is being applied.
4. **Apply**: Generate response using the selected agent's persona and rules.

### Response Format (MANDATORY)

```markdown
🤖 **Applying knowledge of `@[agent-name]`...**

[Continue with specialized response]
```

### ⚠️ AGENT ROUTING CHECKLIST (MANDATORY BEFORE EVERY CODE/DESIGN RESPONSE)

| Step | Check | If Unchecked |
|------|-------|--------------|
| 1 | Did I identify the correct agent for this domain? | → STOP. Analyze request domain first. |
| 2 | Did I READ the agent's `.md` file (or recall its rules)? | → STOP. Open `.agent/agents/{agent}.md` |
| 3 | Did I announce `🤖 Applying knowledge of @[agent]...`? | → STOP. Add announcement before response. |
| 4 | Did I load required skills from agent's frontmatter? | → STOP. Check `skills:` field and read them. |

---

## TIER 0: UNIVERSAL RULES (Always Active)

### 🌐 Language Handling

When user's prompt is NOT in English:

1. **Internally translate** for better comprehension
2. **Respond in user's language** - match their communication
3. **Code comments/variables** remain in English
 
### Vietnamese UI Text Integrity

- All user-facing copy in this project must stay in full Vietnamese with proper diacritics.
- Never ASCII-normalize Vietnamese UI text such as buttons, labels, placeholders, empty states, toasts, chart labels, table headers, dialog content, or export headers.
- Preserve UTF-8 encoding when editing files that contain Vietnamese text.
- If a touched file previously had correct Vietnamese copy, restore from that version instead of replacing it with accent-less text.
- Before finishing a task that touches UI copy, verify there is no mojibake and no lost accents in the changed user-facing strings.

### 🧹 Clean Code (Global Mandatory)

**ALL code MUST follow `@[skills/clean-code]` rules. No exceptions.**

- **Code**: Concise, direct, no over-engineering. Self-documenting.
- **Testing**: Mandatory. Pyramid (Unit > Int > E2E) + AAA Pattern.
- **Performance**: Measure first. Adhere to 2025 standards (Core Web Vitals).
- **Infra/Safety**: 5-Phase Deployment. Verify secrets security.

### 📁 File Dependency Awareness

**Before modifying ANY file:**

1. Check `CODEBASE.md` → File Dependencies
2. Identify dependent files
3. Update ALL affected files together

### 🗺️ System Map Read

> 🔴 **MANDATORY:** Read `ARCHITECTURE.md` at session start to understand project structure.

**Path Awareness:**

- Agents: `.agent/agents/` (20 agents)
- Skills: `.agent/skills/` (36 skills)
- Workflows: `.agent/workflows/` (11 commands)
- Runtime Scripts: `.agent/skills/<skill>/scripts/`

### 🧠 Read → Understand → Apply

```
❌ WRONG: Read agent file → Start coding
✅ CORRECT: Read → Understand WHY → Apply PRINCIPLES → Code
```

---

## TIER 1: CODE RULES (When Writing Code)

### 🏗️ Project-Specific Conventions

#### Prisma & Database
- **Schema**: `prisma/schema.prisma` — source of truth for all models
- **Migrations**: Use `npx prisma migrate dev --name snake_case_name`
- **Client**: Import from `@/lib/prisma` (singleton pattern)
- **IDs**: Use `cuid()` for all primary keys
- **Timestamps**: Always include `createdAt` + `updatedAt`
- **Indexes**: Add `@@index` for frequently queried fields
- **Decimal**: Use `Decimal` type for all monetary fields

#### NextAuth v5 & Permissions
- **Auth config**: `src/lib/auth.config.ts` (edge-compatible) + `src/lib/auth.ts` (full)
- **Session**: Contains `user.role`, `user.permissions` (PermissionSet)
- **Middleware**: `src/middleware.ts` — route-level permission checks
- **API auth**: Use `auth()` from `@/lib/auth` in API routes
- **Permission check**: Always verify via `PermissionGroup` fields, not just Role

#### API Routes
- **Pattern**: `src/app/api/{module}/route.ts` — RESTful
- **Error handling**: Use `apiHandler` wrapper from `@/lib/api-handler.ts`
- **Validation**: Use Zod schemas from `@/lib/validations.ts`
- **Sanitization**: Use `sanitize()` from `@/lib/sanitize.ts` for user input (DOMPurify)

#### Vietnamese Timezone (UTC+7)
- **Storage**: All dates stored as UTC in database
- **Import**: Excel dates are Vietnam time → subtract 7 hours before storing
- **Display**: Use `Intl.DateTimeFormat` with `timeZone: 'Asia/Ho_Chi_Minh'`
- **NEVER**: Use `new Date().toLocaleString()` without explicit timezone

#### Excel Import/Export
- **Library**: `xlsx` (SheetJS)
- **Parser**: `src/lib/excel-parser.ts` — handles column mapping, date conversion
- **Change Detection**: `src/lib/change-detector.ts` — tracks field changes between uploads
- **Upload History**: Every import creates `UploadHistory` + `OrderChangeLog` records

#### Components
- **UI primitives**: `src/components/ui/` (custom, Radix-based)
- **Feature components**: `src/components/{module}/` (orders, claims, crm, etc.)
- **Shared**: `src/components/shared/` — reusable across modules
- **Layout**: `src/components/layout/` — Sidebar, Header
- **State**: Use `@tanstack/react-query` for server state, `zustand` for client-only state

#### Styling
- **TailwindCSS v4** with `@tailwindcss/postcss`
- **Utilities**: `clsx` + `tailwind-merge` via `cn()` from `@/lib/utils`
- **CVA**: Use `class-variance-authority` for component variants
- **Global styles**: `src/app/globals.css`

### 📱 Project Type Routing

| Domain | Primary Agent | Skills |
|--------|--------------|--------|
| **WEB UI** (Components, Pages) | `frontend-specialist` | frontend-design, react-best-practices, tailwind-patterns |
| **BACKEND** (API, Logic, DB) | `backend-specialist` | api-patterns, nodejs-best-practices, database-design |
| **DATABASE** (Schema, Migrations) | `database-architect` | database-design |

### 🛑 Socratic Gate

**For complex requests, STOP and ASK first:**

| Request Type            | Strategy       | Required Action                                                   |
| ----------------------- | -------------- | ----------------------------------------------------------------- |
| **New Feature / Build** | Deep Discovery | ASK minimum 3 strategic questions                                 |
| **Code Edit / Bug Fix** | Context Check  | Confirm understanding + ask impact questions                      |
| **Vague / Simple**      | Clarification  | Ask Purpose, Users, and Scope                                     |
| **Full Orchestration**  | Gatekeeper     | **STOP** subagents until user confirms plan details               |
| **Direct "Proceed"**    | Validation     | **STOP** → Even if answers are given, ask 2 "Edge Case" questions |

**Protocol:**

1. **Never Assume:** If even 1% is unclear, ASK.
2. **Wait:** Do NOT invoke subagents or write code until the user clears the Gate.
3. **Reference:** Full protocol in `@[skills/brainstorming]`.

### 🏁 Final Checklist Protocol

**Trigger:** When the user says "final checks", "kiểm tra cuối", or similar phrases.

| Task Stage       | Command                                            | Purpose                        |
| ---------------- | -------------------------------------------------- | ------------------------------ |
| **Manual Audit** | `python .agent/scripts/checklist.py .`             | Priority-based project audit   |
| **Pre-Deploy**   | `python .agent/scripts/checklist.py . --url <URL>` | Full Suite + Performance + E2E |

**Priority Execution Order:**

1. **Security** → 2. **Lint** → 3. **Schema** → 4. **Tests** → 5. **UX** → 6. **Seo** → 7. **Lighthouse/E2E**

**Available Scripts (12 total):**

| Script                     | Skill                 | When to Use         |
| -------------------------- | --------------------- | ------------------- |
| `security_scan.py`         | vulnerability-scanner | Always on deploy    |
| `dependency_analyzer.py`   | vulnerability-scanner | Weekly / Deploy     |
| `lint_runner.py`           | lint-and-validate     | Every code change   |
| `test_runner.py`           | testing-patterns      | After logic change  |
| `schema_validator.py`      | database-design       | After DB change     |
| `ux_audit.py`              | frontend-design       | After UI change     |
| `accessibility_checker.py` | frontend-design       | After UI change     |
| `seo_checker.py`           | seo-fundamentals      | After page change   |
| `bundle_analyzer.py`       | performance-profiling | Before deploy       |
| `lighthouse_audit.py`      | performance-profiling | Before deploy       |
| `playwright_runner.py`     | webapp-testing        | Before deploy       |

> 🔴 **Agents & Skills can invoke ANY script** via `python .agent/skills/<skill>/scripts/<script>.py`

### 🎭 Gemini Mode Mapping

| Mode     | Agent             | Behavior                                     |
| -------- | ----------------- | -------------------------------------------- |
| **plan** | `project-planner` | 4-phase methodology. NO CODE before Phase 4. |
| **ask**  | -                 | Focus on understanding. Ask questions.       |
| **edit** | `orchestrator`    | Execute. Check `{task-slug}.md` first.       |

---

## TIER 2: DESIGN RULES (Reference)

> **Design rules are in the specialist agents, NOT here.**

| Task         | Read                            |
| ------------ | ------------------------------- |
| Web UI/UX    | `.agent/agents/frontend-specialist.md` |

> 🔴 **For design work:** Open and READ the agent file. Rules are there.

---

## 📁 QUICK REFERENCE

### Agents & Skills

- **Masters**: `orchestrator`, `project-planner`, `security-auditor`, `backend-specialist`, `frontend-specialist`, `debugger`, `database-architect`
- **Key Skills**: `clean-code`, `brainstorming`, `frontend-design`, `api-patterns`, `database-design`, `react-best-practices`, `plan-writing`

### Key Project Files

- **Auth**: `src/lib/auth.ts`, `src/lib/auth.config.ts`, `src/lib/permissions.ts`
- **DB**: `prisma/schema.prisma`, `src/lib/prisma.ts`
- **Core Logic**: `src/lib/excel-parser.ts`, `src/lib/change-detector.ts`, `src/lib/delay-analyzer.ts`, `src/lib/status-mapper.ts`
- **Middleware**: `src/middleware.ts`
- **API Handler**: `src/lib/api-handler.ts`
- **Validation**: `src/lib/validations.ts`, `src/lib/sanitize.ts`

### Key Scripts

- **Verify**: `.agent/scripts/verify_all.py`, `.agent/scripts/checklist.py`
- **Scanners**: `security_scan.py`, `dependency_analyzer.py`
- **Audits**: `ux_audit.py`, `lighthouse_audit.py`, `seo_checker.py`
- **Test**: `playwright_runner.py`, `test_runner.py`

---
