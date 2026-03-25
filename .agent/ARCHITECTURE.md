# ARCHITECTURE.md — HuyHoang Express OMS

> AI Agent Capability Toolkit + Project Architecture

---

## 📋 Overview

**Antigravity Kit** provides:
- **20 Specialist Agents** — Role-based AI personas
- **36 Skills** — Domain-specific knowledge modules
- **11 Workflows** — Slash command procedures

**HuyHoang Express OMS** is a logistics order management system built with Next.js 16, Prisma, and Supabase.

---

## 🏗️ Project Architecture

### Directory Structure

```plaintext
Order_manager/
├── .agent/                    # AI Agent configs
│   ├── ARCHITECTURE.md        # This file
│   ├── agents/                # 20 Specialist Agents
│   ├── skills/                # 36 Skills
│   ├── workflows/             # 11 Slash Commands
│   ├── rules/GEMINI.md        # Project rules
│   └── scripts/               # Validation scripts
├── prisma/
│   ├── schema.prisma          # DB schema (30+ models)
│   ├── migrations/            # Migration history
│   └── seed.ts                # Seed data
├── src/
│   ├── app/
│   │   ├── (auth)/            # Login pages
│   │   ├── (dashboard)/       # Protected dashboard routes
│   │   │   ├── orders/        # Quản lý đơn hàng
│   │   │   ├── delayed/       # Chăm sóc đơn hoãn
│   │   │   ├── returns/       # Theo dõi đơn hoàn
│   │   │   ├── claims/        # Khiếu nại / bồi hoàn
│   │   │   ├── crm/           # Quản lý shop
│   │   │   ├── finance/       # Tài chính
│   │   │   ├── attendance/    # Chấm công
│   │   │   ├── todos/         # Công việc (Kanban)
│   │   │   ├── admin/         # Quản trị
│   │   │   └── overview/      # Dashboard tổng quan
│   │   ├── (landing)/         # Public landing page
│   │   ├── api/               # 18 API route groups
│   │   └── globals.css        # TailwindCSS v4 entry
│   ├── components/
│   │   ├── ui/                # Radix-based primitives
│   │   ├── shared/            # Cross-module components
│   │   ├── layout/            # Sidebar, Header
│   │   ├── orders/            # Order components
│   │   ├── delayed/           # Delayed order components
│   │   ├── returns/           # Return tracking
│   │   ├── claims/            # Claims management
│   │   ├── crm/               # CRM components
│   │   ├── finance/           # Finance components
│   │   ├── attendance/        # Attendance UI
│   │   ├── todos/             # Kanban board
│   │   ├── dashboard/         # Dashboard widgets
│   │   └── tracking/          # Package tracking
│   ├── lib/                   # Business logic & utilities
│   ├── hooks/                 # Custom React hooks
│   ├── stores/                # Zustand stores
│   ├── types/                 # TypeScript type definitions
│   └── __tests__/             # Vitest unit tests
├── CODEBASE.md                # File dependency map
├── package.json               # Dependencies
├── next.config.ts             # Next.js config (security headers)
├── vitest.config.ts           # Test config
└── tsconfig.json              # TypeScript config
```

### Data Flow

```plaintext
Excel File → Upload API → excel-parser.ts → change-detector.ts
    → Prisma (Order, UploadHistory, OrderChangeLog)
    → Dashboard/Pages (via TanStack Query)
```

### Order Lifecycle

```plaintext
PROCESSING → IN_TRANSIT → DELIVERING → DELIVERED → RECONCILED
                              ↓
                    DELIVERY_DELAYED → RETURN_CONFIRMED
                              ↓
                    RETURNING_FULL → RETURNED_FULL
                    RETURN_DELAYED → RETURNED_PARTIAL
```

### Auth Flow

```plaintext
Login → NextAuth v5 → Session (role + permissions)
    → Middleware (route guard)
    → API routes (apiHandler auth check)
    → Components (conditional rendering)
```

---

## 🤖 Agents (20)

Specialist AI personas for different domains.

| Agent                    | Focus                      | Skills Used                                              |
| ------------------------ | -------------------------- | -------------------------------------------------------- |
| `orchestrator`           | Multi-agent coordination   | parallel-agents, behavioral-modes                        |
| `project-planner`        | Discovery, task planning   | brainstorming, plan-writing, architecture                |
| `frontend-specialist`    | Web UI/UX                  | frontend-design, react-best-practices, tailwind-patterns |
| `backend-specialist`     | API, business logic        | api-patterns, nodejs-best-practices, database-design     |
| `database-architect`     | Schema, SQL                | database-design, prisma-expert                           |
| `mobile-developer`       | iOS, Android, RN           | mobile-design                                            |
| `game-developer`         | Game logic, mechanics      | game-development                                         |
| `devops-engineer`        | CI/CD, Docker              | deployment-procedures, docker-expert                     |
| `security-auditor`       | Security compliance        | vulnerability-scanner, red-team-tactics                  |
| `penetration-tester`     | Offensive security         | red-team-tactics                                         |
| `test-engineer`          | Testing strategies         | testing-patterns, tdd-workflow, webapp-testing           |
| `debugger`               | Root cause analysis        | systematic-debugging                                     |
| `performance-optimizer`  | Speed, Web Vitals          | performance-profiling                                    |
| `seo-specialist`         | Ranking, visibility        | seo-fundamentals, geo-fundamentals                       |
| `documentation-writer`   | Manuals, docs              | documentation-templates                                  |
| `product-manager`        | Requirements, user stories | plan-writing, brainstorming                              |
| `product-owner`          | Strategy, backlog, MVP     | plan-writing, brainstorming                              |
| `qa-automation-engineer` | E2E testing, CI pipelines  | webapp-testing, testing-patterns                         |
| `code-archaeologist`     | Legacy code, refactoring   | clean-code, code-review-checklist                        |
| `explorer-agent`         | Codebase analysis          | -                                                        |

### 🎯 Recommended Agents for This Project

| Task | Agent | Why |
|------|-------|-----|
| UI Components & Pages | `frontend-specialist` | TailwindCSS v4, React 19, responsive design |
| API Routes & Logic | `backend-specialist` | Next.js API routes, Excel parsing, business rules |
| Schema & Queries | `database-architect` | Prisma 6, PostgreSQL, index optimization |
| Bug Investigation | `debugger` | Systematic root cause analysis |
| Auth & Security | `security-auditor` | RBAC, XSS prevention, input validation |
| Feature Planning | `project-planner` | Multi-file changes, architecture decisions |

---

## 🧩 Skills (36)

Modular knowledge domains that agents load on-demand.

### Frontend & UI

| Skill                   | Description                                                           |
| ----------------------- | --------------------------------------------------------------------- |
| `react-best-practices`  | React & Next.js performance optimization (Vercel - 57 rules)          |
| `web-design-guidelines` | Web UI audit - 100+ rules for accessibility, UX, performance (Vercel) |
| `tailwind-patterns`     | Tailwind CSS v4 utilities                                             |
| `frontend-design`       | UI/UX patterns, design systems                                        |

### Backend & API

| Skill                   | Description                    |
| ----------------------- | ------------------------------ |
| `api-patterns`          | REST, GraphQL, tRPC            |
| `nodejs-best-practices` | Node.js async, modules         |

### Database

| Skill             | Description                 |
| ----------------- | --------------------------- |
| `database-design` | Schema design, optimization |

### Testing & Quality

| Skill                   | Description              |
| ----------------------- | ------------------------ |
| `testing-patterns`      | Jest, Vitest, strategies |
| `webapp-testing`        | E2E, Playwright          |
| `tdd-workflow`          | Test-driven development  |
| `code-review-checklist` | Code review standards    |

### Security

| Skill                   | Description              |
| ----------------------- | ------------------------ |
| `vulnerability-scanner` | Security auditing, OWASP |
| `red-team-tactics`      | Offensive security       |

### Architecture & Planning

| Skill           | Description                |
| --------------- | -------------------------- |
| `app-builder`   | Full-stack app scaffolding |
| `architecture`  | System design patterns     |
| `plan-writing`  | Task planning, breakdown   |
| `brainstorming` | Socratic questioning       |

### Other

| Skill                     | Description               |
| ------------------------- | ------------------------- |
| `clean-code`              | Coding standards (Global) |
| `performance-profiling`   | Web Vitals, optimization  |
| `systematic-debugging`    | Troubleshooting           |
| `powershell-windows`      | Windows PowerShell        |
| `deployment-procedures`   | CI/CD, deploy workflows   |
| `documentation-templates` | Doc formats               |
| `seo-fundamentals`        | SEO, E-E-A-T              |

---

## 🔄 Workflows (11)

Slash command procedures. Invoke with `/command`.

| Command          | Description              |
| ---------------- | ------------------------ |
| `/brainstorm`    | Socratic discovery       |
| `/create`        | Create new features      |
| `/debug`         | Debug issues             |
| `/deploy`        | Deploy application       |
| `/enhance`       | Improve existing code    |
| `/orchestrate`   | Multi-agent coordination |
| `/plan`          | Task breakdown           |
| `/preview`       | Preview changes          |
| `/status`        | Check project status     |
| `/test`          | Run tests                |
| `/ui-ux-pro-max` | Design with 50 styles    |

---

## 🎯 Skill Loading Protocol

```plaintext
User Request → Skill Description Match → Load SKILL.md
                                            ↓
                                    Read references/
                                            ↓
                                    Read scripts/
```

---

## 📊 Statistics

| Metric              | Value                         |
| ------------------- | ----------------------------- |
| **Total Agents**    | 20                            |
| **Total Skills**    | 36                            |
| **Total Workflows** | 11                            |
| **Total Scripts**   | 2 (master) + 18 (skill-level) |
| **Prisma Models**   | 30+                           |
| **API Route Groups**| 18                            |
| **Component Groups**| 14                            |

---

## 🔗 Quick Reference

| Need     | Agent                 | Skills                                |
| -------- | --------------------- | ------------------------------------- |
| Web App  | `frontend-specialist` | react-best-practices, frontend-design |
| API      | `backend-specialist`  | api-patterns, nodejs-best-practices   |
| Database | `database-architect`  | database-design                       |
| Security | `security-auditor`    | vulnerability-scanner                 |
| Testing  | `test-engineer`       | testing-patterns, webapp-testing      |
| Debug    | `debugger`            | systematic-debugging                  |
| Plan     | `project-planner`     | brainstorming, plan-writing           |

---
